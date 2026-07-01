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
      const p = u.profile as any;
      return {
        id: u.id,
        full_name: p?.full_name || "Vidyapith Alumnus",
        email: u.email,
        mobile: u.phone,
        batch_year: p?.batch_year || 0,
        leaving_class: p?.leaving_class || "XII",
        house: p?.house || "",
        role: u.role,
        verify_status: u.verify_status,
        profile_photo: p?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        bio: p?.bio || "",
        profession: p?.profession_category || "",
        company: p?.company || "",
        city: p?.city || "",
        country: p?.country || "India",
        linkedin_url: p?.linkedin_url || "",
        certificate_url: p?.certificate_url || "",
        created_at: u.created_at
      };
    });

    res.status(200).json(formattedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
