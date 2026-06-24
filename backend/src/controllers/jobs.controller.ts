import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { jobsCache } from '../utils/cache.js';

export const listJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `jobs:all:page:${page}:limit:${limit}`;
    const cachedJobs = jobsCache.get<any[]>(cacheKey);
    if (cachedJobs) {
      res.status(200).json(cachedJobs);
      return;
    }

    const list = await prisma.job.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: skip
    });

    if (list.length === 0) {
      jobsCache.set(cacheKey, []);
      res.status(200).json([]);
      return;
    }

    const posterIds = Array.from(new Set(list.map(j => j.posted_by)));
    const posters = await prisma.user.findMany({
      where: { id: { in: posterIds } },
      include: { profile: true }
    });

    const postersMap = new Map(posters.map(u => [u.id, u]));

    const joinedList = list.map(job => {
      const poster = postersMap.get(job.posted_by);
      return {
        ...job,
        poster: poster ? {
          id: poster.id,
          email: poster.email,
          role: poster.role,
          full_name: poster.profile?.full_name || "Vidyapith Alumnus",
          profile_photo: poster.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
          profession: poster.profile?.profession_category || "Alumnus",
          company: poster.profile?.company || ""
        } : null
      };
    });

    jobsCache.set(cacheKey, joinedList);
    res.status(200).json(joinedList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, company, location, type, description, skills, referralAvailable, contactEmail } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const newJob = await prisma.job.create({
      data: {
        posted_by: userId,
        title,
        company,
        location,
        type,
        description,
        skills: typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()) : skills,
        referral_available: referralAvailable,
        contact_email: (contactEmail as string) || req.user?.email || '',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    jobsCache.invalidate("jobs:");
    res.status(201).json({ success: true, job: newJob });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const applyJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: id as string } });
    if (!job) {
      res.status(404).json({ error: "Job opening not found." });
      return;
    }

    const applications = job.applications || [];
    if (!applications.includes(userId)) {
      applications.push(userId);
      await prisma.job.update({
        where: { id: id as string },
        data: { applications }
      });

      // Alert sponsor
      await prisma.notification.create({
        data: {
          user_id: job.posted_by,
          title: "New Job Application",
          body: `An alumnus applied for your ${job.title} opening at ${job.company}.`,
          type: "success"
        }
      });

      jobsCache.invalidate("jobs:");
    }

    res.status(200).json({ success: true, message: "Application filed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
