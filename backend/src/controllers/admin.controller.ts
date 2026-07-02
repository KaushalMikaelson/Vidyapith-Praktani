import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import {
  analyticsCache,
  connectionsCache,
  directoryCache,
  donationsCache,
  eventsCache,
  groupsCache,
  homepageCache,
  jobsCache,
  mentorsCache,
  notificationsCache,
  postCache,
  profileCache
} from '../utils/cache.js';
import type { Prisma } from '@prisma/client';

function applicationReferencesUser(rawApplication: string, userId: string): boolean {
  if (rawApplication === userId) {
    return true;
  }

  try {
    const parsed = JSON.parse(rawApplication) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    const payload = parsed as Record<string, unknown>;
    return payload.userId === userId || payload.user_id === userId || payload.id === userId;
  } catch {
    return false;
  }
}

// Retrieve all users with a verify_status of 'pending'
export const listPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { verify_status: 'pending' },
      include: { profile: true },
      orderBy: { created_at: 'desc' }
    });

    const formattedUsers = pendingUsers.map(u => {
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
        certificate_url: p?.certificate_url || "",
        created_at: u.created_at
      };
    });

    res.status(200).json(formattedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const removeUserFromSite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const targetUserId = req.params.id;

    if (!adminId) {
      res.status(401).json({ error: 'Unauthorized access.' });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({ error: 'Member id is required.' });
      return;
    }

    if (adminId === targetUserId) {
      res.status(400).json({ error: 'Admins cannot remove their own account from the site.' });
      return;
    }

    const removedUser = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: targetUserId },
        include: { profile: true }
      });

      if (!target) {
        throw new Error('MEMBER_NOT_FOUND');
      }

      if (target.role === 'admin') {
        const adminCount = await tx.user.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          throw new Error('LAST_ADMIN');
        }
      }

      const [ownedGroups, ownedEvents, authoredPosts, likedPosts, jobsWithApplications] = await Promise.all([
        tx.group.findMany({ where: { created_by: targetUserId }, select: { id: true } }),
        tx.event.findMany({ where: { created_by: targetUserId }, select: { id: true } }),
        tx.post.findMany({ where: { author_id: targetUserId }, select: { id: true } }),
        tx.post.findMany({ where: { likes: { has: targetUserId } }, select: { id: true, likes: true } }),
        tx.job.findMany({ select: { id: true, applications: true } })
      ]);

      const ownedGroupIds = ownedGroups.map(group => group.id);
      const ownedEventIds = ownedEvents.map(event => event.id);
      const authoredPostIds = authoredPosts.map(post => post.id);

      const commentFilters: Prisma.CommentWhereInput[] = [{ author_id: targetUserId }];
      if (authoredPostIds.length > 0) {
        commentFilters.push({ post_id: { in: authoredPostIds } });
      }

      await tx.comment.deleteMany({ where: { OR: commentFilters } });
      await tx.post.deleteMany({ where: { author_id: targetUserId } });

      for (const post of likedPosts) {
        await tx.post.update({
          where: { id: post.id },
          data: { likes: post.likes.filter(userId => userId !== targetUserId) }
        });
      }

      for (const job of jobsWithApplications) {
        const nextApplications = job.applications.filter(application => !applicationReferencesUser(application, targetUserId));
        if (nextApplications.length !== job.applications.length) {
          await tx.job.update({
            where: { id: job.id },
            data: { applications: nextApplications }
          });
        }
      }

      const groupMessageFilters: Prisma.GroupMessageWhereInput[] = [{ sender_id: targetUserId }];
      const groupMemberFilters: Prisma.GroupMemberWhereInput[] = [{ user_id: targetUserId }];
      if (ownedGroupIds.length > 0) {
        groupMessageFilters.push({ group_id: { in: ownedGroupIds } });
        groupMemberFilters.push({ group_id: { in: ownedGroupIds } });
      }

      const rsvpFilters: Prisma.RSVPWhereInput[] = [{ user_id: targetUserId }];
      if (ownedEventIds.length > 0) {
        rsvpFilters.push({ event_id: { in: ownedEventIds } });
      }

      await tx.groupMessage.deleteMany({ where: { OR: groupMessageFilters } });
      await tx.groupMember.deleteMany({ where: { OR: groupMemberFilters } });
      await tx.group.deleteMany({ where: { id: { in: ownedGroupIds } } });

      await tx.rSVP.deleteMany({ where: { OR: rsvpFilters } });
      await tx.event.deleteMany({ where: { created_by: targetUserId } });

      await tx.connection.deleteMany({
        where: {
          OR: [
            { sender_id: targetUserId },
            { receiver_id: targetUserId }
          ]
        }
      });

      await tx.message.deleteMany({
        where: {
          OR: [
            { sender_id: targetUserId },
            { receiver_id: targetUserId }
          ]
        }
      });

      await tx.mentorship.deleteMany({
        where: {
          OR: [
            { mentor_id: targetUserId },
            { mentee_id: targetUserId }
          ]
        }
      });

      await tx.donation.deleteMany({ where: { donor_id: targetUserId } });
      await tx.job.deleteMany({ where: { posted_by: targetUserId } });
      await tx.notification.deleteMany({ where: { user_id: targetUserId } });
      await tx.pushSubscription.deleteMany({ where: { user_id: targetUserId } });
      await tx.notificationPreference.deleteMany({ where: { user_id: targetUserId } });
      await tx.oTP.deleteMany({ where: { email: target.email } });
      await tx.passwordReset.deleteMany({ where: { email: target.email } });
      await tx.user.delete({ where: { id: targetUserId } });

      return {
        id: target.id,
        email: target.email,
        full_name: target.profile?.full_name || target.email,
        role: target.role
      };
    });

    await Promise.all([
      analyticsCache.clear(),
      connectionsCache.clear(),
      directoryCache.clear(),
      donationsCache.clear(),
      eventsCache.clear(),
      groupsCache.clear(),
      homepageCache.clear(),
      jobsCache.clear(),
      mentorsCache.clear(),
      notificationsCache.clear(),
      postCache.clear(),
      profileCache.clear()
    ]);

    res.status(200).json({
      success: true,
      message: `${removedUser.full_name} has been removed from the site.`,
      user: removedUser
    });
  } catch (err: any) {
    if (err.message === 'MEMBER_NOT_FOUND') {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    if (err.message === 'LAST_ADMIN') {
      res.status(400).json({ error: 'The last admin account cannot be removed.' });
      return;
    }

    res.status(500).json({ error: err.message });
  }
};
