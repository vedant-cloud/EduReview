// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

// Middleware to check if user is professor
exports.isProfessor = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'professor') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Professor role required.' });
};

// Middleware to check if user is student
exports.isStudent = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'student') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Student role required.' });
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin role required.' });
};


