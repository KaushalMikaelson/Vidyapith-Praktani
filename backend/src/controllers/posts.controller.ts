import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Retrieve all posts for a group with author profiles joined
export const listPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { groupId } = req.query;
    const filterGroup = (groupId as string) || 'grp-all';

    const posts = await prisma.post.findMany({
      where: filterGroup === 'grp-all' ? {} : { group_id: filterGroup },
      orderBy: [
        { is_pinned: 'desc' },
        { created_at: 'desc' }
      ]
    });

    if (posts.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Resolve author profiles
    const authorIds = Array.from(new Set(posts.map(p => p.author_id)));
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      include: { profile: true }
    });

    const authorsMap = new Map(authors.map(u => [u.id, u]));

    // Resolve comments for all returned posts
    const postIds = posts.map(p => p.id);
    const comments = await prisma.comment.findMany({
      where: { post_id: { in: postIds } },
      orderBy: { created_at: 'asc' }
    });

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
          profession: author.profile?.profession_category || "Alumnus"
        } : null
      };
    });

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
        content,
        media_urls: mediaUrls || [],
        post_type: postType || 'text',
        is_pinned: false,
        likes: []
      }
    });

    res.status(201).json({ success: true, post: newPost });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle like
export const likePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      res.status(404).json({ error: "Post not found." });
      return;
    }

    let likes = post.likes || [];
    if (likes.includes(userId)) {
      likes = likes.filter(uid => uid !== userId);
    } else {
      likes.push(userId);
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { likes }
    });

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
        content
      }
    });

    res.status(201).json({ success: true, comment: newComment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
