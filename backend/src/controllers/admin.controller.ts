import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Retrieve all users with a verify_status of 'pending'
export const listPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { verify_status: 'pending' },
      include: { profile: true },
      orderBy: { created_at: 'desc' }
    });

    const formattedUsers = pendingUsers.map(u => {
      return {
        id: u.id,
        full_name: u.profile?.full_name || "Vidyapith Alumnus",
        email: u.email,
        mobile: u.phone,
        batch_year: u.profile?.batch_year || 0,
        house: u.profile?.house || "",
        role: u.role,
        verify_status: u.verify_status,
        profile_photo: u.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        bio: u.profile?.bio || "",
        profession: u.profile?.profession_category || "",
        company: u.profile?.company || "",
        city: u.profile?.city || "",
        country: u.profile?.country || "India",
        linkedin_url: u.profile?.linkedin_url || "",
        certificate_url: u.profile?.certificate_url || "",
        created_at: u.created_at
      };
    });

    res.status(200).json(formattedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
