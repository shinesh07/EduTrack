require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    const adminExists = await User.findOne({ email: 'admin@school.com' });
    if (adminExists) {
      console.log('Admin already exists. Skipping seed.');
      process.exit(0);
    }

    await User.create({
      name: 'System Admin',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'admin',
      department: 'Administration',
      isVerified: true,   // Admin is pre-verified
    });

    console.log('\n=== ADMIN ACCOUNT CREATED ===');
    console.log('Email:    admin@school.com');
    console.log('Password: admin123');
    console.log('⚠️  Change the password after first login!');
    console.log('==============================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
