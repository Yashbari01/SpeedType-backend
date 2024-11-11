// backend/models/User.js
const mongoose = require('mongoose');

// Enhanced Typing Test Schema
const typingTestSchema = new mongoose.Schema({
  wpm: { type: Number, required: true },    // Words per minute
  cpm: { type: Number, required: true },    // Characters per minute
  accuracy: { type: Number, required: true }, // Accuracy as a percentage
  testDate: { type: Date, default: Date.now }, // Timestamp of the test
  textUsed: { type: String, required: true }, // The text or passage typed in the test
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }, // Difficulty level
  errors: { type: Array, default: [] },      // Track specific errors made during the test (e.g., incorrect words typed)
  testDuration: { type: Number, default: 60 }, // Duration of the test in seconds (e.g., 60s, 120s)
  challengeType: { type: String, enum: ['time', 'accuracy', 'combo'], default: 'time' }, // Type of challenge (time-based, accuracy-focused, combo)
  category: { type: String, enum: ['general', 'coding', 'quotes', 'random'], default: 'general' }, // Category of typing test
  averageSpeed: { type: Number },           // Used for adaptive difficulty (average WPM)
});

// User Schema with additional features for progress tracking
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, min: 0 },
  gender: { type: String },
  country: { type: String },
  state: { type: String },
  pincode: { type: Number },
  emailVerified: { type: Boolean, default: false }, // Email verification status
  failedLoginAttempts: { type: Number, default: 0 }, // Counter for failed login attempts
  lockUntil: { type: Number }, // Time until account is locked due to failed attempts
  progress: [typingTestSchema],  // Array of typing test results
  highestWpm: { type: Number, default: 0 }, // Store highest WPM
  totalTests: { type: Number, default: 0 },  // Total tests taken by the user
  totalWordsTyped: { type: Number, default: 0 }, // Total words typed by the user across tests
  totalTimeSpent: { type: Number, default: 0 }, // Total time spent in tests (in seconds)
  resetPasswordToken: String,       // Store the reset token
  resetPasswordExpires: Date,       // Store token expiration time
  lastLogin: { type: Date },         // Timestamp of last login
  lastTest: { type: Date },          // Timestamp of the last completed typing test
  typingStats: {
    avgWpm: { type: Number, default: 0 }, // Average WPM of all tests
    accuracy: { type: Number, default: 0 }, // Average accuracy percentage of all tests
    testsCompleted: { type: Number, default: 0 }, // Total number of tests completed
    bestAccuracy: { type: Number, default: 0 },  // Best accuracy score
    bestSpeed: { type: Number, default: 0 },     // Best speed (WPM)
  },
  leaderboards: {
    global: { type: Number, default: 0 }, // Global leaderboard score
    regional: { type: Number, default: 0 }, // Regional leaderboard score
  },
});

// Method to update stats based on completed test
userSchema.methods.updateTypingStats = async function(testResult) {
  const { wpm, accuracy, testDuration } = testResult;

  // Update typing stats
  const totalTests = this.typingStats.testsCompleted + 1;
  const avgWpm = ((this.typingStats.avgWpm * this.typingStats.testsCompleted) + wpm) / totalTests;
  const avgAccuracy = ((this.typingStats.accuracy * this.typingStats.testsCompleted) + accuracy) / totalTests;

  this.typingStats.avgWpm = avgWpm;
  this.typingStats.accuracy = avgAccuracy;
  this.typingStats.testsCompleted = totalTests;

  // Update highest WPM and accuracy if needed
  if (wpm > this.highestWpm) {
    this.highestWpm = wpm;
  }
  if (accuracy > this.typingStats.bestAccuracy) {
    this.typingStats.bestAccuracy = accuracy;
  }

  // Save the updated stats to the database
  await this.save();
};

// Update leaderboards
userSchema.methods.updateLeaderboards = async function() {
  // Example logic to update global and regional leaderboards
  // In a real implementation, this should query a leaderboard system
  const globalScore = this.typingStats.avgWpm; 
  const regionalScore = this.typingStats.avgWpm; // This would ideally be based on the user's region
  
  this.leaderboards.global = globalScore;
  this.leaderboards.regional = regionalScore;
  
  // Save leaderboard updates
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
