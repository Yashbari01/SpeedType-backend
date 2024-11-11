// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createUser, 
  loginUser,
  addProgress, 
  getUserData, 
  updateProfile,
  getBestTypingTest, 
  getAllTests,
  forgotPassword,
  resetPassword,
} = require('../controllers/userController');

// Create a new user
router.post('/create', createUser);
router.post('/login', loginUser);

// Add typing test progress for a user
router.post('/progress', addProgress);

// Get a user's data (including progress)
router.get('/:userId', getUserData);

router.put('/:userId', updateProfile)

// Get the user's best typing test (highest WPM)
router.get('/:userId/bestTest', getBestTypingTest);

// Get all typing tests taken by a user
router.get('/:userId/allTests', getAllTests);

// Forgot Password Route
router.post('/forgot-password', forgotPassword);

// Reset Password Route
router.post('/reset-password/:token', resetPassword);

module.exports = router;

