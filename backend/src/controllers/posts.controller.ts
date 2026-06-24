import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { postCache } from '../utils/cache.js';

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
    const cachedData = postCache.get<any[]>(cacheKey);
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

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
        author: author ? {
          id: author.id,
          email: author.email,
          role: author.role,
          full_name: author.profile?.full_name || "Vidyapith Alumnus",
          profile_photo: author.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
          batch_year: author.profile?.batch_year || 2008,
          house: author.profile?.house || "Vivekananda House",
          profession: author.profile?.profession_category || "Alumnus",
          department: author.profile?.department || "Science"
        } : null
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

    postCache.invalidate('posts:');
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

    const result: any = await prisma.$queryRawUnsafe(
      `UPDATE "Post" SET likes = CASE WHEN $1 = ANY(likes) THEN array_remove(likes, $1) ELSE array_append(likes, $1) END WHERE id = $2 RETURNING likes`,
      userId,
      id
    );

    if (!result || result.length === 0) {
      res.status(404).json({ error: "Post not found." });
      return;
    }

    postCache.clear(); // Clear cached posts to ensure update is reflected
    res.status(200).json({ success: true, likes: result[0].likes });
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

    postCache.invalidate('posts:');
    res.status(201).json({ success: true, comment: newComment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
