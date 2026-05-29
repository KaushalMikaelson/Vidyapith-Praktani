import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const listJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await prisma.job.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json(list);
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
    }

    res.status(200).json({ success: true, message: "Application filed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
