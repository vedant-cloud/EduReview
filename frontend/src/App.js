import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import CourseList from './components/CourseList';
import CourseDetail from './components/CourseDetail';
import CreateCourse from './components/CreateCourse';
import EditCourse from './components/EditCourse';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// Configure axios to send credentials
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="container">
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/signup" element={!user ? <Signup onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={<CourseList user={user} />} />
            <Route path="/course/:id" element={<CourseDetail user={user} />} />
            <Route 
              path="/create-course" 
              element={user && user.role === 'professor' ? <CreateCourse user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/edit-course/:id" 
              element={user && user.role === 'professor' ? <EditCourse user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin" 
              element={user && user.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" />} 
            />
            <Route path="*" element={<div className="container"><h1>404 - Page Not Found</h1><p>The page you're looking for doesn't exist.</p></div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;


