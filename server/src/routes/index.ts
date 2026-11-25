import { Router } from 'express';
import { ah } from '../middleware/async.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, scanLimiter } from '../middleware/security.js';
import * as scan from '../controllers/scan.controller.js';
import * as report from '../controllers/report.controller.js';
import * as auth from '../controllers/auth.controller.js';
import { health } from '../controllers/health.controller.js';

/**
 * Public: health check and authentication. Everything else — starting audits, progress, reports,
 * exports, demos and history — requires a signed-in user.
 */
export function apiRouter(): Router {
  const r = Router();
  r.get('/health', ah(health));

  r.get('/me', ah(auth.me));
  r.post('/auth/signup', authLimiter, ah(auth.signup));
  r.post('/auth/login', authLimiter, ah(auth.login));
  r.post('/auth/logout', requireAuth, ah(auth.logout));

  const app = Router();
  app.use(requireAuth);
  app.post('/scans', scanLimiter, ah(scan.create));
  app.post('/scans/source', scanLimiter, ah(scan.createSource));
  app.get('/scans/:id', ah(scan.show));
  app.get('/scans/:id/events', ah(scan.events));
  app.delete('/scans/:id', ah(scan.remove));
  app.get('/reports/:scanId', ah(report.show));
  app.get('/reports/:scanId/export', ah(report.exportFile));
  app.get('/demos', ah(scan.demos));
  app.get('/me/scans', ah(scan.mine));
  r.use(app);
  return r;
}
