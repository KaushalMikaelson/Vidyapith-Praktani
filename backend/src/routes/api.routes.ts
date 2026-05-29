import { Router } from 'express';
import { register, login, resolveVerificationQueue } from '../controllers/auth.controller.js';
import { getLeaderboard, createCheckoutSession } from '../controllers/donations.controller.js';
import { listJobs, createJob, applyJob } from '../controllers/jobs.controller.js';
import { listNews, createNews, listHeritage } from '../controllers/news.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

export const apiRouter = Router();

// Auth Endpoints
apiRouter.post('/auth/register', register);
apiRouter.post('/auth/login', login);
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
