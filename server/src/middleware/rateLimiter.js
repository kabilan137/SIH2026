import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Key by session-id header so each browser/user gets their own bucket,
 * instead of sharing one bucket per IP (which breaks local dev & LAN users).
 * Falls back to IP if no session header is present.
 */
const sessionKeyGenerator = (req) =>
  req.headers['x-session-id']?.trim() || req.ip;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // In dev, be very permissive (status polling burns requests fast).
  // In production keep it tight.
  max: isDev ? 2000 : 300,
  keyGenerator: sessionKeyGenerator,
  skip: () => isDev, // completely skip in local development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many API requests. Please retry later.'
    }
  }
});

export const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,
  keyGenerator: sessionKeyGenerator,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many analysis requests. Please retry later.'
    }
  }
});

export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 60,
  keyGenerator: sessionKeyGenerator,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many chat messages. Please retry later.'
    }
  }
});


