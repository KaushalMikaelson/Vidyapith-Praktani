import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip);

    if (!rateData || now > rateData.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    rateData.count++;
    if (rateData.count > limit) {
      res.status(429).json({
        error: "Too many requests from this IP, please try again later."
      });
      return;
    }

    next();
  };
};
