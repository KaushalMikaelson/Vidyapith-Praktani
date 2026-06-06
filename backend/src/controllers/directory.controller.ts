import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Search and filter approved alumni/student directory profiles
export const listDirectory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, batchYear, house, city, role, profession, sortBy } = req.query;

    // Build Prisma query condition
    const whereCondition: any = {
      verify_status: 'approved',
    };

    if (role && role !== 'all') {
      whereCondition.role = role as string;
    } else {
      whereCondition.role = { not: 'admin' };
    }

    const profileConditions: any = {};

    if (batchYear) {
      profileConditions.batch_year = parseInt(batchYear as string);
    }
    if (house) {
      profileConditions.house = house as string;
    }
    if (city) {
      profileConditions.city = { contains: city as string, mode: 'insensitive' };
    }
    if (profession) {
      profileConditions.profession_category = { contains: profession as string, mode: 'insensitive' };
    }

    if (Object.keys(profileConditions).length > 0) {
      whereCondition.profile = profileConditions;
    }

    // Keyword search
    if (search) {
      const searchStr = search as string;
      whereCondition.OR = [
        {
          email: { contains: searchStr, mode: 'insensitive' }
        },
        {
          profile: {
            full_name: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            bio: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            profession_category: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            company: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            city: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            country: { contains: searchStr, mode: 'insensitive' }
          }
        }
      ];
    }

    // Sorting logic
    let orderByCondition: any = {
      profile: {
        batch_year: 'desc'
      }
    };

    if (sortBy === 'batch_asc') {
      orderByCondition = {
        profile: {
          batch_year: 'asc'
        }
      };
    } else if (sortBy === 'name_asc') {
      orderByCondition = {
        profile: {
          full_name: 'asc'
        }
      };
    } else if (sortBy === 'name_desc') {
      orderByCondition = {
        profile: {
          full_name: 'desc'
        }
      };
    } else if (sortBy === 'recent') {
      orderByCondition = {
        created_at: 'desc'
      };
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      include: { profile: true },
      orderBy: orderByCondition
    });

    // Format list to match front-end User interface expectations
    const formattedUsers = users.map(u => {
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
        privacy: {
          show_email: u.profile?.show_email ?? true,
          show_mobile: u.profile?.show_phone ?? false
        },
        created_at: u.created_at
      };
    });

    res.status(200).json(formattedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Send connection request
export const connectRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetId } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true }
    });

    if (!sender) {
      res.status(404).json({ error: "Sender profile not found." });
      return;
    }

    const senderName = sender.profile?.full_name || "An alumnus";

    // Create notification for target user
    await prisma.notification.create({
      data: {
        user_id: targetId,
        title: "New Connection Request",
        body: `${senderName} wants to connect with you.`,
        type: "info"
      }
    });

    res.status(200).json({ success: true, message: "Connection request sent." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single profile
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true }
    });

    if (!user) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }

    const formattedUser = {
      id: user.id,
      full_name: user.profile?.full_name || "Vidyapith Alumnus",
      email: user.email,
      mobile: user.phone,
      batch_year: user.profile?.batch_year || 0,
      house: user.profile?.house || "",
      role: user.role,
      verify_status: user.verify_status,
      profile_photo: user.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      bio: user.profile?.bio || "",
      profession: user.profile?.profession_category || "",
      company: user.profile?.company || "",
      city: user.profile?.city || "",
      country: user.profile?.country || "India",
      linkedin_url: user.profile?.linkedin_url || "",
      privacy: {
        show_email: user.profile?.show_email ?? true,
        show_mobile: user.profile?.show_phone ?? false
      },
      created_at: user.created_at
    };

    res.status(200).json(formattedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
