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
 * Protected endpoint to verify that Clerk auth is working correctly on any
 * deployment. Hit this with a valid Bearer token to confirm:
 *   1. clerkMiddleware() is processing the JWT
 *   2. CLERK_SECRET_KEY is present and correct in the server environment
 *   3. requireAuth returns the expected clerkId
 *
 * Expected success response:
 *   { success: true, data: { clerkId: "user_xxx", env: { hasSecretKey: true } } }
 *
 * If you get a 401, CLERK_SECRET_KEY is missing or wrong in Vercel env vars.
 */
router.get('/auth-check', requireAuth, (req, res) => {
  const clerkId = req.auth?.userId;
  return res.status(200).json({
    success: true,
    data: {
      clerkId,
      clerkIdType: typeof clerkId,
      clerkIdLength: clerkId?.length ?? 0,
      env: {
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        // Never log the key value itself — only its presence and prefix for verification
        secretKeyPrefix: process.env.CLERK_SECRET_KEY
          ? process.env.CLERK_SECRET_KEY.slice(0, 8) + '...'
          : null,
        nodeEnv: process.env.NODE_ENV || 'unknown'
      }
    }
  });
});

export default router;

