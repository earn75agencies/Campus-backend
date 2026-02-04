/**
 * Script to fix MongoDB index issues in the TEST database
 * The error shows: collection: test.users
 */

const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    // Connect to the TEST database directly
    const baseUri = 'mongodb+srv://campus:campus@cluster0.zzigobx.mongodb.net/test';
    const mongoUri = process.env.MONGODB_URI || baseUri;

    console.log('Connecting to MongoDB TEST database...');
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
