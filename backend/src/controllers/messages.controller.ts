import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// List all conversations for the current user (includes connections even with no messages)
export const listConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized access.' });
      return;
    }

    // 1. Get all messages involving this user
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ sender_id: userId }, { receiver_id: userId }]
      },
      orderBy: { created_at: 'desc' }
    });

    // Find unique partner IDs from messages
    const messagePartnerIds = messages.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id);

    // 2. Get all accepted connections for this user
    const connections = await prisma.connection.findMany({
      where: {
        status: 'accepted',
        OR: [{ sender_id: userId }, { receiver_id: userId }]
      }
    });

    const connectionPartnerIds = connections.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id);

    // Combine both sets of partner IDs
    const allPartnerIds = Array.from(new Set([...messagePartnerIds, ...connectionPartnerIds]));

    if (allPartnerIds.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Fetch partner profiles
    const partners = await prisma.user.findMany({
      where: { id: { in: allPartnerIds } },
      include: { profile: true }
    });

    const conversations = partners.map(partner => {
      const lastMsg = messages.find(m =>
        (m.sender_id === partner.id && m.receiver_id === userId) ||
        (m.sender_id === userId && m.receiver_id === partner.id)
      );
      const unreadCount = messages.filter(m =>
        m.sender_id === partner.id && m.receiver_id === userId && !m.read
      ).length;

      return {
        partnerId: partner.id,
        partnerName: (partner.profile as any)?.full_name || 'Vidyapith Alumnus',
        partnerPhoto: (partner.profile as any)?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
        partnerBatch: (partner.profile as any)?.batch_year || null,
        partnerLeavingClass: (partner.profile as any)?.leaving_class || 'XII',
        partnerProfession: (partner.profile as any)?.profession_category || '',
        lastMessage: lastMsg?.content || '',
        lastMessageAt: lastMsg?.created_at || null,
        unreadCount,
        isLastFromMe: lastMsg?.sender_id === userId
      };
    });

    // Sort by: 1) most recent message, 2) alphabetically if no messages
    conversations.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return a.partnerName.localeCompare(b.partnerName);
    });

    res.status(200).json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get conversation messages with a specific user
export const getConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const partnerId = req.params.partnerId as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized access.' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: userId, receiver_id: partnerId },
          { sender_id: partnerId, receiver_id: userId }
        ]
      },
      orderBy: { created_at: 'asc' }
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: {
        sender_id: partnerId,
        receiver_id: userId,
        read: false
      },
      data: { read: true }
    });

    // Get partner profile
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      include: { profile: true }
    });

    res.status(200).json({
      messages,
      partner: partner ? {
        id: partner.id,
        full_name: (partner.profile as any)?.full_name || 'Vidyapith Alumnus',
        profile_photo: (partner.profile as any)?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
        batch_year: (partner.profile as any)?.batch_year,
        leaving_class: (partner.profile as any)?.leaving_class || 'XII',
        profession_category: (partner.profile as any)?.profession_category
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Send a message to a user
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const partnerId = req.params.partnerId as string;
    const { content } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized access.' });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ error: 'Message content cannot be empty.' });
      return;
    }

    // Verify partner exists
    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    if (!partner) {
      res.status(404).json({ error: 'Recipient user not found.' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        sender_id: userId,
        receiver_id: partnerId,
        content: content.trim(),
        read: false
      }
    });

    // Notify recipient (best-effort — don't fail if this errors)
    try {
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
      await prisma.notification.create({
        data: {
          user_id: partnerId,
          title: 'New Direct Message',
          body: `${sender?.profile?.full_name || 'A fellow alumnus'} sent you a message.`,
          type: 'info',
          read: false
        }
      });
    } catch { /* Notification creation failure is non-fatal */ }

    res.status(201).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
