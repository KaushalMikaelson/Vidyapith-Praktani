import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { groupsCache } from '../utils/cache.js';
import { notificationQueue } from '../services/notification.queue.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

// Helper: check group membership & role
async function getMemberRole(groupId: string, userId: string): Promise<string | null> {
  const member = await prisma.groupMember.findUnique({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } }
  });
  return member?.role ?? null;
}

async function listGroupMemberIds(groupId: string, excludeUserId?: string): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: {
      group_id: groupId,
      ...(excludeUserId ? { user_id: { not: excludeUserId } } : {})
    },
    select: { user_id: true }
  });
  return members.map(member => member.user_id);
}

// POST /groups — create a new group
export const createGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { name, description, memberIds } = req.body as {
      name: string;
      description?: string;
      memberIds?: string[];
    };

    if (!name?.trim()) { res.status(400).json({ error: 'Group name is required.' }); return; }

    const group = await prisma.group.create({
      data: { name: name.trim(), description: description?.trim() ?? '', created_by: userId }
    });

    // Add creator as admin
    const membersToAdd: { group_id: string; user_id: string; role: string }[] = [
      { group_id: group.id, user_id: userId, role: 'admin' }
    ];

    // Add other members
    if (Array.isArray(memberIds)) {
      for (const mid of memberIds) {
        if (mid !== userId) {
          membersToAdd.push({ group_id: group.id, user_id: mid, role: 'member' });
        }
      }
    }

    await prisma.groupMember.createMany({ data: membersToAdd, skipDuplicates: true });

    await Promise.all(membersToAdd
      .filter(member => member.user_id !== userId)
      .map(member => notificationQueue.add('direct', {
        type: 'GROUP_ADDED',
        targetId: member.user_id,
        title: 'Added to Group',
        body: `You were added to "${group.name}".`,
        actionUrl: '/messages'
      })));

    // Invalidate user's group list cache
    await groupsCache.invalidate(`mygroups:${userId}`);
    res.status(201).json({ success: true, group });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /groups — list all groups current user belongs to
export const listMyGroups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    // Check cache first (1 min TTL)
    const cacheKey = `mygroups:${userId}`;
    const cached = await groupsCache.get<any[]>(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cached);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId }
    });
    const groupIds = memberships.map(m => m.group_id);

    if (groupIds.length === 0) { res.status(200).json([]); return; }

    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      orderBy: { created_at: 'desc' }
    });

    // Attach last message and member count to each group
    const enriched = await Promise.all(groups.map(async g => {
      const [lastMsg, memberCount] = await Promise.all([
        prisma.groupMessage.findFirst({
          where: { group_id: g.id },
          orderBy: { created_at: 'desc' }
        }),
        prisma.groupMember.count({ where: { group_id: g.id } })
      ]);

      // Get sender name for last message
      let lastSenderName = '';
      if (lastMsg) {
        const sender = await prisma.user.findUnique({
          where: { id: lastMsg.sender_id },
          include: { profile: true }
        });
        lastSenderName = sender?.profile?.full_name ?? 'Someone';
      }

      return {
        ...g,
        lastMessage: lastMsg ? lastMsg.content : '',
        lastMessageAt: lastMsg ? lastMsg.created_at : g.created_at,
        lastSenderName,
        memberCount
      };
    }));

    groupsCache.set(cacheKey, enriched, 60000);
    res.status(200).json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /groups/:id — get group details + members
