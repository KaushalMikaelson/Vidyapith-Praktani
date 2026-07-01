import { Response } from 'express';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { directoryCache, mentorsCache } from '../utils/cache.js';
import { sendMail } from '../services/mail.service.js';
import { setOTP, getOTP, deleteOTP, setResetToken, getResetToken, deleteResetToken } from '../utils/otpStore.js';
import { blockToken } from '../utils/tokenBlocklist.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vidyapith-connect-secret-key';
const JWT_EXPIRES_IN = '30d';
const JWT_EXPIRES_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds

/** Build full user response object (reused in login + getMe) */
export function formatUserResponse(user: any) {
  return {
    id: user.id,
    full_name: user.profile?.full_name || 'Vidyapith Alumnus',
    email: user.email,
    mobile: user.phone,
    batch_year: user.profile?.batch_year || 0,
    leaving_class: user.profile?.leaving_class || 'XII',
    house: user.profile?.house || '',
    role: user.role,
    verify_status: user.verify_status,
    profile_photo: user.profile?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
    bio: user.profile?.bio || '',
    profession: user.profile?.profession_category || '',
    company: user.profile?.company || '',
    city: user.profile?.city || '',
    country: user.profile?.country || 'India',
    linkedin_url: user.profile?.linkedin_url || '',
    privacy: {
      show_email: user.profile?.show_email ?? true,
      show_mobile: user.profile?.show_phone ?? false
    },
    created_at: user.created_at,
    department: user.profile?.department || '',
    industry: user.profile?.industry || ''
  };
}

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, mobile, batch_year, leaving_class, house, profession, company, city, certificate_name } = req.body;

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingEmail) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    if (mobile) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: mobile } });
      if (existingPhone) {
        res.status(400).json({ error: 'An account with this mobile number already exists.' });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Bootstrap first user as an approved admin
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    const resolvedRole = isFirstUser ? 'admin' : 'alumni';
    const resolvedVerifyStatus = isFirstUser ? 'approved' : 'pending';

    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        phone: mobile || null,
        password_hash,
        role: resolvedRole,
        verify_status: resolvedVerifyStatus,
        profile: {
          create: {
            full_name: full_name || email.split('@')[0],
            profile_photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
            batch_year: parseInt(batch_year),
            leaving_class: leaving_class || 'XII',
            house: house || null,
            bio: isFirstUser
              ? 'Platform Administrator. Dedicated to the Vidyapith Connect network.'
              : 'Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.',
            profession_category: profession || (isFirstUser ? 'Administrator' : 'Not specified'),
            company: company || (isFirstUser ? 'Ramakrishna Mission Vidyapith' : 'Not specified'),
            city: city || 'Not specified',
            country: 'India',
            linkedin_url: '',
            certificate_url: certificate_name || 'Leaving_Certificate_Scan.pdf'
          } as any
        }
      }
    });

    if (!isFirstUser) {
      const admins = await prisma.user.findMany({ where: { role: 'admin' } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            title: 'New Registration Request',
            body: `${full_name} (Batch of ${batch_year} - Class ${leaving_class || 'XII'}) requested verification.`,
            type: 'alert'
          }
        });
      }
    }

    const responseMsg = isFirstUser
      ? 'First account registered and approved as Administrator.'
      : 'Registration submitted for verification review.';

    res.status(201).json({ success: true, message: responseMsg });
  } catch (err: any) {
    console.error('Registration Critical Error: ', err);
    if (err.code === 'P2002') {
      const target = err.meta?.target || [];
      const field = target.includes('email') ? 'email address' : target.includes('phone') ? 'mobile number' : 'email or mobile number';
      res.status(400).json({ error: `An account with this ${field} already exists.` });
    } else {
      res.status(500).json({ error: 'Registration failed due to a database integrity error. Please check your inputs.' });
    }
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log(`\n🔑 [Login Request] Email: "${email}"`);

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true }
    });

    if (!user) {
      console.log(`❌ [Login Fail] No user found with email: "${email}"`);
      res.status(400).json({ error: 'No account found with this email.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log(`❌ [Login Fail] Password mismatch for: "${email}"`);
      res.status(400).json({ error: 'Incorrect password.' });
      return;
    }

    if (user.verify_status === 'rejected') {
      res.status(403).json({ error: 'Registration declined by the administrative committee.' });
      return;
    }

    if (user.verify_status === 'pending') {
      res.status(403).json({ error: 'Account verification pending character leaving certificate review.' });
      return;
    }

    console.log(`✅ [Login Success] User: "${email}"`);

    // Generate unique JTI (JWT ID) for session tracking and blocklist support
    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token,
      user: formatUserResponse(user)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/** Logout: blocklist the current JWT so it cannot be reused */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jti = req.user?.jti;
    if (jti) {
      // Block for remaining token lifetime (30 days max)
      await blockToken(jti, JWT_EXPIRES_SECONDS);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resolveVerificationQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { verify_status: status }
    });

    await prisma.notification.create({
      data: {
        user_id: id,
        title: status === 'approved' ? 'Verification Approved!' : 'Registration Declined',
        body: status === 'approved'
          ? 'Welcome! The administrative committee has approved your alumni status.'
          : 'The committee declined your uploaded certificate. Contact support.',
        type: status === 'approved' ? 'success' : 'alert'
      }
    });

    // Invalidate directory + mentor caches since user status changed
    await directoryCache.invalidate('');
    await mentorsCache.invalidate('');

    res.status(200).json({ success: true, message: `Applicant successfully ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized access.' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.status(200).json({ success: true, user: formatUserResponse(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  OTP — now Redis-backed (Prisma fallback)
// ─────────────────────────────────────────────────────────────

export const requestEmailOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100_000 + Math.random() * 900_000).toString();

    // Store in Redis (or Prisma fallback)
    await setOTP(cleanEmail, otp);

    const subject = 'Vidyapith Connect Verification OTP';
    const text = `Greetings from Vidyapith Connect. Your verification OTP is: ${otp}. It will expire in 15 minutes.`;
    const html = `<p>Greetings from Vidyapith Connect.</p><p>Your verification OTP is: <strong>${otp}</strong>.</p><p>It will expire in 15 minutes.</p>`;

    await sendMail(cleanEmail, subject, text, html);

    res.status(200).json({ success: true, message: 'OTP sent successfully.', otp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyEmailOTP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required.' });
      return;
    }
    const cleanEmail = email.toLowerCase().trim();

    const storedOtp = await getOTP(cleanEmail);
    if (!storedOtp || storedOtp !== otp) {
      res.status(400).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    // Consume OTP — delete after successful verification
    await deleteOTP(cleanEmail);

    res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  Password Reset — now Redis-backed (Prisma fallback)
// ─────────────────────────────────────────────────────────────

export const forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      res.status(404).json({ error: 'No account found with this email.' });
      return;
    }

    const token = crypto.randomBytes(20).toString('hex');

    // Store in Redis (or Prisma fallback)
    await setResetToken(cleanEmail, token);

    const subject = 'Vidyapith Connect Password Reset';
    const text = `Greetings. You requested a password reset. Use verification code: ${token} to reset your password. It is valid for 15 minutes.`;
    const html = `<p>Greetings.</p><p>You requested a password reset. Use verification code below to reset your password:</p><h3>${token}</h3><p>It is valid for 15 minutes.</p>`;

    await sendMail(cleanEmail, subject, text, html);

    res.status(200).json({ success: true, message: 'Password reset instructions sent.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    // Validate token in Redis (or Prisma fallback)
    const email = await getResetToken(token);
    if (!email) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: { password_hash }
    });

    // Consume token — delete after successful reset
    await deleteResetToken(token);

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
