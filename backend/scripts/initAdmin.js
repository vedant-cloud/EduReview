const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function initAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course_feedback', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'adminiitbhu@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      // Update password in case it changed
      existingAdmin.password = 'adminiitbhu';
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('Admin user updated');
    } else {
      // Create admin user
      const admin = new User({
        username: 'admin',
        email: 'adminiitbhu@gmail.com',
        password: 'adminiitbhu',
        role: 'admin'
      });

      await admin.save();
      console.log('Admin user created successfully');
      console.log('Email: adminiitbhu@gmail.com');
      console.log('Password: adminiitbhu');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error initializing admin:', error);
    process.exit(1);
  }
}

initAdmin();

