import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Course Feedback System - IIT (BHU) Varanasi
        </Link>
        <div className="navbar-menu">
          {user ? (
            <>
              <span className="navbar-user">Welcome, {user.username} ({user.role})</span>
              {user.role === 'admin' && (
                <Link to="/admin" className="navbar-link">
                  Admin Dashboard
                </Link>
              )}
              {user.role === 'professor' && (
                <Link to="/create-course" className="navbar-link">
                  Create Course
                </Link>
              )}
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/signup" className="navbar-link">Signup</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


