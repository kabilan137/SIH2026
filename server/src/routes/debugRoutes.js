import { Router } from 'express';
import { debugDemand } from '../controllers/debugDemandController.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Debug routes — for auditing and diagnosing the Demand Signal Engine.
 *
 * These routes make real external API calls (Google Places, Mistral)
 * and are intended for development and QA use only.
 *
 * In production, access should be restricted via environment-gated
 * middleware or an internal-only network rule.
 */
const router = Router();

// POST /api/debug/demand
// Full demand pipeline diagnostic with raw counts, dedup stats, and score breakdown
router.post('/demand', debugDemand);

/**
 * GET /api/debug/auth-check
 *
 * Protected endpoint to verify that session-based auth is working correctly
 * on any deployment. Hit this with a valid `x-session-id` header to confirm:
 *   1. requireAuth is extracting the session ID from the header
 *   2. req.sessionId is populated correctly
 *
 * Expected success response:
 *   { success: true, data: { sessionId: "uuid-...", env: { nodeEnv: "production" } } }
 *
 * If you get a 401, the x-session-id header is missing or empty.
 */
router.get('/auth-check', requireAuth, (req, res) => {
  const sessionId = req.sessionId;
  return res.status(200).json({
    success: true,
    data: {
      sessionId,
      sessionIdType: typeof sessionId,
      sessionIdLength: sessionId?.length ?? 0,
      env: {
        nodeEnv: process.env.NODE_ENV || 'unknown'
      }
    }
  });
});

export default router;

