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
    const cachedJobs = await jobsCache.get<any[]>(cacheKey);
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

    // Parse application strings
    const parsedApplicationsList = list.map(job => {
      return (job.applications || []).map(str => {
        try {
          if (str.startsWith('{')) {
            return JSON.parse(str);
          }
        } catch {}
        return { userId: str, coverNote: "", appliedAt: job.created_at, status: "Applied" };
      });
    });

    // Fetch and map applicant profiles
    const applicantIds = Array.from(new Set(parsedApplicationsList.flat().map(app => app.userId)));
    const applicants = await prisma.user.findMany({
      where: { id: { in: applicantIds } },
      include: { profile: true }
    });
    
    const applicantsMap = new Map(applicants.map(u => [u.id, {
      id: u.id,
      email: u.email,
      full_name: u.profile?.full_name || "Vidyapith Alumnus",
      profile_photo: u.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      profession: u.profile?.profession_category || "Alumnus",
      company: u.profile?.company || ""
    }]));

    const joinedList = list.map((job, idx) => {
      const poster = postersMap.get(job.posted_by);
      const parsedApps = parsedApplicationsList[idx];
      const jobApplicants = parsedApps.map(app => {
        const uDetails = applicantsMap.get(app.userId);
        if (!uDetails) return null;
        return {
          ...uDetails,
          cover_note: app.coverNote,
          applied_at: app.appliedAt,
          status: app.status || "Applied"
        };
      }).filter(Boolean);
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
        } : null,
        applicants: jobApplicants
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

    await jobsCache.invalidate("jobs:");
    res.status(201).json({ success: true, job: newJob });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const applyJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { coverNote } = req.body;
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
    
    // Check if user has already applied
    const alreadyApplied = applications.some(str => {
      try {
        if (str.startsWith('{')) {
          const parsed = JSON.parse(str);
          return parsed.userId === userId;
        }
      } catch {}
      return str === userId;
    });

    if (!alreadyApplied) {
      const appObj = {
        userId,
        coverNote: coverNote || "",
        appliedAt: new Date().toISOString(),
        status: "Applied"
      };
      
      applications.push(JSON.stringify(appObj));
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

      await jobsCache.invalidate("jobs:");
    }

    res.status(200).json({ success: true, message: "Application filed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateApplicationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const { status } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id: id as string } });
    if (!job) {
      res.status(404).json({ error: "Job opening not found." });
      return;
    }

    if (job.posted_by !== currentUserId) {
      res.status(403).json({ error: "Forbidden: Only the sponsor can update applicant status." });
      return;
    }

    const applications = job.applications || [];
    let updated = false;

    const newApplications = applications.map(str => {
      try {
        if (str.startsWith('{')) {
          const parsed = JSON.parse(str);
          if (parsed.userId === userId) {
            updated = true;
            return JSON.stringify({ ...parsed, status });
          }
        } else if (str === userId) {
          updated = true;
          return JSON.stringify({
            userId,
            coverNote: "",
            appliedAt: job.created_at.toISOString(),
            status
          });
        }
      } catch {}
      return str;
    });

    if (!updated) {
      res.status(404).json({ error: "Applicant not found on this job opening." });
      return;
    }

    await prisma.job.update({
      where: { id: id as string },
      data: { applications: newApplications }
    });

    // Alert the applicant
    await prisma.notification.create({
      data: {
        user_id: userId as string,
        title: "Job Status Updated",
        body: `Your application stage for ${job.title} at ${job.company} has been updated to "${status}".`,
        type: "info"
      }
    });

    await jobsCache.invalidate("jobs:");
    res.status(200).json({ success: true, message: `Applicant status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
