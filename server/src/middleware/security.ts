import type { NextFunction, Request, Response } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { env, isTest } from '../config/env.js';
import { redis } from '../lib/redis.js';
import { AppError } from '../lib/errors.js';

function store(prefix: string): Partial<Options> {
  if (isTest) return {};
  return {
    store: new RedisStore({
      prefix: `uidrift:rl:${prefix}:`,
      sendCommand: (command: string, ...args: string[]) =>
        redis().call(command, ...args) as Promise<RedisReply>,
    }),
  };
}

const handler: Options['handler'] = (_req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  });
};

/** 5 scans per hour per IP (RULES §4). Shared across instances through Redis. */
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.SCAN_RATE_LIMIT_PER_HOUR,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  ...store('scan'),
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path.endsWith('/events'),
  handler,
  ...store('api'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  ...store('auth'),
});

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie auth: state-changing requests must come from the web app origin
 * (browsers always send Origin on cross-site POST/DELETE). Requests without Origin
 * (curl, server-to-server) carry no ambient browser cookies and are allowed.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const allowed = new Set([new URL(env.CLIENT_URL).origin, `${req.protocol}://${req.get('host')}`]);
  if (!allowed.has(origin))
    return next(new AppError(403, 'BAD_ORIGIN', 'Request origin not allowed.'));
  next();
}
