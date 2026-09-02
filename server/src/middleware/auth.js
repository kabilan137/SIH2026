import { getAuth } from '@clerk/express';

// ── Boot-time guard ────────────────────────────────────────────────────────────
// If CLERK_SECRET_KEY is missing the clerkMiddleware() will silently accept
// every request with userId: null, which causes the multi-tenancy data leak.
// Logging loudly here makes the misconfiguration visible at startup (or in
// Vercel cold-start logs) before any request is processed.
if (!process.env.CLERK_SECRET_KEY) {
  console.error(
    '[CLERK] ⚠️  FATAL: CLERK_SECRET_KEY is not set in the environment. ' +
    'All requests will be treated as unauthenticated. ' +
    'Set this variable in your Vercel Project → Settings → Environment Variables.'
  );
}

export function preventCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

export function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);
    if (!auth || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
      console.warn(
        '[requireAuth] Rejected request — auth object:', JSON.stringify(auth),
        '| Path:', req.method, req.originalUrl,
        '| Reason:', !auth ? 'getAuth() returned null/undefined' :
          !auth.userId ? 'userId is null or undefined' : 'userId is empty string'
      );
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.auth = auth;
    next();
  } catch (error) {
    console.error('[requireAuth] Threw an exception:', error.message);
    return res.status(401).json({ error: 'Authentication required' });
  }
}
