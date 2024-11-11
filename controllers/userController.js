// backend/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const ejs = require('ejs');
const path = require('path');
const crypto =require('crypto');

// Load environment variables from .env file
dotenv.config();

// Create a new user
exports.createUser = async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      }
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(400).json({ error: err.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ token, user: { username: user.username, email: user.email, id: user._id } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Add typing test progress (advanced features)
exports.addProgress = async (req, res) => {
  const { userId, wpm, cpm, accuracy, textUsed, difficulty, challengeType, category } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total words typed and time spent
    const totalWordsTyped = textUsed.split(' ').length;
    const testTime = wpm > 0 ? (totalWordsTyped / wpm) * 60 : 0;  // time = (total words / WPM) * 60

    // Create a new test entry
    const newTest = {
      wpm,
      cpm,
      accuracy,
      textUsed,
      difficulty,
      testDate: new Date(),
      challengeType,
      category,
      testDuration: testTime,
    };

    // Add the new test to the user's progress
    user.progress.push(newTest);

    // Update total stats (tests, words, time)
    user.totalTests += 1;
    user.totalWordsTyped += totalWordsTyped;
    user.totalTimeSpent += testTime;

    // Update the highest WPM if necessary
    if (wpm > user.highestWpm) {
      user.highestWpm = wpm;
    }

    // Update typing stats and save
    const testResult = {
      wpm,
      accuracy,
      testDuration: testTime,
    };

    // Update the user's typing stats based on the new test result
    await user.updateTypingStats(testResult);

    // Update the leaderboard (global/regional)
    await user.updateLeaderboards();

    // Adjust difficulty based on performance
    if (user.typingStats.avgWpm > 60 && difficulty !== 'hard') {
      user.typingStats.difficulty = 'hard';
    } else if (user.typingStats.avgWpm < 40 && difficulty !== 'easy') {
      user.typingStats.difficulty = 'easy';
    }

    // Save the updated user data
    await user.save();

    // Return the response
    res.status(200).json({
      message: 'Typing test progress added successfully!',
      user,
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const { userId } = req.params;
  const { username, firstName, lastName, age, gender, country, state, pincode } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username && user.username !== username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already in use' });
      }
      user.username = username;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (country) user.country = country;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully!',
      user,
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get best typing test (WPM, accuracy)
exports.getBestTypingTest = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user || !user.progress.length) {
      return res.status(404).json({ error: 'No typing tests found for this user' });
    }

    const bestTest = user.progress.reduce((best, test) => (test.wpm > best.wpm ? test : best), user.progress[0]);

    res.status(200).json(bestTest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all typing tests taken by a user
exports.getAllTests = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user || !user.progress.length) {
      return res.status(404).json({ error: 'No typing tests found for this user' });
    }

    res.status(200).json(user.progress);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get user data (profile and progress)
exports.getUserData = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Forgot Password function
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No user found with this email address' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Set reset token and expiration time (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Set up the email transporter using environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,  // Use email from .env
        pass: process.env.EMAIL_PASS,  // Use password from .env
      },
    });

    // Generate the reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('resetLink: ', resetLink);

    // Render the EJS template with the reset link and user data
    const htmlContent = await ejs.renderFile(path.join(__dirname, '../views', 'passwordReset.ejs'), {
      user: user,
      resetLink: resetLink,
    });
    
    // Send the email with the rendered HTML content
    const mailOptions = {
      from: process.env.EMAIL_USER,  // Sender's email from .env
      to: user.email,
      subject: 'Password Reset Request',
      html: htmlContent,  // Use the rendered HTML as the email body
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset email sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  try {
    // Find user by reset token and check if token is still valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token and expiration time
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};