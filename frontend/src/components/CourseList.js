import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CourseList.css';

const CourseList = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRating, setFilterRating] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, filterRating]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      const data = response.data;
      const coursesData = data.courses || [];
      
      // Backend already filters correctly:
      // - Students: only courses from mapped professors
      // - Professors: only their own courses
      // - Admins: all courses
      // We trust the backend filtering, but set the courses as received
      setCourses(coursesData);
      setError('');
      
      // Show message if student has no mappings
      if (user && user.role === 'student' && coursesData.length === 0) {
        setError('No courses available. You need to be mapped to a professor by an admin to see courses.');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load courses');
      setCourses([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    if (filterRating === 'all') {
      setFilteredCourses(courses);
    } else {
      const minRating = parseFloat(filterRating);
      const filtered = courses.filter(course => course.averageRating >= minRating);
      setFilteredCourses(filtered);
    }
  };

  if (loading) {
    return <div>Loading courses...</div>;
  }

  // Show welcome message if user is not logged in
  if (!user) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <h1>Welcome to Course Feedback System</h1>
          <p className="welcome-message">
            Please log in or sign up to view and interact with courses.
          </p>
          <div className="welcome-actions">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/signup" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
          <div className="welcome-info">
            <h3>What you can do:</h3>
            <ul>
              <li><strong>As a Student:</strong> Browse courses, view details, and leave anonymous reviews</li>
              <li><strong>As a Professor:</strong> Create and manage courses, view reviews, and reply to students</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="course-list-header">
        <h1>
          {user && user.role === 'professor' ? 'My Courses' : 
           user && user.role === 'admin' ? 'All Courses' : 
           'All Courses'}
        </h1>
        <div className="filter-section">
          <label htmlFor="rating-filter">Filter by Rating: </label>
          <select
            id="rating-filter"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="rating-filter-select"
          >
            <option value="all">All Ratings</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="3.0">3.0+ Stars</option>
            <option value="2.5">2.5+ Stars</option>
            <option value="2.0">2.0+ Stars</option>
            <option value="1.5">1.5+ Stars</option>
            <option value="1.0">1.0+ Stars</option>
          </select>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {courses.length === 0 ? (
        <div className="card">
          <p>No courses available yet.</p>
          {user && user.role === 'professor' && (
            <Link to="/create-course" className="btn btn-primary">
              Create First Course
            </Link>
          )}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="card">
          {user && user.role === 'student' ? (
            <p>No courses available. You need to be mapped to a professor by an admin to see courses.</p>
          ) : (
            <p>No courses match the selected rating filter.</p>
          )}
        </div>
      ) : (
        <div className="course-grid">
          {filteredCourses.map(course => (
            <div key={course._id} className="course-card">
              <h3>{course.name}</h3>
              <p className="professor-name">By: {course.professorName}</p>
              <div className="course-rating">
                <span className="rating-stars">
                  {course.averageRating > 0 ? (
                    <>
                      {'★'.repeat(Math.round(course.averageRating))}
                      {'☆'.repeat(5 - Math.round(course.averageRating))}
                      <span className="rating-value"> ({course.averageRating.toFixed(1)})</span>
                    </>
                  ) : (
                    <span className="no-rating">No ratings yet</span>
                  )}
                </span>
                <span className="review-count">
                  {course.totalReviews} {course.totalReviews === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              <p className="course-description">{course.description}</p>
              <Link to={`/course/${course._id}`} className="btn btn-primary">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;

