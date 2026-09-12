/**
 * migrate-competitor-schema.js
 *
 * One-time migration: converts the Competitor collection from a per-search
 * model to a shared place cache keyed by placeId.
 *
 * Steps:
 *   1. Drop the old compound index { search: 1, placeId: 1 }
 *   2. Deduplicate by placeId — keep the newest document per placeId,
 *      delete all older duplicates.
 *   3. Remove the `search` field from all remaining documents ($unset).
 *   4. Set `lastFetchedAt` = createdAt (or now if missing) on all documents.
 *   5. Set `fetchCount` = 1 on all documents that don't have it yet.
 *   6. Create the new unique index { placeId: 1 }.
 *
 * Run ONCE before deploying the new code:
 *   node server/src/scripts/migrate-competitor-schema.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sih2026';

async function migrate() {
  console.log(`\n🔗  Connecting to MongoDB: ${MONGO_URI}\n`);
  await mongoose.connect(MONGO_URI);

  const db = mongoose.connection.db;
  const col = db.collection('competitors');

  // ── Step 1: Drop old compound index ─────────────────────────────────────
  console.log('📋  Step 1: Dropping old compound index { search, placeId }...');
  const existingIndexes = await col.indexes();
  const oldIndex = existingIndexes.find(
    (idx) => idx.key && idx.key.search !== undefined && idx.key.placeId !== undefined
  );

  if (oldIndex) {
    await col.dropIndex(oldIndex.name);
    console.log(`✅  Dropped index: ${oldIndex.name}`);
  } else {
    console.log('ℹ️   Old compound index not found — already removed or never existed.');
  }

  // Also drop the placeId-only index if it already exists (we'll recreate it as unique)
  const existingPlaceIdIndex = existingIndexes.find(
    (idx) => idx.key && idx.key.placeId !== undefined && !idx.key.search
  );
  if (existingPlaceIdIndex && !existingPlaceIdIndex.unique) {
    await col.dropIndex(existingPlaceIdIndex.name);
    console.log(`✅  Dropped non-unique placeId index: ${existingPlaceIdIndex.name}`);
  }

  // ── Step 2: Deduplicate by placeId ───────────────────────────────────────
  console.log('\n📋  Step 2: Deduplicating by placeId (keep newest per placeId)...');

  const duplicatePipeline = [
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$placeId',
        keepId: { $first: '$_id' },
        allIds: { $push: '$_id' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ];

  const duplicateGroups = await col.aggregate(duplicatePipeline).toArray();
  let totalDeleted = 0;

  for (const group of duplicateGroups) {
    const idsToDelete = group.allIds.filter(
      (id) => id.toString() !== group.keepId.toString()
    );
    const result = await col.deleteMany({ _id: { $in: idsToDelete } });
    totalDeleted += result.deletedCount;
    console.log(
      `  placeId "${group._id}" — kept newest, deleted ${result.deletedCount} duplicate(s)`
    );
  }

  if (totalDeleted === 0) {
    console.log('ℹ️   No duplicates found.');
  } else {
    console.log(`✅  Removed ${totalDeleted} duplicate competitor document(s).`);
  }

  // ── Step 3: Remove `search` field from all documents ────────────────────
  console.log('\n📋  Step 3: Removing `search` field from all competitor documents...');
  const unsetResult = await col.updateMany(
    { search: { $exists: true } },
    { $unset: { search: '' } }
  );
  console.log(`✅  Unset \`search\` field from ${unsetResult.modifiedCount} document(s).`);

  // ── Step 4: Set `lastFetchedAt` from `createdAt` where missing ───────────
  console.log('\n📋  Step 4: Backfilling `lastFetchedAt` from `createdAt`...');
  const backfillResult = await col.updateMany(
    { lastFetchedAt: { $exists: false } },
    [{ $set: { lastFetchedAt: { $ifNull: ['$createdAt', new Date()] } } }]
  );
  console.log(`✅  Backfilled \`lastFetchedAt\` on ${backfillResult.modifiedCount} document(s).`);

  // ── Step 5: Set `fetchCount: 1` where missing ────────────────────────────
  console.log('\n📋  Step 5: Setting `fetchCount: 1` on existing documents...');
  const fetchCountResult = await col.updateMany(
    { fetchCount: { $exists: false } },
    { $set: { fetchCount: 1 } }
  );
  console.log(`✅  Set \`fetchCount\` on ${fetchCountResult.modifiedCount} document(s).`);

  // ── Step 6: Create new unique index { placeId: 1 } ──────────────────────
  console.log('\n📋  Step 6: Creating new unique index { placeId: 1 }...');
  try {
    await col.createIndex({ placeId: 1 }, { unique: true, name: 'placeId_1_unique' });
    console.log('✅  Created unique index on placeId.');
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      console.log('ℹ️   Unique placeId index already exists — skipping.');
    } else {
      throw err;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const finalCount = await col.countDocuments();
  console.log(`\n🎉  Migration complete.`);
  console.log(`    Total competitor documents in collection: ${finalCount}`);
  console.log(`    Duplicates removed: ${totalDeleted}\n`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('\n❌  Migration failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
