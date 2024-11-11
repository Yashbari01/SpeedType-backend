// backend/app.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const connectDB = require('./config');
require('dotenv').config();

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Simple root route to verify server is running
app.get('/', (req, res) => {
    res.send('Server is up and running!');
  });

module.exports = app;
