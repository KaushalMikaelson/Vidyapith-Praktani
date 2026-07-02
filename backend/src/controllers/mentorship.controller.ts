import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { mentorsCache } from '../utils/cache.js';
import { createNotification } from '../services/notification.service.js';

// List approved alumni mentors
export const listMentors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { expertiseField } = req.query;
    const field = (expertiseField as string || "").toLowerCase();
    const cacheKey = `mentors:field:${field || 'all'}`;

    const cachedMentors = await mentorsCache.get<any[]>(cacheKey);
    if (cachedMentors) {
      res.status(200).json(cachedMentors);
      return;
    }

    const whereCondition: any = {
      verify_status: 'approved',
      role: 'alumni'
    };

    const users = await prisma.user.findMany({
      where: whereCondition,
      include: { profile: true }
    });

    // Map and filter by expertise on backend
    let formattedMentors = users.map(u => {
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
        created_at: u.created_at
      };
    });

    if (expertiseField) {
      const fieldName = (expertiseField as string).toLowerCase();
      if (fieldName === 'software engineering') {
        formattedMentors = formattedMentors.filter(m => m.profession.toLowerCase().includes('architect') || m.profession.toLowerCase().includes('software') || m.profession.toLowerCase().includes('tech'));
      } else if (fieldName === 'healthcare & medicine') {
        formattedMentors = formattedMentors.filter(m => m.profession.toLowerCase().includes('cardiologist') || m.profession.toLowerCase().includes('doctor') || m.profession.toLowerCase().includes('surgeon'));
      } else if (fieldName === 'civil services') {
        formattedMentors = formattedMentors.filter(m => m.profession.toLowerCase().includes('officer') || m.profession.toLowerCase().includes('service') || m.profession.toLowerCase().includes('ifs') || m.profession.toLowerCase().includes('ias'));
      } else if (fieldName === 'entrepreneurship') {
        formattedMentors = formattedMentors.filter(m => m.profession.toLowerCase().includes('founder') || m.profession.toLowerCase().includes('ceo') || m.profession.toLowerCase().includes('consultant'));
      }
    }

    mentorsCache.set(cacheKey, formattedMentors);
    res.status(200).json(formattedMentors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// List pairings for current user
export const listPairings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const pairings = await prisma.mentorship.findMany({
      where: {
        OR: [
          { mentor_id: userId },
          { mentee_id: userId }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    const userIds = Array.from(new Set([
      ...pairings.map(p => p.mentor_id),
      ...pairings.map(p => p.mentee_id)
    ]));

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { profile: true }
    });

    const usersMap = new Map(users.map(u => [u.id, {
      id: u.id,
      full_name: u.profile?.full_name || "Vidyapith Alumnus",
      profile_photo: u.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      profession: u.profile?.profession_category || "Alumnus"
    }]));

    const joinedPairings = pairings.map(p => ({
      ...p,
      mentor: usersMap.get(p.mentor_id) || null,
      mentee: usersMap.get(p.mentee_id) || null
    }));

    res.status(200).json(joinedPairings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Request a mentorship pairing (auto-approved for prototype flow)
export const requestMentorship = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { mentorId, goals } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    const studentName = user?.profile?.full_name || "A student";

    const newPair = await prisma.mentorship.create({
      data: {
        mentor_id: mentorId,
        mentee_id: userId,
        status: 'active', // prototype auto-approval
        goals,
        start_date: new Date()
      }
    });

    // Notify mentor
    await createNotification({
      userId: mentorId,
      title: "New Mentee Paired",
      body: `${studentName} has requested your mentorship guidance.`,
      type: "success",
      crucial: true,
      actionUrl: '/mentorship'
    });

    res.status(201).json({ success: true, mentorship: newPair });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
