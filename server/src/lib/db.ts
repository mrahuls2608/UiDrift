import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export async function connectDb(uri = env.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}
