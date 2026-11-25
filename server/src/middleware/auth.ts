import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { isProd } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';
import { TOKEN_TTL_SECONDS, verifyToken } from '../services/auth.service.js';

export const AUTH_COOKIE = 'uidrift_token';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: TOKEN_TTL_SECONDS * 1000,
};

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  const userId = token ? verifyToken(token) : null;
  if (userId) req.userId = userId;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) return next(unauthorized());
  next();
}
