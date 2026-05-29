import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export const listNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await prisma.news.findMany({
      orderBy: { published_at: 'desc' }
    });
    res.status(200).json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createNews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, body, category, mediaUrl } = req.body;
    const authorName = req.user?.email.split('@')[0] || "Alumni Cell Secretary";

    const newPost = await prisma.news.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        body,
        category,
        media_url: mediaUrl || null,
        author_name: authorName
      }
    });

    res.status(201).json({ success: true, news: newPost });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listHeritage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await prisma.heritage.findMany({
      orderBy: { year: 'asc' }
    });
    res.status(200).json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
