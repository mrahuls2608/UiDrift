import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isTest } from './config/env.js';
import { logger } from './lib/logger.js';
import { optionalAuth } from './middleware/auth.js';
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
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(originCheck);
  app.use(optionalAuth);
  app.use('/api/v1', generalLimiter, apiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
