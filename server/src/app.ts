import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isTest } from './config/env.js';
import { logger } from './lib/logger.js';
import { optionalAuth, requireAuth } from './middleware/auth.js';
import { generalLimiter, originCheck } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: new URL(env.CLIENT_URL).origin, credentials: true }));
  if (!isTest)
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/v1/health' } }));
  app.use(cookieParser());
  app.use(optionalAuth);
  // Source-code audits upload up to ~6 MB of text. Only signed-in users get the larger body
  // limit: authentication runs before this parser, so anonymous clients can't send big bodies.
  app.use('/api/v1/scans/source', requireAuth, express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(originCheck);
  app.use('/api/v1', generalLimiter, apiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
