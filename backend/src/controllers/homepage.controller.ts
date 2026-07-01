import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { homepageCache } from '../utils/cache.js';

const HOMEPAGE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * GET /api/v1/home/feed
 * Aggregates: recent + pinned posts, upcoming events, latest news, and public stats
 * into one cached response — minimizing frontend round trips.
 */
export const getHomeFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Use a shared (non-user-specific) key for the aggregated public sections.
    // Personal data (like connection status) should be fetched separately.
    const CACHE_KEY = 'feed:global';

    const cached = await homepageCache.get<any>(CACHE_KEY);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cached);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const now = new Date();

    // Run all homepage queries in parallel
    const [pinnedPosts, recentPosts, upcomingEvents, latestNews, publicStats] = await Promise.all([
      // Pinned posts (max 3)
      prisma.post.findMany({
        where: { group_id: 'grp-all', is_pinned: true },
        orderBy: { created_at: 'desc' },
        take: 3
      }),
      // Recent posts (max 5, excludes already-pinned via ordering)
      prisma.post.findMany({
        where: { group_id: 'grp-all', is_pinned: false },
        orderBy: { created_at: 'desc' },
        take: 5
      }),
      // Upcoming events (next 4)
      prisma.event.findMany({
        where: { event_date: { gte: now } },
        orderBy: { event_date: 'asc' },
        take: 4
      }),
      // Latest news (max 4)
      prisma.news.findMany({
        orderBy: { published_at: 'desc' },
        take: 4
      }),
      // Lightweight public stats
      Promise.all([
        prisma.user.count({ where: { verify_status: 'approved', role: { not: 'admin' } } }),
        prisma.connection.count({ where: { status: 'accepted' } }),
        prisma.mentorship.count({ where: { status: 'active' } }),
        prisma.event.count()
      ])
    ]);

    // Enrich posts with author info
    const allPostIds = [...pinnedPosts, ...recentPosts].map(p => p.id);
    const allAuthorIds = [...new Set([...pinnedPosts, ...recentPosts].map(p => p.author_id))];

    const [authors, comments] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: allAuthorIds } },
        include: { profile: true }
      }),
      prisma.comment.findMany({
        where: { post_id: { in: allPostIds } },
        orderBy: { created_at: 'desc' }
      })
    ]);

    const authorsMap = new Map(authors.map(u => [u.id, u]));
    const commentsMap = new Map<string, number>();
    comments.forEach(c => {
      commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
    });

    const enrichPost = (post: any) => {
      const author = authorsMap.get(post.author_id);
      return {
        ...post,
        comment_count: commentsMap.get(post.id) || 0,
        author: author ? {
          id: author.id,
          full_name: author.profile?.full_name || 'Vidyapith Alumnus',
          profile_photo: author.profile?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
          profession: author.profile?.profession_category || '',
          batch_year: author.profile?.batch_year || 0
        } : null
      };
    };

    const [totalAlumni, totalConnections, activeMentorships, totalEvents] = publicStats;

    const feed = {
      pinnedPosts: pinnedPosts.map(enrichPost),
      recentPosts: recentPosts.map(enrichPost),
      upcomingEvents: upcomingEvents.map(evt => ({
        id: evt.id,
        title: evt.title,
        event_date: evt.event_date,
        location: evt.location,
        event_type: evt.event_type,
        online_link: evt.online_link,
        description: evt.description.substring(0, 200) + (evt.description.length > 200 ? '...' : '')
      })),
      latestNews: latestNews.map(n => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        category: n.category,
        media_url: n.media_url,
        author_name: n.author_name,
        published_at: n.published_at,
        is_featured: n.is_featured,
        excerpt: n.body.substring(0, 200) + (n.body.length > 200 ? '...' : '')
      })),
      stats: {
        totalAlumni,
        totalConnections,
        activeMentorships,
        totalEvents
      },
      generatedAt: new Date().toISOString()
    };

    homepageCache.set(CACHE_KEY, feed, HOMEPAGE_TTL_MS);
    res.status(200).json(feed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
