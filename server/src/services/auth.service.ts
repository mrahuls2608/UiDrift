import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CredentialsInput, UserDTO } from '@uidrift/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { User } from '../models/user.model.js';

const BCRYPT_ROUNDS = 10;
export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
// Compared against when the email is unknown so both paths take similar time.
const DUMMY_HASH = bcrypt.hashSync('uidrift-timing-guard', BCRYPT_ROUNDS);

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function signup(input: CredentialsInput): Promise<UserDTO> {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const user = await User.create({
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  });
  return { id: user._id.toString(), email: user.email };
}

export async function login(input: CredentialsInput): Promise<UserDTO> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  return { id: user._id.toString(), email: user.email };
}

export async function getUser(userId: string): Promise<UserDTO | null> {
  const user = await User.findById(userId);
  return user ? { id: user._id.toString(), email: user.email } : null;
}
