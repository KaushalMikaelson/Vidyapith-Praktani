import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { postCache } from '../utils/cache.js';
import { notificationQueue } from '../services/notification.queue.js';

const sanitizeContent = (text: string): string => {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags to prevent XSS
};

// Retrieve all posts for a group with author profiles joined
export const listPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.query;
    const filterGroup = (groupId as string) || 'grp-all';
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `posts:${filterGroup}:page:${page}:limit:${limit}`;

    // Try to get from cache first
    const cachedData = await postCache.get<any[]>(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedData);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const posts = await prisma.post.findMany({
      where: filterGroup === 'grp-all' ? {} : { group_id: filterGroup },
      orderBy: [
        { is_pinned: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: skip
    });

    if (posts.length === 0) {
      res.status(200).json([]);
      return;
    }

    const authorIds = Array.from(new Set(posts.map(p => p.author_id)));
    const postIds = posts.map(p => p.id);

    // Parallelize authors and comments queries
    const [authors, comments] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: authorIds } },
        include: { profile: true }
      }),
      prisma.comment.findMany({
        where: { post_id: { in: postIds } },
        orderBy: { created_at: 'asc' }
      })
    ]);

    const authorsMap = new Map(authors.map(u => [u.id, u]));

    const commenterIds = Array.from(new Set(comments.map(c => c.author_id)));
    const commenters = await prisma.user.findMany({
      where: { id: { in: commenterIds } },
      include: { profile: true }
    });

    const commentersMap = new Map(commenters.map(u => [u.id, u]));

    const formattedComments = comments.map(c => {
      const author = commentersMap.get(c.author_id);
      return {
        ...c,
        author: author ? {
          id: author.id,
          email: author.email,
          role: author.role,
          full_name: author.profile?.full_name || "Vidyapith Alumnus",
          profile_photo: author.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80"
        } : null
      };
    });

    const joinedPosts = posts.map(post => {
      const author = authorsMap.get(post.author_id);
      const postComments = formattedComments.filter(c => c.post_id === post.id);
      return {
        ...post,
        comments: postComments,
        author: author ? (() => {
            const p = author.profile as any;
            return {
              id: author.id,
              email: author.email,
              role: author.role,
              full_name: p?.full_name || "Vidyapith Alumnus",
              profile_photo: p?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
              batch_year: p?.batch_year || 2008,
              leaving_class: p?.leaving_class || "XII",
              house: p?.house || "Vivekananda House",
              profession: p?.profession_category || "Alumnus",
              department: p?.department || "Science"
            };
          })() : null
      };
    });

    // Save to cache
    postCache.set(cacheKey, joinedPosts);

    res.status(200).json(joinedPosts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new post
export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, mediaUrls, postType, groupId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const newPost = await prisma.post.create({
      data: {
        author_id: userId,
        group_id: groupId || 'grp-all',
        content: sanitizeContent(content),
        media_urls: mediaUrls || [],
        post_type: postType || 'text',
        is_pinned: false,
        likes: []
      }
    });

    const author = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    const authorName = author?.profile?.full_name || 'An alumnus';

    if (newPost.group_id === 'grp-all') {
      await notificationQueue.add('broadcast', {
        type: 'POST_CREATED',
        actorId: userId,
        title: 'New Community Post',
        body: `${authorName} published a post in the community feed.`,
        actionUrl: '/feed'
      });
    } else {
      const group = await prisma.group.findUnique({ where: { id: newPost.group_id } });
      await notificationQueue.add('group_broadcast', {
        type: 'GROUP_POST_CREATED',
        groupId: newPost.group_id,
        actorId: userId,
        title: group?.name ? `New post in ${group.name}` : 'New Group Post',
        body: `${authorName} published a post.`,
        actionUrl: '/feed'
      });
    }

    await postCache.invalidate('posts:');
    res.status(201).json({ success: true, post: newPost });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle like
export const likePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // post id
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }

    const hasLiked = post.likes.includes(userId);
    const updatedLikes = hasLiked
      ? post.likes.filter((uid: string) => uid !== userId)
      : [...post.likes, userId];

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { likes: updatedLikes }
    });

    if (!hasLiked && post.author_id !== userId) {
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      await notificationQueue.add('direct', {
        type: 'LIKE',
        targetId: post.author_id,
        title: 'New Post Like',
        body: `${liker?.profile?.full_name || 'A fellow alumnus'} liked your post.`,
        actionUrl: '/feed'
      });
    }

    await postCache.clear(); // Clear cached posts to ensure update is reflected
    res.status(200).json({ success: true, likes: updatedPost.likes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Retrieve all comments for a post
export const listComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // post id

    const comments = await prisma.comment.findMany({
      where: { post_id: id },
      orderBy: { created_at: 'asc' }
    });

    if (comments.length === 0) {
      res.status(200).json([]);
      return;
    }

    const commenterIds = Array.from(new Set(comments.map(c => c.author_id)));
    const commenters = await prisma.user.findMany({
      where: { id: { in: commenterIds } },
      include: { profile: true }
    });

    const commentersMap = new Map(commenters.map(u => [u.id, u]));

    const joinedComments = comments.map(comment => {
      const author = commentersMap.get(comment.author_id);
      return {
        ...comment,
        author: author ? {
          id: author.id,
          email: author.email,
          role: author.role,
          full_name: author.profile?.full_name || "Vidyapith Alumnus",
          profile_photo: author.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80"
        } : null
      };
    });

    res.status(200).json(joinedComments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create comment
export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // post id
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const newComment = await prisma.comment.create({
      data: {
        post_id: id,
        author_id: userId,
        content: sanitizeContent(content)
      }
    });

    const post = await prisma.post.findUnique({ where: { id } });
    if (post && post.author_id !== userId) {
      const commenter = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      await notificationQueue.add('direct', {
        type: 'COMMENT',
        targetId: post.author_id,
        title: 'New Comment',
        body: `${commenter?.profile?.full_name || 'A fellow alumnus'} commented on your post.`,
        actionUrl: '/feed'
      });
    }

    await postCache.invalidate('posts:');
    res.status(201).json({ success: true, comment: newComment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a post
export const deletePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }

    // Only allow author or admin to delete
    if (post.author_id !== userId && userRole !== 'admin') {
      res.status(403).json({ error: "You do not have permission to delete this post." });
      return;
    }

    // Delete comments first
    await prisma.comment.deleteMany({
      where: { post_id: id }
    });

    await prisma.post.delete({
      where: { id }
    });

    if (post.author_id !== userId) {
      await notificationQueue.add('direct', {
        type: 'POST_CREATED',
        targetId: post.author_id,
        title: 'Post Removed',
        body: 'An administrator removed one of your posts.',
        actionUrl: '/feed',
        crucial: true
      });
    }

    await postCache.clear();
    res.status(200).json({ success: true, message: "Post deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle pin a post
export const togglePinPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    // Only admins can pin posts
    if (userRole !== 'admin') {
      res.status(403).json({ error: "Only admins can pin posts." });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { is_pinned: !post.is_pinned }
    });

    if (post.author_id !== userId) {
      await notificationQueue.add('direct', {
        type: 'POST_CREATED',
        targetId: post.author_id,
        title: updatedPost.is_pinned ? 'Post Pinned' : 'Post Unpinned',
        body: updatedPost.is_pinned
          ? 'An administrator pinned your post.'
          : 'An administrator unpinned your post.',
        actionUrl: '/feed'
      });
    }

    await postCache.clear();
    res.status(200).json({ success: true, is_pinned: updatedPost.is_pinned });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