export const getGroupDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;

    const role = await getMemberRole(groupId, userId);
    if (!role) { res.status(403).json({ error: 'You are not a member of this group.' }); return; }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) { res.status(404).json({ error: 'Group not found.' }); return; }

    const members = await prisma.groupMember.findMany({ where: { group_id: groupId } });
    const userIds = members.map(m => m.user_id);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { profile: true }
    });

    const enrichedMembers = members.map(m => {
      const u = users.find(u => u.id === m.user_id);
      return {
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        full_name: (u?.profile as any)?.full_name ?? 'Vidyapith Alumnus',
        profile_photo: (u?.profile as any)?.profile_photo ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80',
        batch_year: (u?.profile as any)?.batch_year ?? 0,
        leaving_class: (u?.profile as any)?.leaving_class ?? "XII"
      };
    });

    res.status(200).json({ ...group, members: enrichedMembers, currentUserRole: role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /groups/:id/members — add members (admin only)
export const addMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const role = await getMemberRole(groupId, userId);
    if (role !== 'admin') { res.status(403).json({ error: 'Only group admins can add members.' }); return; }

    const { memberIds } = req.body as { memberIds: string[] };
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ error: 'memberIds array is required.' }); return;
    }

    await prisma.groupMember.createMany({
      data: memberIds.map(mid => ({ group_id: groupId, user_id: mid, role: 'member' })),
      skipDuplicates: true
    });

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    await Promise.all(memberIds.map(mid => notificationQueue.add('direct', {
      type: 'GROUP_ADDED',
      targetId: mid,
      title: 'Added to Group',
      body: `You were added to "${group?.name || 'a group'}".`,
      actionUrl: '/messages'
    })));

    // Invalidate group member caches
    for (const mid of memberIds) {
      await groupsCache.invalidate(`mygroups:${mid}`);
    }
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /groups/:id/members/:userId — remove a member (admin, or self-leave)
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const callerId = req.user?.id;
    if (!callerId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const targetUserId = req.params.userId as string;

    const callerRole = await getMemberRole(groupId, callerId);
    const group = await prisma.group.findUnique({ where: { id: groupId } });

    // Only admin can remove others; anyone can remove themselves
    if (callerId !== targetUserId && callerRole !== 'admin') {
      res.status(403).json({ error: 'Only group admins can remove members.' }); return;
    }
    if (!callerRole) { res.status(403).json({ error: 'You are not a member of this group.' }); return; }

    await prisma.groupMember.deleteMany({
      where: { group_id: groupId, user_id: targetUserId }
    });

    if (callerId !== targetUserId) {
      await notificationQueue.add('direct', {
        type: 'GROUP_REMOVED',
        targetId: targetUserId,
        title: 'Removed from Group',
        body: `You were removed from "${group?.name || 'a group'}".`,
        actionUrl: '/messages',
        crucial: true
      });
    }

    // If no members left, delete the group
    const remaining = await prisma.groupMember.count({ where: { group_id: groupId } });
    if (remaining === 0) {
      await prisma.groupMessage.deleteMany({ where: { group_id: groupId } });
      await prisma.group.delete({ where: { id: groupId } });
    }

    await groupsCache.invalidate(`mygroups:${targetUserId}`);
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /groups/:id — update name/description (admin only)
export const updateGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const role = await getMemberRole(groupId, userId);
    if (role !== 'admin') { res.status(403).json({ error: 'Only group admins can edit group details.' }); return; }

    const { name, description } = req.body;
    const existingGroup = await prisma.group.findUnique({ where: { id: groupId } });
    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {})
      }
    });

    const recipients = await listGroupMemberIds(groupId, userId);
    if (recipients.length > 0) {
      await Promise.all(recipients.map(recipientId => notificationQueue.add('direct', {
        type: 'GROUP_UPDATED',
        targetId: recipientId,
        title: 'Group Updated',
        body: `"${existingGroup?.name || updated.name}" group details were updated.`,
        actionUrl: '/messages'
      })));
    }

    res.status(200).json({ success: true, group: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /groups/:id — delete entire group (group admin or site admin)
export const deleteGroup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const memberRole = await getMemberRole(groupId, userId);
    if (memberRole !== 'admin' && userRole !== 'admin') {
      res.status(403).json({ error: 'Only group admins can delete the group.' }); return;
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    const memberIds = await listGroupMemberIds(groupId, userId);

    await prisma.groupMessage.deleteMany({ where: { group_id: groupId } });
    await prisma.groupMember.deleteMany({ where: { group_id: groupId } });
    await prisma.group.delete({ where: { id: groupId } });

    await Promise.all(memberIds.map(memberId => notificationQueue.add('direct', {
      type: 'GROUP_DELETED',
      targetId: memberId,
      title: 'Group Deleted',
      body: `"${group?.name || 'A group'}" was deleted by an administrator.`,
      actionUrl: '/messages',
      crucial: true
    })));

    // Invalidate all groups cache (we don't know all members easily)
    await groupsCache.clear();
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// GET /groups/:id/messages — paginated group messages
export const listGroupMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const role = await getMemberRole(groupId, userId);
    if (!role) { res.status(403).json({ error: 'You are not a member of this group.' }); return; }

    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    const messages = await prisma.groupMessage.findMany({
      where: {
        group_id: groupId,
        ...(before ? { created_at: { lt: new Date(before) } } : {})
      },
      orderBy: { created_at: 'asc' },
      take: limit
    });

    // Fetch sender profiles
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      include: { profile: true }
    });

    const senderMap = Object.fromEntries(senders.map(s => [s.id, {
      full_name: s.profile?.full_name ?? 'Vidyapith Alumnus',
      profile_photo: s.profile?.profile_photo ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'
    }]));

    const enriched = messages.map(m => ({
      ...m,
      senderName: senderMap[m.sender_id]?.full_name ?? 'Unknown',
      senderPhoto: senderMap[m.sender_id]?.profile_photo ?? ''
    }));

    res.status(200).json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /groups/:id/messages — send a group message
export const sendGroupMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const groupId = req.params.id as string;
    const role = await getMemberRole(groupId, userId);
    if (!role) { res.status(403).json({ error: 'You are not a member of this group.' }); return; }

    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Message cannot be empty.' }); return; }

    const message = await prisma.groupMessage.create({
      data: { group_id: groupId, sender_id: userId, content: content.trim() }
    });

    // Attach sender info
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    const recipients = await prisma.groupMember.findMany({
      where: { group_id: groupId, user_id: { not: userId } },
      select: { user_id: true }
    });

    await notificationQueue.add('group_broadcast', {
      type: 'GROUP_POST_CREATED',
      groupId,
      actorId: userId,
      title: group?.name ? `New message in ${group.name}` : 'New Group Message',
      body: `${sender?.profile?.full_name ?? 'A group member'} sent a message.`,
      actionUrl: '/messages'
    });

    res.status(201).json({
      ...message,
      senderName: sender?.profile?.full_name ?? 'Vidyapith Alumnus',
      senderPhoto: sender?.profile?.profile_photo ?? ''
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
