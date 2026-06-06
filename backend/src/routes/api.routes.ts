import { Router } from 'express';
import { register, login, resolveVerificationQueue, getMe } from '../controllers/auth.controller.js';
import { getLeaderboard, createCheckoutSession } from '../controllers/donations.controller.js';
import { listJobs, createJob, applyJob } from '../controllers/jobs.controller.js';
import { listNews, createNews, listHeritage } from '../controllers/news.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

// Feature Controllers
import { listPosts, createPost, likePost, listComments, createComment } from '../controllers/posts.controller.js';
import { listEvents, createEvent, rsvpEvent } from '../controllers/events.controller.js';
import { listDirectory, connectRequest, getProfile } from '../controllers/directory.controller.js';
import { listMentors, listPairings, requestMentorship } from '../controllers/mentorship.controller.js';
import { listNotifications, markRead, readAllNotifications } from '../controllers/notifications.controller.js';
import { listPendingUsers } from '../controllers/admin.controller.js';
import { uploadMedia } from '../controllers/upload.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { listConversations, getConversation, sendMessage } from '../controllers/messages.controller.js';

export const apiRouter = Router();

// ── Media Upload (Cloudinary) ─────────────────────────────────────────────
apiRouter.post('/upload', requireAuth, uploadMiddleware.single('file'), uploadMedia);

// ── Auth ──────────────────────────────────────────────────────────────────
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
apiRouter.get('/auth/me', requireAuth, getMe);
apiRouter.post('/auth/resolve-queue', requireAdmin, resolveVerificationQueue);

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

// Events Endpoints
apiRouter.get('/events', requireAuth, listEvents);
apiRouter.post('/events', requireAuth, createEvent);
apiRouter.post('/events/:id/rsvp', requireAuth, rsvpEvent);

// Directory Endpoints
apiRouter.get('/directory', requireAuth, listDirectory);
apiRouter.get('/directory/profile/:id', requireAuth, getProfile);
apiRouter.post('/directory/connect', requireAuth, connectRequest);

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

