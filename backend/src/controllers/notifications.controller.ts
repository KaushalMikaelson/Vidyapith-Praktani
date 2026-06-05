import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Retrieve all notifications for the current user
export const listNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
export const markRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const notification = await prisma.notification.findFirst({
      where: { id, user_id: userId }
    });

    if (!notification) {
      res.status(404).json({ error: "Notification not found." });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read for current user
export const readAllNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    await prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true }
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

