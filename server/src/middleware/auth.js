export function preventCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

/**
 * Reads the `x-session-id` header sent by the client and attaches it to the
 * request as `req.sessionId`. This replaces Clerk-based auth — the sessionId
 * is a UUID generated once per browser and stored in localStorage.
 *
 * If the header is missing or empty, the request is rejected with 401 so that
 * history and analysis records always have an owner identity.
 */
export function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return res.status(401).json({ error: 'Session ID missing. Please refresh and try again.' });
  }
  req.sessionId = sessionId.trim();
  next();
}
