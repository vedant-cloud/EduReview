const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const StudentProfessorMapping = require('../models/StudentProfessorMapping');
const Review = require('../models/Review');
const { isAuthenticated, isProfessor } = require('../middleware/auth');

// Get all courses with average ratings
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let courses;

    // Filter courses based on user role
    if (req.isAuthenticated() && req.user.role === 'student') {
      // Students can ONLY see courses from professors they are mapped to
      const mappings = await StudentProfessorMapping.find({ student: req.user._id });
      const professorIds = mappings.map(m => m.professor.toString());
      
      if (professorIds.length === 0) {
        // No mappings - return empty array (student sees no courses)
        return res.json([]);
      }

      // Only fetch courses from mapped professors
      courses = await Course.find({ professor: { $in: professorIds } })
        .populate('professor', 'username')
        .sort({ createdAt: -1 });
      
      // Double-check: filter out any courses that might have slipped through
      // (extra safety measure - ensures students NEVER see unmapped courses)
      if (courses && courses.length > 0) {
        courses = courses.filter(course => {
          if (!course.professor || !course.professor._id) return false;
          const courseProfessorId = course.professor._id.toString();
          return professorIds.includes(courseProfessorId);
        });
      }
    } else if (req.isAuthenticated() && req.user.role === 'professor') {
      // Professors see ONLY their own courses (not other professors' courses)
      courses = await Course.find({ professor: req.user._id })
        .populate('professor', 'username')
        .sort({ createdAt: -1 });
      
      // Double-check: filter out any courses that don't belong to this professor
      // (extra safety measure - ensures professors NEVER see other professors' courses)
      if (courses && courses.length > 0) {
        courses = courses.filter(course => {
          if (!course.professor || !course.professor._id) return false;
          const courseProfessorId = course.professor._id.toString();
          const currentProfessorId = req.user._id.toString();
          return courseProfessorId === currentProfessorId;
        });
      }
    } else if (req.isAuthenticated() && req.user.role === 'admin') {
      // Admins see ALL courses (no filtering)
      courses = await Course.find()
        .populate('professor', 'username')
        .sort({ createdAt: -1 });
    } else {
      // Not authenticated - no courses
      return res.json([]);
    }

    // Calculate average rating for each course
    const coursesWithRatings = await Promise.all(
      courses.map(async (course) => {
        const reviews = await Review.find({ course: course._id });
        const totalRatings = reviews.length;
        const sumRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(2) : 0;

        const courseObj = course.toObject();
        courseObj.averageRating = parseFloat(averageRating);
        courseObj.totalReviews = totalRatings;
        return courseObj;
      })
    );

    // Apply pagination
    const totalCourses = coursesWithRatings.length;
    const paginatedCourses = coursesWithRatings.slice(skip, skip + limit);

    res.json({
      courses: paginatedCourses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
        hasNext: page * limit < totalCourses,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

// Get single course with reviews
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('professor', 'username');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access permissions
    if (req.isAuthenticated() && req.user.role === 'student') {
      // Students can only access courses from professors they are mapped to
      const mapping = await StudentProfessorMapping.findOne({
        student: req.user._id,
        professor: course.professor._id
      });
      
      if (!mapping) {
        return res.status(403).json({ 
          message: 'Access denied. You are not mapped to this professor.' 
        });
      }
    } else if (req.isAuthenticated() && req.user.role === 'professor') {
      // Professors can only access their own courses
      if (course.professor._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Access denied. This is not your course.' 
        });
      }
    } else if (!req.isAuthenticated()) {
      // Not authenticated
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Admins can access all courses (no check needed)

    // Populate reviews (anonymous for students)
    const Review = require('../models/Review');
    const reviews = await Review.find({ course: req.params.id })
      .populate('student', 'username')
      .sort({ createdAt: -1 });

    // Make ALL student names anonymous (even to professors)
    const anonymousReviews = reviews.map(review => {
      const reviewObj = review.toObject();
      // Keep student ID visible only if it's the current user's own review (for students)
      const isOwnReview = req.isAuthenticated() && 
                         req.user.role === 'student' && 
                         review.student._id.toString() === req.user._id.toString();
      
      if (!isOwnReview) {
        // Hide student identity from everyone (including professors)
        reviewObj.student = { _id: null, username: 'Anonymous Student' };
      }
      return reviewObj;
    });

    res.json({ course, reviews: anonymousReviews });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course', error: error.message });
  }
});

// Create course (professor only)
router.post('/', isAuthenticated, isProfessor, async (req, res) => {
  try {
    const { name, description, content } = req.body;

    if (!name || !description || !content) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const course = new Course({
      name,
      description,
      content,
      professor: req.user._id,
      professorName: req.user.username
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

// Update course (professor only, own courses)
router.put('/:id', isAuthenticated, isProfessor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own courses' });
    }

    const { name, description, content } = req.body;
    if (name) course.name = name;
    if (description) course.description = description;
    if (content) course.content = content;
    course.updatedAt = Date.now();

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
});

// Delete course (professor only, own courses)
router.delete('/:id', isAuthenticated, isProfessor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own courses' });
    }

    // Delete associated reviews
    const Review = require('../models/Review');
    await Review.deleteMany({ course: req.params.id });

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
});

// Get courses by professor
router.get('/professor/:professorId', async (req, res) => {
  try {
    const courses = await Course.find({ professor: req.params.professorId })
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

module.exports = router;

