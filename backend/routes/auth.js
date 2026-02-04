const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate role - admin cannot signup through normal flow
    if (!['student', 'professor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be student or professor.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create user
    const user = new User({ username, email, password, role });
    await user.save();

    // Auto login after signup
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during login', error: err });
      }
      const userObj = user.toObject();
      delete userObj.password;
      return res.status(201).json({ message: 'User created successfully', user: userObj });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Error during authentication', error: err });
    }
    if (!user) {
      return res.status(401).json({ message: info.message || 'Authentication failed' });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during login', error: err });
      }
      const userObj = user.toObject();
      delete userObj.password;
      return res.json({ message: 'Login successful', user: userObj });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error during logout', error: err });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
  const userObj = req.user.toObject();
  delete userObj.password;
  res.json({ user: userObj });
});

module.exports = router;


