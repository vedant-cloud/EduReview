const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StudentProfessorMapping = require('../models/StudentProfessorMapping');
const Course = require('../models/Course');
const Review = require('../models/Review');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Get all students
router.get('/students', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ username: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// Get all professors
router.get('/professors', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const professors = await User.find({ role: 'professor' })
      .select('-password')
      .sort({ username: 1 });
    res.json(professors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching professors', error: error.message });
  }
});

// Get all mappings
router.get('/mappings', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mappings = await StudentProfessorMapping.find()
      .populate('student', 'username email')
      .populate('professor', 'username email')
      .sort({ createdAt: -1 });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching mappings', error: error.message });
  }
});

// Create mapping (assign student to professor)
router.post('/mappings', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { studentId, professorId } = req.body;

    if (!studentId || !professorId) {
      return res.status(400).json({ message: 'Student ID and Professor ID are required' });
    }

    // Verify student exists and is a student
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify professor exists and is a professor
    const professor = await User.findOne({ _id: professorId, role: 'professor' });
    if (!professor) {
      return res.status(404).json({ message: 'Professor not found' });
    }

    // Check if mapping already exists
    const existingMapping = await StudentProfessorMapping.findOne({
      student: studentId,
      professor: professorId
    });

    if (existingMapping) {
      return res.status(400).json({ message: 'Mapping already exists' });
    }

    // Create mapping
    const mapping = new StudentProfessorMapping({
      student: studentId,
      professor: professorId
    });

    await mapping.save();
    await mapping.populate('student', 'username email');
    await mapping.populate('professor', 'username email');

    res.status(201).json(mapping);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping already exists' });
    }
    res.status(500).json({ message: 'Error creating mapping', error: error.message });
  }
});

// Delete mapping (unassign student from professor)
router.delete('/mappings/:mappingId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mapping = await StudentProfessorMapping.findById(req.params.mappingId);
    
    if (!mapping) {
      return res.status(404).json({ message: 'Mapping not found' });
    }

    // Delete all reviews by this student for courses from this professor
    const courses = await Course.find({ professor: mapping.professor });
    const courseIds = courses.map(c => c._id);
    if (courseIds.length > 0) {
      await Review.deleteMany({ 
        student: mapping.student, 
        course: { $in: courseIds } 
      });
    }

    await StudentProfessorMapping.findByIdAndDelete(req.params.mappingId);
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting mapping', error: error.message });
  }
});

// Get students mapped to a specific professor
router.get('/professors/:professorId/students', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mappings = await StudentProfessorMapping.find({ professor: req.params.professorId })
      .populate('student', 'username email')
      .sort({ createdAt: -1 });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// Get professors mapped to a specific student
router.get('/students/:studentId/professors', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const mappings = await StudentProfessorMapping.find({ student: req.params.studentId })
      .populate('professor', 'username email')
      .sort({ createdAt: -1 });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching professors', error: error.message });
  }
});

// Update user password (admin only) - must come before delete route
router.put('/users/:userId/password', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from changing their own password through this route (security)
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own password through this route' });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot modify admin accounts' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    if (user.role === 'professor') {
      // Delete all courses created by this professor
      const courses = await Course.find({ professor: user._id });
      const courseIds = courses.map(c => c._id);
      
      if (courseIds.length > 0) {
        // Delete all reviews for these courses
        await Review.deleteMany({ course: { $in: courseIds } });
      }
      
      // Delete all courses
      await Course.deleteMany({ professor: user._id });
      
      // Delete all mappings involving this professor
      await StudentProfessorMapping.deleteMany({ professor: user._id });
    } else if (user.role === 'student') {
      // Delete all reviews by this student
      await Review.deleteMany({ student: user._id });
      
      // Delete all mappings involving this student
      await StudentProfessorMapping.deleteMany({ student: user._id });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Error deleting user', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

