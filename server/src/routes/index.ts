import { Router } from 'express';
import { ah } from '../middleware/async.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, scanLimiter } from '../middleware/security.js';
import * as scan from '../controllers/scan.controller.js';
import * as report from '../controllers/report.controller.js';
import * as auth from '../controllers/auth.controller.js';
import { health } from '../controllers/health.controller.js';

export function apiRouter(): Router {
  const r = Router();
  r.get('/health', ah(health));

  r.post('/scans', scanLimiter, ah(scan.create));
  r.get('/scans/:id', ah(scan.show));
  r.get('/scans/:id/events', ah(scan.events));
  r.delete('/scans/:id', ah(scan.remove));

  r.get('/reports/:scanId', ah(report.show));
  r.get('/reports/:scanId/export', ah(report.exportFile));
  r.get('/demos', ah(scan.demos));

  r.get('/me', ah(auth.me));
  r.get('/me/scans', requireAuth, ah(scan.mine));
  r.post('/auth/signup', authLimiter, ah(auth.signup));
  r.post('/auth/login', authLimiter, ah(auth.login));
  r.post('/auth/logout', requireAuth, ah(auth.logout));
  return r;
}
