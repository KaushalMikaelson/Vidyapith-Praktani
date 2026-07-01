import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { analyticsCache } from '../utils/cache.js';

const ANALYTICS_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Shared helper — invalidate analytics when data changes significantly */
export async function invalidateAnalytics(): Promise<void> {
  await analyticsCache.clear();
}

/** GET /api/v1/analytics/stats — Admin: Full platform analytics */
export const getAnalyticsStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const CACHE_KEY = 'full';
    const cached = await analyticsCache.get<any>(CACHE_KEY);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cached);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    // Run all counts in parallel for performance
    const [
      totalUsers,
      approvedAlumni,
      approvedStudents,
      pendingVerifications,
      rejectedCount,
      totalPosts,
      totalComments,
      totalJobs,
      totalEvents,
      totalRSVPs,
      totalDonations,
      totalMentorships,
      activeMentorships,
      totalConnections,
      pendingConnections,
      totalMessages,
      totalGroupMessages,
      totalNewsArticles,
      recentSignups,
      topDonors,
      batchDistribution
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verify_status: 'approved', role: 'alumni' } }),
      prisma.user.count({ where: { verify_status: 'approved', role: 'student' } }),
      prisma.user.count({ where: { verify_status: 'pending' } }),
      prisma.user.count({ where: { verify_status: 'rejected' } }),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.job.count(),
      prisma.event.count(),
      prisma.rSVP.count(),
      prisma.donation.count({ where: { payment_status: 'approved' } }),
      prisma.mentorship.count(),
      prisma.mentorship.count({ where: { status: 'active' } }),
      prisma.connection.count({ where: { status: 'accepted' } }),
      prisma.connection.count({ where: { status: 'pending' } }),
      prisma.message.count(),
      prisma.groupMessage.count(),
      prisma.news.count(),
      // Users registered in the last 7 days
      prisma.user.count({
        where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      }),
      // Top 5 donors by amount
      prisma.donation.findMany({
        where: { payment_status: 'approved', show_on_leaderboard: true },
        orderBy: { amount_paise: 'desc' },
        take: 5,
        select: { donor_id: true, amount_paise: true, cause: true, created_at: true }
      }),
      // Batch year distribution (top 15 most active batches)
      prisma.alumniProfile.groupBy({
        by: ['batch_year'],
        _count: { batch_year: true },
        orderBy: { _count: { batch_year: 'desc' } },
        take: 15
      })
    ]);

    // Compute total donation amount
    const donationAgg = await prisma.donation.aggregate({
      where: { payment_status: 'approved' },
      _sum: { amount_paise: true }
    });

    // Resolve donor names for top donors
    const donorIds = [...new Set(topDonors.map(d => d.donor_id))];
    const donors = await prisma.user.findMany({
      where: { id: { in: donorIds } },
      include: { profile: true }
    });
    const donorMap = new Map(donors.map(d => [d.id, d]));

    const topDonorsFormatted = topDonors.map(d => {
      const user = donorMap.get(d.donor_id);
      return {
        donor_name: user?.profile?.full_name || 'Anonymous Alumnus',
        profile_photo: user?.profile?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
        amount_paise: d.amount_paise,
        amount_inr: (d.amount_paise / 100).toFixed(2),
        cause: d.cause,
        donated_at: d.created_at
      };
    });

    const stats = {
      users: {
        total: totalUsers,
        approvedAlumni,
        approvedStudents,
        approvedTotal: approvedAlumni + approvedStudents,
        pendingVerifications,
        rejected: rejectedCount,
        recentSignups7d: recentSignups
      },
      content: {
        posts: totalPosts,
        comments: totalComments,
        jobs: totalJobs,
        events: totalEvents,
        rsvps: totalRSVPs,
        newsArticles: totalNewsArticles
      },
      community: {
        connections: totalConnections,
        pendingConnections,
        mentorships: totalMentorships,
        activeMentorships,
        messages: totalMessages,
        groupMessages: totalGroupMessages
      },
      donations: {
        count: totalDonations,
        totalAmountPaise: donationAgg._sum.amount_paise || 0,
        totalAmountInr: ((donationAgg._sum.amount_paise || 0) / 100).toFixed(2),
        topDonors: topDonorsFormatted
      },
      batchDistribution: batchDistribution.map(b => ({
        batch_year: b.batch_year,
        count: b._count.batch_year
      })),
      generatedAt: new Date().toISOString()
    };

    analyticsCache.set(CACHE_KEY, stats, ANALYTICS_TTL_MS);
    res.status(200).json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/v1/analytics/public — Any authenticated user: public stats subset */
export const getPublicStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const CACHE_KEY = 'public';
    const cached = await analyticsCache.get<any>(CACHE_KEY);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cached);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const [totalAlumni, totalConnections, totalMentorships, totalEvents] = await Promise.all([
      prisma.user.count({ where: { verify_status: 'approved', role: { not: 'admin' } } }),
      prisma.connection.count({ where: { status: 'accepted' } }),
      prisma.mentorship.count({ where: { status: 'active' } }),
      prisma.event.count()
    ]);

    const stats = {
      totalAlumni,
      totalConnections,
      activeMentorships: totalMentorships,
      totalEvents,
      generatedAt: new Date().toISOString()
    };

    analyticsCache.set(CACHE_KEY, stats, ANALYTICS_TTL_MS);
    res.status(200).json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
