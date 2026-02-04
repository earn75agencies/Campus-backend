require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const usersToCreate = [
  {
    name: 'Gedion Mutua',
    email: 'gedionmutua2025@gmail.com',
    password: '@Gidi5632',
    role: 'admin'
  },
  {
    name: 'Jee Seller',
    email: 'jee@gmail.com',
    password: '@Jere1234',
    role: 'seller'
  },
  {
    name: 'Jere User',
    email: 'jere@gmail.com',
    password: '@Jere1234',
    role: 'student'
  }
];

async function createUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const userData of usersToCreate) {
      // Check if user exists
      let user = await User.findOne({ email: userData.email });

      if (user) {
        console.log(`User ${userData.email} already exists. Updating...`);
        // Update the user
        user.name = userData.name;
        user.role = userData.role;
        user.password = await bcrypt.hash(userData.password, 10);
        await user.save();
        console.log(`✓ Updated ${userData.name} (${userData.role})`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        });
        await user.save();
        console.log(`✓ Created ${userData.name} (${userData.role})`);
      }
    }

    console.log('\nUser creation completed!');
    console.log('\nLogin credentials:');
    console.log('==================');
    console.log('Admin: gedionmutua2025@gmail.com / @Gidi5632');
    console.log('Seller: jee@gmail.com / @Jere1234');
    console.log('Student: jere@gmail.com / @Jere1234');

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createUsers();
