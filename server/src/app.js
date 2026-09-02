import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import analysisRoutes from './routes/analysisRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import configRoutes from './routes/configRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { clerkMiddleware } from '@clerk/express';
import { preventCache } from './middleware/auth.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if it matches the configured client origin
      if (origin === env.clientOrigin) {
        return callback(null, true);
      }

      // Allow any marketsense Vercel deployment (production alias, branch, or commit-hash preview)
      // Examples:
      //   https://marketsense-blond.vercel.app                                (production alias)
      //   https://marketsense-git-preview-sanjithdoescodes-projects.vercel.app (branch preview)
      //   https://marketsense-jg59qehi2-sanjithdoescodes-projects.vercel.app  (commit preview)
      const isVercelPreview = /^https:\/\/marketsense-[a-zA-Z0-9._-]+\.vercel\.app$/.test(origin);
      if (isVercelPreview) {
        return callback(null, true);
      }

      // Disallow other origins (blocks CORS without throwing server-side errors)
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});
app.use('/api', clerkMiddleware());
app.use('/api', preventCache);
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'marketsense-api',
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'MarketSense API is running.'
  });
});

app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/config', configRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
