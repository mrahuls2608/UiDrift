import pino from 'pino';
import { env, isProd } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProd || env.NODE_ENV === 'test' ? undefined : { target: 'pino-pretty' },
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.llm.apiKey', '*.apiKey'],
});
