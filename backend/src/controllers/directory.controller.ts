import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { directoryCache, connectionsCache, profileCache } from '../utils/cache.js';
import crypto from 'crypto';

/** Build a stable, order-insensitive SHA-256 cache key from query params */
function buildSearchKey(query: Record<string, any>): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce((acc: Record<string, any>, k) => { acc[k] = query[k]; return acc; }, {});
  return crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

// Search and filter approved alumni/student directory profiles
export const listDirectory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, batchYear, house, city, role, profession, company, sortBy, department, industry, skills, mentorshipStatus, helpCategories, lookingFor, openFor } = req.query;
    const cacheKey = buildSearchKey(req.query as Record<string, any>);

    // Try cache first (Redis or memory fallback)
    const cachedData = await directoryCache.get<any[]>(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedData);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    // Build Prisma query condition
    const whereCondition: any = {
      verify_status: 'approved',
    };

    if (role && role !== 'all') {
      whereCondition.role = role as string;
    } else {
      whereCondition.role = { not: 'admin' };
    }

    const profileConditions: any = {};

    if (batchYear) {
      profileConditions.batch_year = parseInt(batchYear as string);
    }
    if (house) {
      profileConditions.house = house as string;
    }
    if (city) {
      profileConditions.city = { contains: city as string, mode: 'insensitive' };
    }
    if (profession) {
      profileConditions.OR = [
        { profession_category: { contains: profession as string, mode: 'insensitive' } },
        { designation: { contains: profession as string, mode: 'insensitive' } }
      ];
    }
    if (company) {
      profileConditions.company = { contains: company as string, mode: 'insensitive' };
    }
    if (department && department !== 'all') {
      profileConditions.department = department as string;
    }
    if (industry && industry !== 'all') {
      profileConditions.industry = industry as string;
    }
    if (skills) {
      const skillsList = Array.isArray(skills) ? skills : (skills as string).split(',').map(s => s.trim()).filter(Boolean);
      if (skillsList.length > 0) {
        profileConditions.skills = { hasSome: skillsList };
      }
    }
    if (mentorshipStatus && mentorshipStatus !== 'all') {
      profileConditions.mentorship_status = mentorshipStatus as string;
    }
    if (helpCategories && helpCategories !== 'all') {
      const helpList = Array.isArray(helpCategories) ? helpCategories : (helpCategories as string).split(',').map(s => s.trim()).filter(Boolean);
      if (helpList.length > 0) {
        profileConditions.help_categories = { hasSome: helpList };
      }
    }
    if (lookingFor && lookingFor !== 'all') {
      const lookList = Array.isArray(lookingFor) ? lookingFor : (lookingFor as string).split(',').map(s => s.trim()).filter(Boolean);
      if (lookList.length > 0) {
        profileConditions.looking_for = { hasSome: lookList };
      }
    }
    if (openFor && openFor !== 'all') {
      const openList = Array.isArray(openFor) ? openFor : (openFor as string).split(',').map(s => s.trim()).filter(Boolean);
      if (openList.length > 0) {
        profileConditions.open_for = { hasSome: openList };
      }
    }

    if (Object.keys(profileConditions).length > 0) {
      whereCondition.profile = profileConditions;
    }

    // Keyword search
    if (search) {
      const searchStr = search as string;
      whereCondition.OR = [
        {
          email: { contains: searchStr, mode: 'insensitive' }
        },
        {
          profile: {
            full_name: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            bio: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            profession_category: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            designation: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            company: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            city: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            country: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            department: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            industry: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            education: { contains: searchStr, mode: 'insensitive' }
          }
        },
        {
          profile: {
            skills: {
              has: searchStr
            }
          }
        }
      ];
    }

    // Sorting logic
    let orderByCondition: any = {
      created_at: 'asc'
    };

    if (sortBy === 'batch_desc') {
      orderByCondition = {
        profile: {
          batch_year: 'desc'
        }
      };
    } else if (sortBy === 'batch_asc') {
      orderByCondition = {
        profile: {
          batch_year: 'asc'
        }
      };
    } else if (sortBy === 'name_asc') {
      orderByCondition = {
        profile: {
          full_name: 'asc'
        }
      };
    } else if (sortBy === 'name_desc') {
      orderByCondition = {
        profile: {
          full_name: 'desc'
        }
      };
    } else if (sortBy === 'recent') {
      orderByCondition = {
        created_at: 'desc'
      };
    } else if (sortBy === 'seed_order') {
      orderByCondition = {
        created_at: 'asc'
      };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: whereCondition,
      include: { profile: true },
      orderBy: orderByCondition,
      take: limit,
      skip: skip
    });

    const requesterId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Format list to match front-end User interface expectations
    const formattedUsers = users.map(u => {
      const isSelf = requesterId === u.id;
      const showEmail = isSelf || isAdmin || (u.profile?.show_email ?? true);
      const showPhone = isSelf || isAdmin || (u.profile?.show_phone ?? false);
      const showSocial = isSelf || isAdmin || (u.profile?.show_social ?? true);

      return {
        id: u.id,
        full_name: u.profile?.full_name || "Vidyapith Alumnus",
        email: showEmail ? u.email : "",
        mobile: showPhone ? u.phone : "",
        batch_year: u.profile?.batch_year || 0,
        leaving_class: u.profile?.leaving_class || "XII",
        house: u.profile?.house || "",
        role: u.role,
        verify_status: u.verify_status,
        profile_photo: u.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        bio: u.profile?.bio || "",
        profession: u.profile?.profession_category || "",
        company: u.profile?.company || "",
        city: u.profile?.city || "",
        country: u.profile?.country || "India",
        linkedin_url: showSocial ? (u.profile?.linkedin_url || "") : "",
        github_url: showSocial ? (u.profile?.github_url || "") : "",
        portfolio_url: showSocial ? (u.profile?.portfolio_url || "") : "",
        personal_url: showSocial ? (u.profile?.personal_url || "") : "",
        skills: u.profile?.skills || [],
        help_categories: u.profile?.help_categories || [],
        looking_for: u.profile?.looking_for || [],
        mentorship_status: u.profile?.mentorship_status || "Not Available",
        designation: u.profile?.designation || "",
        years_of_experience: u.profile?.years_of_experience ?? 0,
        education: u.profile?.education || "",
        open_for: u.profile?.open_for || [],
        privacy: {
          show_email: u.profile?.show_email ?? true,
          show_mobile: u.profile?.show_phone ?? false,
          show_social: u.profile?.show_social ?? true
        },
        created_at: u.created_at,
        department: u.profile?.department || "",
        industry: u.profile?.industry || ""
      };
    });

    // Save to cache (5 min TTL)
    directoryCache.set(cacheKey, formattedUsers, 300_000);
    res.status(200).json(formattedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Send connection request
export const connectRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetId } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    if (senderId === targetId) {
      res.status(400).json({ error: "You cannot connect with yourself." });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "Target user not found." });
      return;
    }

    // Check if connection already exists
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { sender_id: senderId, receiver_id: targetId },
          { sender_id: targetId, receiver_id: senderId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        res.status(400).json({ error: "Already connected." });
        return;
      }
      if (existing.status === 'pending') {
        if (existing.sender_id === senderId) {
          res.status(400).json({ error: "Connection request already sent." });
          return;
        } else {
          // The other user already sent a request to us, so we can auto-accept it!
          await prisma.connection.update({
            where: { id: existing.id },
            data: { status: 'accepted' }
          });

          // Notify the other user
          const sender = await prisma.user.findUnique({
            where: { id: senderId },
            include: { profile: true }
          });
          const senderName = sender?.profile?.full_name || "An alumnus";

          await prisma.notification.create({
            data: {
              user_id: targetId,
              title: "Connection Request Accepted",
              body: `${senderName} accepted your connection request.`,
              type: "success"
            }
          });

          // Invalidate cache
          connectionsCache.invalidate(`connections:`);
          directoryCache.clear();

          res.status(200).json({ success: true, message: "Connection established.", status: 'accepted' });
          return;
        }
      }
    }

    // Create pending connection
    await prisma.connection.create({
      data: {
        sender_id: senderId,
        receiver_id: targetId,
        status: 'pending'
      }
    });

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true }
    });
    const senderName = sender?.profile?.full_name || "An alumnus";

    // Create notification for target user
    await prisma.notification.create({
      data: {
        user_id: targetId,
        title: "New Connection Request",
        body: `${senderName} wants to connect with you.`,
        type: "info"
      }
    });

    // Invalidate cache
    connectionsCache.invalidate(`connections:`);
    directoryCache.clear();

    res.status(200).json({ success: true, message: "Connection request sent.", status: 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get connection status map
export const getConnectionStatuses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const cacheKey = `connections:status:${userId}`;
    const cachedData = await connectionsCache.get<Record<string, string>>(cacheKey);
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      }
    });

    const statusMap: Record<string, string> = {};
    connections.forEach(c => {
      const partnerId = c.sender_id === userId ? c.receiver_id : c.sender_id;
      if (c.status === 'accepted') {
        statusMap[partnerId] = 'accepted';
      } else if (c.status === 'pending') {
        statusMap[partnerId] = c.sender_id === userId ? 'pending_sent' : 'pending_received';
      }
    });

    connectionsCache.set(cacheKey, statusMap, 60000); // 1 minute cache
    res.status(200).json(statusMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// List pending connection requests
export const listPendingConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const cacheKey = `connections:pending:${userId}`;
    const cachedData = await connectionsCache.get<any[]>(cacheKey);
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

    const pending = await prisma.connection.findMany({
      where: {
        receiver_id: userId,
        status: 'pending'
      }
    });

    if (pending.length === 0) {
      connectionsCache.set(cacheKey, []);
      res.status(200).json([]);
      return;
    }

    const senderIds = pending.map(p => p.sender_id);
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      include: { profile: true }
    });

    const formattedSenders = senders.map(s => {
      const conn = pending.find(p => p.sender_id === s.id);
      return {
        connectionId: conn?.id,
        id: s.id,
        full_name: s.profile?.full_name || "Vidyapith Alumnus",
        email: s.email,
        batch_year: s.profile?.batch_year || 0,
        leaving_class: s.profile?.leaving_class || "XII",
        house: s.profile?.house || "",
        role: s.role,
        profile_photo: s.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        profession: s.profile?.profession_category || "",
        company: s.profile?.company || "",
        city: s.profile?.city || "",
        country: s.profile?.country || "India"
      };
    });

    connectionsCache.set(cacheKey, formattedSenders, 60000); // 1 minute cache
    res.status(200).json(formattedSenders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Accept or decline connection request
export const respondConnectionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetId, connectionId, action } = req.body; // action: 'accept' | 'decline'
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { id: connectionId },
          { sender_id: targetId, receiver_id: userId }
        ],
        status: 'pending'
      }
    });

    if (!connection) {
      res.status(404).json({ error: "Connection request not found." });
      return;
    }

    if (action === 'accept') {
      await prisma.connection.update({
        where: { id: connection.id },
        data: { status: 'accepted' }
      });

      // Fetch responder details to include in notification body
      const responder = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
      const responderName = responder?.profile?.full_name || "An alumnus";

      // Notify the requester
      await prisma.notification.create({
        data: {
          user_id: connection.sender_id,
          title: "Connection Request Accepted",
          body: `${responderName} accepted your connection request.`,
          type: "success"
        }
      });

      connectionsCache.invalidate(`connections:`);
      directoryCache.clear();

      res.status(200).json({ success: true, message: "Connection accepted." });
    } else {
      // Decline: Delete connection request
      await prisma.connection.delete({
        where: { id: connection.id }
      });

      connectionsCache.invalidate(`connections:`);
      directoryCache.clear();

      res.status(200).json({ success: true, message: "Connection request declined." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Remove connection or cancel connection request
export const removeConnection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetId = req.params.targetId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { sender_id: userId, receiver_id: targetId },
          { sender_id: targetId, receiver_id: userId }
        ]
      }
    });

    if (!connection) {
      res.status(404).json({ error: "Connection not found." });
      return;
    }

    await prisma.connection.delete({
      where: { id: connection.id }
    });

    connectionsCache.invalidate(`connections:`);
    directoryCache.clear();

    res.status(200).json({ success: true, message: "Connection removed." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// List accepted connections for current user
export const listConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }

    const cacheKey = `connections:list:${userId}`;
    const cachedData = await connectionsCache.get<any[]>(cacheKey);
    if (cachedData && cachedData.length > 0) {
      res.status(200).json(cachedData);
      return;
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { sender_id: userId },
          { receiver_id: userId }
        ],
        status: 'accepted'
      }
    });

    if (connections.length === 0) {
      // Don't cache empty — new connections could be accepted at any time
      res.status(200).json([]);
      return;
    }

    const partnerIds = connections.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id);
    const partners = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      include: { profile: true }
    });

    const formattedPartners = partners.map(p => ({
      id: p.id,
      full_name: p.profile?.full_name || "Vidyapith Alumnus",
      email: p.email,
      batch_year: p.profile?.batch_year || 0,
      leaving_class: p.profile?.leaving_class || "XII",
      house: p.profile?.house || "",
      role: p.role,
      profile_photo: p.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      profession: p.profile?.profession_category || "",
      company: p.profile?.company || "",
      city: p.profile?.city || "",
      country: p.profile?.country || "India"
    }));

    connectionsCache.set(cacheKey, formattedPartners, 60000); // 1 minute cache
    res.status(200).json(formattedPartners);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single profile
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Check profile cache first (2 min TTL)
    const profileCacheKey = `user:${id}`;
    const cachedProfile = await profileCache.get<any>(profileCacheKey);
    if (cachedProfile) {
      res.setHeader('X-Cache', 'HIT');
      res.status(200).json(cachedProfile);
      return;
    }
    res.setHeader('X-Cache', 'MISS');

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true }
    });

    if (!user) {
      res.status(404).json({ error: "Profile not found." });
      return;
    }

    // Count actual posts, accepted connections, and active mentorships
    const postsCount = await prisma.post.count({
      where: { author_id: id }
    });

    const connectionsCount = await prisma.connection.count({
      where: {
        OR: [
          { sender_id: id },
          { receiver_id: id }
        ],
        status: 'accepted'
      }
    });

    const mentorshipsCount = await prisma.mentorship.count({
      where: {
        OR: [
          { mentor_id: id },
          { mentee_id: id }
        ],
        status: 'active'
      }
    });

    const requesterId = req.user?.id;
    const isSelf = requesterId === user.id;
    const isAdmin = req.user?.role === 'admin';
    const showEmail = isSelf || isAdmin || (user.profile?.show_email ?? true);
    const showPhone = isSelf || isAdmin || (user.profile?.show_phone ?? false);
    const showSocial = isSelf || isAdmin || (user.profile?.show_social ?? true);

    const formattedUser = {
      id: user.id,
      full_name: user.profile?.full_name || "Vidyapith Alumnus",
      email: showEmail ? user.email : "",
      mobile: showPhone ? user.phone : "",
      batch_year: user.profile?.batch_year || 0,
      leaving_class: user.profile?.leaving_class || "XII",
      house: user.profile?.house || "",
      role: user.role,
      verify_status: user.verify_status,
      profile_photo: user.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      bio: user.profile?.bio || "",
      profession: user.profile?.profession_category || "",
      company: user.profile?.company || "",
      city: user.profile?.city || "",
      country: user.profile?.country || "India",
      linkedin_url: showSocial ? (user.profile?.linkedin_url || "") : "",
      github_url: showSocial ? (user.profile?.github_url || "") : "",
      portfolio_url: showSocial ? (user.profile?.portfolio_url || "") : "",
      personal_url: showSocial ? (user.profile?.personal_url || "") : "",
      skills: user.profile?.skills || [],
      help_categories: user.profile?.help_categories || [],
      looking_for: user.profile?.looking_for || [],
      mentorship_status: user.profile?.mentorship_status || "Not Available",
      designation: user.profile?.designation || "",
      years_of_experience: user.profile?.years_of_experience ?? 0,
      education: user.profile?.education || "",
      open_for: user.profile?.open_for || [],
      posts_count: postsCount,
      connections_count: connectionsCount,
      mentorships_count: mentorshipsCount,
      privacy: {
        show_email: user.profile?.show_email ?? true,
        show_mobile: user.profile?.show_phone ?? false,
        show_social: user.profile?.show_social ?? true
      },
      created_at: user.created_at,
      department: user.profile?.department || "",
      industry: user.profile?.industry || ""
    };

    // Cache profile for 2 minutes
    profileCache.set(`user:${id}`, formattedUser, 120_000);

    res.status(200).json(formattedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update current user profile details
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return;
    }
    const { 
      bio, profession_category, company, city, country, profile_photo, 
      show_email, show_mobile, show_social, full_name, batch_year, leaving_class, house, department, industry, mobile,
      skills, help_categories, looking_for, github_url, portfolio_url, personal_url, mentorship_status, linkedin_url,
      designation, years_of_experience, education, open_for
    } = req.body;
    
    // Validate URLs
    const isValidUrl = (url: string): boolean => {
      if (!url) return true;
      const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
      return urlRegex.test(url);
    };

    if (linkedin_url !== undefined && linkedin_url !== "" && !isValidUrl(linkedin_url)) {
      res.status(400).json({ error: "Invalid LinkedIn URL. Must start with http:// or https://" });
      return;
    }
    if (github_url !== undefined && github_url !== "" && !isValidUrl(github_url)) {
      res.status(400).json({ error: "Invalid GitHub URL. Must start with http:// or https://" });
      return;
    }
    if (portfolio_url !== undefined && portfolio_url !== "" && !isValidUrl(portfolio_url)) {
      res.status(400).json({ error: "Invalid Portfolio URL. Must start with http:// or https://" });
      return;
    }
    if (personal_url !== undefined && personal_url !== "" && !isValidUrl(personal_url)) {
      res.status(400).json({ error: "Invalid Personal Website URL. Must start with http:// or https://" });
      return;
    }

    if (mobile !== undefined) {
      if (mobile !== null && mobile.trim() !== "") {
        // Check if another user has this phone number
        const existingUserWithPhone = await prisma.user.findFirst({
          where: {
            phone: mobile.trim(),
            id: { not: userId }
          }
        });
        if (existingUserWithPhone) {
          res.status(400).json({ error: "Mobile number is already in use by another account." });
          return;
        }
        
        await prisma.user.update({
          where: { id: userId },
          data: { phone: mobile.trim() }
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { phone: undefined }
        });
      }
    }

    const profileData: any = {};
    if (bio !== undefined) profileData.bio = bio;
    if (profession_category !== undefined) profileData.profession_category = profession_category;
    if (company !== undefined) profileData.company = company;
    if (city !== undefined) profileData.city = city;
    if (country !== undefined) profileData.country = country;
    if (profile_photo !== undefined) profileData.profile_photo = profile_photo;
    if (show_email !== undefined) profileData.show_email = show_email;
    if (show_mobile !== undefined) profileData.show_phone = show_mobile;
    if (show_social !== undefined) profileData.show_social = show_social;
    if (full_name !== undefined) profileData.full_name = full_name;
    if (batch_year !== undefined && batch_year !== null && batch_year !== '') {
      profileData.batch_year = parseInt(batch_year);
    }
    if (leaving_class !== undefined) profileData.leaving_class = leaving_class;
    if (house !== undefined) profileData.house = house;
    if (department !== undefined) profileData.department = department;
    if (industry !== undefined) profileData.industry = industry;
    
    // New fields
    if (skills !== undefined) profileData.skills = skills;
    if (help_categories !== undefined) profileData.help_categories = help_categories;
    if (looking_for !== undefined) profileData.looking_for = looking_for;
    if (github_url !== undefined) profileData.github_url = github_url;
    if (portfolio_url !== undefined) profileData.portfolio_url = portfolio_url;
    if (personal_url !== undefined) profileData.personal_url = personal_url;
    if (mentorship_status !== undefined) profileData.mentorship_status = mentorship_status;
    if (linkedin_url !== undefined) profileData.linkedin_url = linkedin_url;
    if (designation !== undefined) profileData.designation = designation;
    if (years_of_experience !== undefined && years_of_experience !== null && years_of_experience !== '') {
      profileData.years_of_experience = parseInt(years_of_experience);
    }
    if (education !== undefined) profileData.education = education;
    if (open_for !== undefined) profileData.open_for = open_for;

    await prisma.alumniProfile.upsert({
      where: { user_id: userId },
      update: profileData,
      create: {
        user_id: userId,
        full_name: full_name || "Vidyapith Alumnus",
        batch_year: parseInt(batch_year) || 2008,
        house: house || "Vivekananda House",
        bio: bio || "Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.",
        profession_category: profession_category || "Not specified",
        company: company || "Not specified",
        city: city || "Not specified",
        country: country || "India",
        linkedin_url: linkedin_url || "",
        github_url: github_url || "",
        portfolio_url: portfolio_url || "",
        personal_url: personal_url || "",
        skills: skills || [],
        help_categories: help_categories || [],
        looking_for: looking_for || [],
        mentorship_status: mentorship_status || "Not Available",
        designation: designation || "",
        years_of_experience: years_of_experience ? parseInt(years_of_experience) : 0,
        education: education || "",
        open_for: open_for || [],
        show_social: show_social !== undefined ? show_social : true,
        ...profileData
      }
    });

    // Invalidate profile cache + directory search cache
    await profileCache.invalidate(`user:${userId}`);
    await directoryCache.clear();
    res.status(200).json({ success: true, message: "Profile updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get relations (followers, following, connections) for a user
export const getUserRelations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    if (!targetUserId) {
      res.status(400).json({ error: "User ID is required." });
      return;
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { sender_id: targetUserId },
          { receiver_id: targetUserId }
        ]
      }
    });

    const partnerIds = connections.map(c => c.sender_id === targetUserId ? c.receiver_id : c.sender_id);
    const partners = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      include: { profile: true }
    });

    const partnerMap = new Map(partners.map(p => [p.id, p]));

    const followers: any[] = [];
    const following: any[] = [];
    const acceptedConnections: any[] = [];

    const formatUser = (u: any) => ({
      id: u.id,
      full_name: u.profile?.full_name || "Vidyapith Alumnus",
      email: u.email,
      batch_year: u.profile?.batch_year || 0,
      leaving_class: u.profile?.leaving_class || "XII",
      house: u.profile?.house || "",
      role: u.role,
      profile_photo: u.profile?.profile_photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
      profession: u.profile?.profession_category || "",
      company: u.profile?.company || "",
      city: u.profile?.city || "",
      country: u.profile?.country || "India"
    });

    connections.forEach(c => {
      const partnerId = c.sender_id === targetUserId ? c.receiver_id : c.sender_id;
      const partner = partnerMap.get(partnerId);
      if (!partner) return;

      const formatted = formatUser(partner);

      if (c.status === 'accepted') {
        acceptedConnections.push(formatted);
        followers.push(formatted);
        following.push(formatted);
      } else if (c.status === 'pending') {
        if (c.sender_id === targetUserId) {
          following.push(formatted);
        } else {
          followers.push(formatted);
        }
      }
    });

    res.status(200).json({
      followers,
      following,
      connections: acceptedConnections
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


