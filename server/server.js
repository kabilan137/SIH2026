import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { env } from './src/config/env.js';

let server;

async function startServer() {
  await connectDatabase();

  server = app.listen(env.port, () => {
    console.info(`MarketSense API listening on port ${env.port}`);
  });
}

function shutdown(signal) {
  console.info(`${signal} received. Closing HTTP server.`);
  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });
}

// Only setup listeners and start server if we are NOT running on Vercel
if (process.env.VERCEL) {
  // On Vercel, just establish the database connection top-level so Mongoose is ready
  connectDatabase().catch((error) => {
    console.error('Failed to connect to database in serverless environment:', error);
  });
} else {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export const maxDuration = 60;
export default app;
