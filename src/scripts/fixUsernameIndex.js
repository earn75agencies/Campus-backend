/**
 * Migration script to fix the username duplicate key error
 *
 * The error occurs because MongoDB has a unique index on 'username' field
 * but the User model doesn't have this field anymore.
 *
 * Run this script with: node backend/src/scripts/fixUsernameIndex.js
 */

const mongoose = require('mongoose');

// Get MongoDB connection string from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-market';

async function fixUsernameIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check existing indexes
    console.log('\n=== Current indexes on users collection ===');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });

    // Check if username_1 index exists
    const usernameIndexExists = indexes.some(index => index.name === 'username_1');

    if (usernameIndexExists) {
      console.log('\n=== Found username_1 index - dropping it ===');
      await usersCollection.dropIndex('username_1');
      console.log('✅ username_1 index dropped successfully');
    } else {
      console.log('\n✅ No username_1 index found - no action needed');
    }

    // Show indexes after the fix
    console.log('\n=== Indexes after fix ===');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log(JSON.stringify(index, null, 2));
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
fixUsernameIndex();
