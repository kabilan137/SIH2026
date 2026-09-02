import mongoose from 'mongoose';

import { env, requireEnv } from './env.js';

export async function connectDatabase() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = requireEnv('MONGO_URI', env.mongoUri);

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    autoIndex: env.nodeEnv !== 'production'
  });

  console.info('MongoDB connected.');
}
