const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout,
  getAllUsers,
  deleteUser
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private routes (require authentication)
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);
router.put('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

// Admin only routes
router.get('/users', authenticate, authorize('admin'), getAllUsers);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);

module.exports = router;