import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { newsCache } from '../utils/cache.js';
import { notificationQueue } from '../services/notification.queue.js';

export const listNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = "news:all";
    const cachedNews = await newsCache.get<any[]>(cacheKey);
    if (cachedNews) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedNews);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const list = await prisma.news.findMany({
      orderBy: { published_at: 'desc' }
    });

    newsCache.set(cacheKey, list);
    res.status(200).json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, body, category, mediaUrl } = req.body;
    const authorName = req.user?.email.split('@')[0] || "Alumni Cell Secretary";

    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug || 'news';
    let counter = 1;
    while (true) {
      const existing = await prisma.news.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newPost = await prisma.news.create({
      data: {
        title,
        slug,
        body,
        category,
        media_url: mediaUrl || null,
        author_name: authorName
      }
    });

    await notificationQueue.add('broadcast', {
      type: 'NEWS_CREATED',
      actorId: req.user?.id || '',
      title: 'New Alumni News',
      body: `${title} has been published in ${category}.`,
      actionUrl: '/news'
    });

    await newsCache.invalidate("news:");
    res.status(201).json({ success: true, news: newPost });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listHeritage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = "heritage:all";
    const cachedHeritage = await newsCache.get<any[]>(cacheKey);
    if (cachedHeritage) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedHeritage);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const list = await prisma.heritage.findMany({
      orderBy: { year: 'asc' }
    });

    newsCache.set(cacheKey, list);
    res.status(200).json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
