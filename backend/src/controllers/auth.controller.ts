import { Response } from 'express';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vidyapith-connect-secret-key';

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, mobile, batch_year, house, profession, company, city, certificate_name } = req.body;

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingEmail) {
      res.status(400).json({ error: "An account with this email already exists." });
      return;
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: mobile }
    });

    if (existingPhone) {
      res.status(400).json({ error: "An account with this mobile number already exists." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user and profile in a transaction
    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        phone: mobile,
        password_hash,
        role: 'alumni',
        verify_status: 'pending',
        profile: {
          create: {
            batch_year: parseInt(batch_year),
            house,
            bio: "Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.",
            profession_category: profession || "Not specified",
            company: company || "Not specified",
            city: city || "Not specified",
            country: "India",
            linkedin_url: "",
            certificate_url: certificate_name || "Leaving_Certificate_Scan.pdf"
          }
        }
      }
    });

    // Notify admins of new registration
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          user_id: admin.id,
          title: "New Registration Request",
          body: `${full_name} (Batch of ${batch_year}) requested verification.`,
          type: "alert"
        }
      });
    }

    res.status(201).json({ success: true, message: "Registration submitted for verification review." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true }
    });

    if (!user) {
      res.status(400).json({ error: "No account found with this email." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && password !== user.password_hash) { // Accept unhashed passwords for demo seeding
      res.status(400).json({ error: "Incorrect password." });
      return;
    }

    if (user.verify_status === 'rejected') {
      res.status(403).json({ error: "Registration declined by the administrative committee." });
      return;
    }

    if (user.verify_status === 'pending') {
      res.status(403).json({ error: "Account verification pending character leaving certificate review." });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.profile ? `${user.role === 'admin' ? '' : ''}${user.email.split('@')[0]}` : "Vidyapith Alumnus"
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resolveVerificationQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, status } = req.body; // status: "approved" | "rejected"
    
    const user = await prisma.user.update({
      where: { id },
      data: { verify_status: status }
    });

    await prisma.notification.create({
      data: {
        user_id: id,
        title: status === 'approved' ? "Verification Approved!" : "Registration Declined",
        body: status === 'approved' ? "Welcome! The administrative committee has approved your alumni status." : "The committee declined your uploaded certificate. Contact support.",
        type: status === 'approved' ? "success" : "alert"
      }
    });

    res.status(200).json({ success: true, message: `Applicant successfully ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
