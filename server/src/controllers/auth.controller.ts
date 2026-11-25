import type { Request, Response } from 'express';
import { credentialsSchema } from '@uidrift/shared';
import { parse } from '../middleware/validate.js';
import * as auth from '../services/auth.service.js';
import { AUTH_COOKIE, cookieOptions } from '../middleware/auth.js';

export async function signup(req: Request, res: Response) {
  const user = await auth.signup(parse(credentialsSchema, req.body));
  res.cookie(AUTH_COOKIE, auth.signToken(user.id), cookieOptions).status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const user = await auth.login(parse(credentialsSchema, req.body));
  res.cookie(AUTH_COOKIE, auth.signToken(user.id), cookieOptions).json({ user });
}

export async function logout(_req: Request, res: Response) {
  const { maxAge: _maxAge, ...opts } = cookieOptions;
  res.clearCookie(AUTH_COOKIE, opts).json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = req.userId ? await auth.getUser(req.userId) : null;
  res.json({ user });
}
