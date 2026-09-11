/**
 * migrate-clerk-to-session.js
 *
 * One-time migration: renames the `clerkId` field to `sessionId` in all
 * MongoDB collections that were using it for ownership scoping.
 *
 * Collections migrated:
 *   - analyses
 *   - jobs
 *   - businessprofiles
 *   - schemematches
 *   - financialtransactions
 *
 * Run from the project root:
 *   node server/src/scripts/migrate-clerk-to-session.js
 */

import mongoose from 'mongoose';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set. Make sure your .env file is present.');
  process.exit(1);
}

// Collection name → Mongoose model name mapping
const COLLECTIONS = [
  { collection: 'analyses',             label: 'Analysis' },
  { collection: 'jobs',                 label: 'Job' },
  { collection: 'businessprofiles',     label: 'BusinessProfile' },
  { collection: 'schemematches',        label: 'SchemeMatch' },
  { collection: 'financialtransactions',label: 'FinancialTransaction' },
];

async function migrate() {
  console.log(`\n🔗  Connecting to MongoDB: ${MONGO_URI}\n`);
  await mongoose.connect(MONGO_URI);

  const db = mongoose.connection.db;

  let totalRenamed = 0;

  for (const { collection, label } of COLLECTIONS) {
    try {
      const col = db.collection(collection);

      // Count how many docs still have the old field
      const count = await col.countDocuments({ clerkId: { $exists: true } });

      if (count === 0) {
        console.log(`✅  [${label}] No documents with 'clerkId' — skipping.`);
        continue;
      }

      console.log(`🔄  [${label}] Renaming 'clerkId' → 'sessionId' in ${count} document(s)...`);

      const result = await col.updateMany(
        { clerkId: { $exists: true } },
        { $rename: { clerkId: 'sessionId' } }
      );

      console.log(`✅  [${label}] Done — ${result.modifiedCount} document(s) updated.`);
      totalRenamed += result.modifiedCount;
    } catch (err) {
      console.error(`❌  [${label}] Migration failed:`, err.message);
    }
  }

  console.log(`\n🎉  Migration complete. Total documents renamed: ${totalRenamed}\n`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('❌  Unexpected error during migration:', err);
  process.exit(1);
});
