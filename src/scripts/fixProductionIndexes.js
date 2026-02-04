/**
 * Script to fix MongoDB index issues in production
 * Run this to remove orphaned indexes that cause duplicate key errors
 *
 * Usage: node src/scripts/fixProductionIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Try to get MongoDB URI from environment or use production one
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://campus:campus@cluster0.zzigobx.mongodb.net/test';

    console.log('Connecting to MongoDB...');
    console.log('Database:', mongoUri.split('/').pop());
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    console.log('Current database:', db.databaseName);

    const usersCollection = db.collection('users');

    // Get all indexes on users collection
    console.log('\nCurrent indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Check for problematic username index
    const usernameIndex = indexes.find(idx => idx.name === 'username_1');

    if (usernameIndex) {
      console.log('\n⚠️  Found problematic username_1 index!');
      console.log('Dropping username_1 index...');

      await usersCollection.dropIndex('username_1');
      console.log('✅ Successfully dropped username_1 index');
    } else {
      console.log('\n✅ No username_1 index found (this is good)');
    }

    // Show final indexes
    console.log('\nIndexes after cleanup:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ Index fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

fixIndexes();
