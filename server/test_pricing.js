import { connectDatabase } from './src/config/database.js';
import { discoverCompetitors } from './src/services/competitorService.js';
import mongoose from 'mongoose';

async function run() {
  console.log('Connecting to database...');
  await connectDatabase();

  try {
    console.log('Discovering competitors...');
    const result = await discoverCompetitors({
      location: 'Austin, TX',
      businessType: 'restaurant',
      radius: 1000,
      maxCompetitors: 3
    });

    console.log('\nSearch metadata:', JSON.stringify(result.search, null, 2));
    console.log('\nCompetitors found:', result.competitors.length);
    result.competitors.forEach((c, idx) => {
      console.log(`\nCompetitor #${idx + 1}:`);
      console.log(`  Name:        ${c.name}`);
      console.log(`  Address:     ${c.address}`);
      console.log(`  Price Level: ${c.googleMetadata?.priceLevel}`);
      console.log(`  Price Range: ${JSON.stringify(c.googleMetadata?.priceRange)}`);
    });
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    console.log('\nClosing database connection...');
    await mongoose.connection.close();
    console.log('Done.');
  }
}

run();
