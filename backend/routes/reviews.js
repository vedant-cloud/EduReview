const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Course = require('../models/Course');
const StudentProfessorMapping = require('../models/StudentProfessorMapping');
const { isAuthenticated, isStudent, isProfessor } = require('../middleware/auth');

// Check if current user has reviewed a course
router.get('/check/:courseId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== 'student') {
      return res.json({ hasReviewed: false, canReview: false });
    }

    // Check if course exists and if student is mapped to professor
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.json({ hasReviewed: false, canReview: false });
    }

    const mapping = await StudentProfessorMapping.findOne({
      student: req.user._id,
      professor: course.professor
    });

    if (!mapping) {
      return res.json({ hasReviewed: false, canReview: false });
    }

    const review = await Review.findOne({
      course: req.params.courseId,
      student: req.user._id
    });

    res.json({ hasReviewed: !!review, canReview: true });
  } catch (error) {
    res.status(500).json({ message: 'Error checking review', error: error.message });
  }
});

// Get all reviews for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const reviews = await Review.find({ course: req.params.courseId })
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

    res.json(anonymousReviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// Create review (student only)
router.post('/', isAuthenticated, isStudent, async (req, res) => {
  try {
    const { courseId, rating, comment } = req.body;

    if (!courseId || !rating || !comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is mapped to the professor
    const mapping = await StudentProfessorMapping.findOne({
      student: req.user._id,
      professor: course.professor
    });

    if (!mapping) {
      return res.status(403).json({ 
        message: 'Access denied. You are not mapped to this professor. Only mapped students can review courses.' 
      });
    }

    // Check if student already reviewed this course
    const existingReview = await Review.findOne({
      course: courseId,
      student: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this course' });
    }

    const review = new Review({
      course: courseId,
      student: req.user._id,
      rating,
      comment
    });

    await review.save();
    const reviewObj = review.toObject();
    reviewObj.student = { _id: null, username: 'Anonymous Student' };
    res.status(201).json(reviewObj);
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
});

// Professor reply to review
router.post('/:reviewId/reply', isAuthenticated, isProfessor, async (req, res) => {
  try {
    const { reply } = req.body;
    const review = await Review.findById(req.params.reviewId)
      .populate('course', 'professor');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if the course belongs to this professor
    if (review.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only reply to reviews on your courses' });
    }

    review.professorReply = reply;
    review.updatedAt = Date.now();
    await review.save();

    const reviewObj = review.toObject();
    // Hide student name even from professor
    reviewObj.student = { _id: null, username: 'Anonymous Student' };

    res.json(reviewObj);
  } catch (error) {
    res.status(500).json({ message: 'Error adding reply', error: error.message });
  }
});

// Update professor reply
router.put('/:reviewId/reply', isAuthenticated, isProfessor, async (req, res) => {
  try {
    const { reply } = req.body;
    const review = await Review.findById(req.params.reviewId)
      .populate('course', 'professor');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update replies on your courses' });
    }

    review.professorReply = reply;
    review.updatedAt = Date.now();
    await review.save();

    const reviewObj = review.toObject();
    // Hide student name even from professor
    reviewObj.student = { _id: null, username: 'Anonymous Student' };
    res.json(reviewObj);
  } catch (error) {
    res.status(500).json({ message: 'Error updating reply', error: error.message });
  }
});

// Delete review (student can delete their own)
router.delete('/:reviewId', isAuthenticated, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Students can delete their own reviews, professors can delete reviews on their courses
    const isOwner = review.student.toString() === req.user._id.toString();
    const course = await Course.findById(review.course);
    const isCourseOwner = course && course.professor.toString() === req.user._id.toString();

    if (!isOwner && !isCourseOwner) {
      return res.status(403).json({ message: 'You do not have permission to delete this review' });
    }

    await Review.findByIdAndDelete(req.params.reviewId);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
});

module.exports = router;

