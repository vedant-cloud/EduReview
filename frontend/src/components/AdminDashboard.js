import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState('mappings'); // 'mappings', 'students', 'professors'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, professorsRes, mappingsRes] = await Promise.all([
        axios.get('/api/admin/students'),
        axios.get('/api/admin/professors'),
        axios.get('/api/admin/mappings')
      ]);
      setStudents(studentsRes.data);
      setProfessors(professorsRes.data);
      setMappings(mappingsRes.data);
      setError('');
    } catch (error) {
      console.error('Admin dashboard error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
      setError(errorMessage);
      // If it's a 403 error, it means user is not admin
      if (error.response?.status === 403) {
        setError('Access denied. Admin role required. Please make sure you are logged in as admin.');
      } else if (error.response?.status === 401) {
        setError('Unauthorized. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedStudent || !selectedProfessor) {
      alert('Please select both a student and a professor');
      return;
    }

    try {
      await axios.post('/api/admin/mappings', {
        studentId: selectedStudent,
        professorId: selectedProfessor
      });
      setSelectedStudent('');
      setSelectedProfessor('');
      fetchData();
      alert('Mapping created successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create mapping');
    }
  };

  const handleDeleteMapping = async (mappingId) => {
    if (!window.confirm('Are you sure you want to delete this mapping?')) return;

    try {
      await axios.delete(`/api/admin/mappings/${mappingId}`);
      fetchData();
      alert('Mapping deleted successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete mapping');
    }
  };

  const handleChangePassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      await axios.put(`/api/admin/users/${userId}/password`, { newPassword });
      setEditingUser(null);
      setNewPassword('');
      alert('Password updated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update password');
    }
  };

  const handleDeleteUser = async (userId, username, role) => {
    if (!window.confirm(`Are you sure you want to delete ${role} "${username}"? This will also delete all their courses, reviews, and mappings. This action cannot be undone!`)) return;

    try {
      const response = await axios.delete(`/api/admin/users/${userId}`);
      fetchData();
      alert(response.data.message || 'User deleted successfully!');
    } catch (error) {
      console.error('Delete user error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="card">
          <h2>Access Denied</h2>
          <p>You must be logged in as an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      {error && (
        <div className="error" style={{ padding: '15px', marginBottom: '20px', background: '#fee', border: '1px solid #fcc', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
          <br />
          <small>Please check the browser console (F12) for more details.</small>
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'mappings' ? 'active' : ''} 
          onClick={() => setActiveTab('mappings')}
        >
          Mappings
        </button>
        <button 
          className={activeTab === 'students' ? 'active' : ''} 
          onClick={() => setActiveTab('students')}
        >
          Manage Students
        </button>
        <button 
          className={activeTab === 'professors' ? 'active' : ''} 
          onClick={() => setActiveTab('professors')}
        >
          Manage Professors
        </button>
      </div>

      {activeTab === 'mappings' && (
        <>

      <div className="mapping-section">
        <h2>Create New Mapping</h2>
        <div className="mapping-form">
          <div className="form-group">
            <label>Select Student:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">Choose a student...</option>
              {students.map(student => (
                <option key={student._id} value={student._id}>
                  {student.username} ({student.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Select Professor:</label>
            <select
              value={selectedProfessor}
              onChange={(e) => setSelectedProfessor(e.target.value)}
            >
              <option value="">Choose a professor...</option>
              {professors.map(professor => (
                <option key={professor._id} value={professor._id}>
                  {professor.username} ({professor.email})
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleCreateMapping} className="btn btn-primary">
            Create Mapping
          </button>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-number">{students.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Professors</h3>
          <p className="stat-number">{professors.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Mappings</h3>
          <p className="stat-number">{mappings.length}</p>
        </div>
      </div>

      <div className="mappings-list-section">
        <h2>Current Mappings</h2>
        {mappings.length === 0 ? (
          <div className="card">
            <p>No mappings yet. Create one above.</p>
          </div>
        ) : (
          <div className="mappings-table">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Professor</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(mapping => (
                  <tr key={mapping._id}>
                    <td>{mapping.student.username}</td>
                    <td>{mapping.student.email}</td>
                    <td>{mapping.professor.username}</td>
                    <td>{mapping.professor.email}</td>
                    <td>{new Date(mapping.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteMapping(mapping._id)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'students' && (
        <div className="user-management-section">
          <h2>Manage Students</h2>
          {students.length === 0 ? (
            <div className="card">
              <p>No students found.</p>
            </div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id}>
                      <td>{student.username}</td>
                      <td>{student.email}</td>
                      <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                      <td>
                        {editingUser === student._id ? (
                          <div className="password-change-form">
                            <input
                              type="password"
                              placeholder="New password (min 6 chars)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              style={{ padding: '5px', marginRight: '5px' }}
                            />
                            <button
                              onClick={() => handleChangePassword(student._id)}
                              className="btn btn-primary btn-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setNewPassword('');
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(student._id)}
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: '5px' }}
                            >
                              Change Password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(student._id, student.username, 'student')}
                              className="btn btn-danger btn-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'professors' && (
        <div className="user-management-section">
          <h2>Manage Professors</h2>
          {professors.length === 0 ? (
            <div className="card">
              <p>No professors found.</p>
            </div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {professors.map(professor => (
                    <tr key={professor._id}>
                      <td>{professor.username}</td>
                      <td>{professor.email}</td>
                      <td>{new Date(professor.createdAt).toLocaleDateString()}</td>
                      <td>
                        {editingUser === professor._id ? (
                          <div className="password-change-form">
                            <input
                              type="password"
                              placeholder="New password (min 6 chars)"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              style={{ padding: '5px', marginRight: '5px' }}
                            />
                            <button
                              onClick={() => handleChangePassword(professor._id)}
                              className="btn btn-primary btn-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setNewPassword('');
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(professor._id)}
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: '5px' }}
                            >
                              Change Password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(professor._id, professor.username, 'professor')}
                              className="btn btn-danger btn-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

