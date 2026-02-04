import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReviewForm from './ReviewForm';
import './CourseDetail.css';

const CourseDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState({});
  const [showReplyForm, setShowReplyForm] = useState({});
  const [hasReviewed, setHasReviewed] = useState(false);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    checkIfReviewed();
  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(`/api/courses/${id}`);
      setCourse(response.data.course);
      setReviews(response.data.reviews);
      setError('');
    } catch (error) {
      if (error.response?.status === 403) {
        setError(error.response.data.message || 'Access denied. You are not mapped to this professor.');
      } else if (error.response?.status === 401) {
        setError('Unauthorized. Please log in.');
      } else {
        setError(error.response?.data?.message || 'Failed to load course details');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkIfReviewed = async () => {
    if (!user || user.role !== 'student') {
      setHasReviewed(false);
      setCanReview(false);
      return;
    }
    try {
      const response = await axios.get(`/api/reviews/check/${id}`);
      setHasReviewed(response.data.hasReviewed);
      setCanReview(response.data.canReview || false);
      // If canReview is false, the student is not mapped to this professor
      if (response.data.canReview === false) {
        setError('You are not mapped to this professor. Only mapped students can review courses.');
      }
    } catch (error) {
      setHasReviewed(false);
      setCanReview(false);
    }
  };

  const handleReviewSubmit = () => {
    fetchCourseDetails();
    checkIfReviewed();
  };

  const handleReplySubmit = async (reviewId) => {
    try {
      const reply = replyText[reviewId];
      if (!reply) return;

      if (reviews.find(r => r._id === reviewId)?.professorReply) {
        // Update existing reply
        await axios.put(`/api/reviews/${reviewId}/reply`, { reply });
      } else {
        // Create new reply
        await axios.post(`/api/reviews/${reviewId}/reply`, { reply });
      }

      setShowReplyForm({ ...showReplyForm, [reviewId]: false });
      setReplyText({ ...replyText, [reviewId]: '' });
      fetchCourseDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit reply');
    }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      await axios.delete(`/api/courses/${id}`);
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete course');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <h1>Authentication Required</h1>
          <p className="welcome-message">
            Please log in or sign up to view course details.
          </p>
          <div className="welcome-actions">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/signup" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="error">Course not found</div>;
  }

  const isCourseOwner = user && user.role === 'professor' && course.professor._id === user._id;

  return (
    <div>
      <div className="course-detail-header">
        <h1>{course.name}</h1>
        <p className="professor-name">By: {course.professorName}</p>
        {isCourseOwner && (
          <div className="course-actions">
            <button onClick={() => navigate(`/edit-course/${id}`)} className="btn btn-secondary">
              Edit Course
            </button>
            <button onClick={handleDeleteCourse} className="btn btn-danger">
              Delete Course
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Description</h2>
        <p>{course.description}</p>
      </div>

      <div className="card">
        <h2>Course Content</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{course.content}</p>
      </div>

      <div className="card">
        <h2>Reviews ({reviews.length})</h2>
        {user && user.role === 'student' && canReview && !hasReviewed && (
          <ReviewForm courseId={id} onSubmit={handleReviewSubmit} />
        )}
        {user && user.role === 'student' && !canReview && (
          <p className="error">You are not mapped to this professor. Only mapped students can review courses.</p>
        )}
        {!user && (
          <p>Please <a href="/login">login</a> as a student to leave a review.</p>
        )}

        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div>
                    <strong>{review.student.username}</strong>
                    <div className="rating">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                  </div>
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="review-comment">{review.comment}</p>

                {review.professorReply && (
                  <div className="professor-reply">
                    <strong>Professor Reply:</strong>
                    <p>{review.professorReply}</p>
                  </div>
                )}

                {isCourseOwner && !review.professorReply && (
                  <div className="reply-section">
                    {!showReplyForm[review._id] ? (
                      <button
                        onClick={() => setShowReplyForm({ ...showReplyForm, [review._id]: true })}
                        className="btn btn-secondary"
                        style={{ marginTop: '10px' }}
                      >
                        Reply
                      </button>
                    ) : (
                      <div className="reply-form">
                        <textarea
                          value={replyText[review._id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                          placeholder="Write your reply..."
                          rows="3"
                          style={{ width: '100%', marginTop: '10px', padding: '10px' }}
                        />
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => handleReplySubmit(review._id)}
                            className="btn btn-primary"
                          >
                            Submit Reply
                          </button>
                          <button
                            onClick={() => {
                              setShowReplyForm({ ...showReplyForm, [review._id]: false });
                              setReplyText({ ...replyText, [review._id]: '' });
                            }}
                            className="btn btn-secondary"
                            style={{ marginLeft: '10px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isCourseOwner && review.professorReply && (
                  <div className="reply-section">
                    <button
                      onClick={() => setShowReplyForm({ ...showReplyForm, [review._id]: true })}
                      className="btn btn-secondary"
                      style={{ marginTop: '10px' }}
                    >
                      Edit Reply
                    </button>
                    {showReplyForm[review._id] && (
                      <div className="reply-form">
                        <textarea
                          value={replyText[review._id] || review.professorReply}
                          onChange={(e) => setReplyText({ ...replyText, [review._id]: e.target.value })}
                          rows="3"
                          style={{ width: '100%', marginTop: '10px', padding: '10px' }}
                        />
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => handleReplySubmit(review._id)}
                            className="btn btn-primary"
                          >
                            Update Reply
                          </button>
                          <button
                            onClick={() => {
                              setShowReplyForm({ ...showReplyForm, [review._id]: false });
                              setReplyText({ ...replyText, [review._id]: '' });
                            }}
                            className="btn btn-secondary"
                            style={{ marginLeft: '10px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;

