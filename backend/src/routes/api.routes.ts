import { Router } from 'express';
import { register, login, resolveVerificationQueue, getMe, requestEmailOTP, verifyEmailOTP, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { getLeaderboard, createCheckoutSession } from '../controllers/donations.controller.js';
import { listJobs, createJob, applyJob } from '../controllers/jobs.controller.js';
import { listNews, createNews, listHeritage } from '../controllers/news.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

// Feature Controllers
import { listPosts, createPost, likePost, listComments, createComment, deletePost, togglePinPost } from '../controllers/posts.controller.js';
import { listEvents, createEvent, rsvpEvent } from '../controllers/events.controller.js';
import { listDirectory, connectRequest, getProfile, getConnectionStatuses, listPendingConnections, respondConnectionRequest, removeConnection, listConnections, updateProfile, getUserRelations } from '../controllers/directory.controller.js';
import { listMentors, listPairings, requestMentorship } from '../controllers/mentorship.controller.js';
import { listNotifications, markRead, readAllNotifications } from '../controllers/notifications.controller.js';
import { listPendingUsers } from '../controllers/admin.controller.js';
import { uploadMedia } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { listConversations, getConversation, sendMessage } from '../controllers/messages.controller.js';
import { createGroup, listMyGroups, getGroupDetails, addMembers, removeMember, updateGroup, deleteGroup, listGroupMessages, sendGroupMessage } from '../controllers/groups.controller.js';

export const apiRouter = Router();

const generalLimiter = rateLimiter(100, 60 * 1000); // Max 100 requests per minute
const authLimiter = rateLimiter(10, 60 * 1000); // Max 10 requests per minute

// Apply general rate limiting to all api routes
apiRouter.use(generalLimiter);

// ── Media Upload (Cloudinary) ─────────────────────────────────────────────
apiRouter.post('/upload', requireAuth, uploadMiddleware.single('file'), uploadMedia);

// ── Auth ──────────────────────────────────────────────────────────────────
apiRouter.post('/auth/register', authLimiter, register);
apiRouter.post('/auth/login', authLimiter, login);
apiRouter.get('/auth/me', requireAuth, getMe);
apiRouter.post('/auth/resolve-queue', requireAdmin, resolveVerificationQueue);
apiRouter.post('/auth/request-otp', authLimiter, requestEmailOTP);
apiRouter.post('/auth/verify-otp', authLimiter, verifyEmailOTP);
apiRouter.post('/auth/forgot-password', authLimiter, forgotPassword);
apiRouter.post('/auth/reset-password', authLimiter, resetPassword);
apiRouter.post('/auth/upload-certificate', authLimiter, uploadMiddleware.single('file'), uploadMedia);


// Donations Endpoints
apiRouter.get('/donations/leaderboard', requireAuth, getLeaderboard);
apiRouter.post('/donations/checkout', requireAuth, createCheckoutSession);

// Jobs Endpoints
apiRouter.get('/jobs', requireAuth, listJobs);
apiRouter.post('/jobs', requireAuth, createJob);
apiRouter.post('/jobs/:id/apply', requireAuth, applyJob);

// News & Heritage Endpoints
apiRouter.get('/news', requireAuth, listNews);
apiRouter.post('/news', requireAdmin, createNews);
apiRouter.get('/heritage', requireAuth, listHeritage);

// Posts Endpoints
apiRouter.get('/posts', requireAuth, listPosts);
apiRouter.post('/posts', requireAuth, createPost);
apiRouter.post('/posts/:id/like', requireAuth, likePost);
apiRouter.get('/posts/:id/comments', requireAuth, listComments);
apiRouter.post('/posts/:id/comments', requireAuth, createComment);
apiRouter.delete('/posts/:id', requireAuth, deletePost);
apiRouter.post('/posts/:id/pin', requireAuth, togglePinPost);

// Events Endpoints
apiRouter.get('/events', requireAuth, listEvents);
apiRouter.post('/events', requireAuth, createEvent);
apiRouter.post('/events/:id/rsvp', requireAuth, rsvpEvent);

apiRouter.get('/directory', requireAuth, listDirectory);
apiRouter.get('/directory/profile/:id', requireAuth, getProfile);
apiRouter.post('/directory/profile/update', requireAuth, updateProfile);
apiRouter.post('/directory/connect', requireAuth, connectRequest);
apiRouter.get('/directory/relations/:id', requireAuth, getUserRelations);

apiRouter.get('/directory/connections/status', requireAuth, getConnectionStatuses);
apiRouter.get('/directory/connections/pending', requireAuth, listPendingConnections);
apiRouter.post('/directory/connections/respond', requireAuth, respondConnectionRequest);
apiRouter.delete('/directory/connections/:targetId', requireAuth, removeConnection);
apiRouter.get('/directory/connections', requireAuth, listConnections);

// Mentorship Endpoints
apiRouter.get('/mentorship/mentors', requireAuth, listMentors);
apiRouter.get('/mentorship/pairings', requireAuth, listPairings);
apiRouter.post('/mentorship/request', requireAuth, requestMentorship);

// Notifications Endpoints
apiRouter.get('/notifications', requireAuth, listNotifications);
apiRouter.post('/notifications/read-all', requireAuth, readAllNotifications);
apiRouter.post('/notifications/:id/read', requireAuth, markRead);

// Admin Endpoints
apiRouter.get('/admin/pending-users', requireAdmin, listPendingUsers);

// Messages Endpoints
apiRouter.get('/messages/conversations', requireAuth, listConversations);
apiRouter.get('/messages/:partnerId', requireAuth, getConversation);
apiRouter.post('/messages/:partnerId', requireAuth, sendMessage);

// Group Chat Endpoints
apiRouter.post('/groups', requireAuth, createGroup);
apiRouter.get('/groups', requireAuth, listMyGroups);
apiRouter.get('/groups/:id', requireAuth, getGroupDetails);
apiRouter.patch('/groups/:id', requireAuth, updateGroup);
apiRouter.delete('/groups/:id', requireAuth, deleteGroup);
apiRouter.post('/groups/:id/members', requireAuth, addMembers);
apiRouter.delete('/groups/:id/members/:userId', requireAuth, removeMember);
apiRouter.get('/groups/:id/messages', requireAuth, listGroupMessages);
apiRouter.post('/groups/:id/messages', requireAuth, sendGroupMessage);
