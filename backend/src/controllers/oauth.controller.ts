import { Response } from 'express';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { formatUserResponse } from './auth.controller.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '137080614363-ciif7q937gbh6p2uet0uo12on4p2cln2.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || 'vidyapith-connect-secret-key';
const JWT_EXPIRES_IN = '30d';

export const googleLogin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Google credential token is required.' });
      return;
    }

    // Verify token using Google's tokeninfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!googleRes.ok) {
      res.status(400).json({ error: 'Invalid Google credential token.' });
      return;
    }

    const payload = (await googleRes.json()) as any;
    const { email, aud, exp, name, picture } = payload;

    // Validate token parameters
    if (aud !== GOOGLE_CLIENT_ID) {
      res.status(400).json({ error: 'Google Client ID mismatch.' });
      return;
    }

    if (parseInt(exp) < Date.now() / 1000) {
      res.status(400).json({ error: 'Google token has expired.' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email not provided in Google token.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists in the database
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true }
    });

    if (!user) {
      // User doesn't exist — return metadata for frontend pre-filling
      res.status(200).json({
        status: 'needs_registration',
        email: cleanEmail,
        name: name || '',
        picture: picture || ''
      });
      return;
    }

    // User exists — check verification status
    if (user.verify_status === 'rejected') {
      res.status(403).json({ error: 'Registration declined by the administrative committee.' });
      return;
    }

    if (user.verify_status === 'pending') {
      res.status(403).json({ error: 'Account verification pending character leaving certificate review.' });
      return;
    }

    // Generate session JWT with unique JTI for blocklist tracking
    const jti = crypto.randomUUID();
    const sessionToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, jti },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token: sessionToken,
      user: formatUserResponse(user)
    });
  } catch (err: any) {
    console.error('Google OAuth Login Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during Google OAuth.' });
  }
};
