const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Check for JWT_SECRET and provide a fallback for development
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not defined in environment variables');
  process.env.JWT_SECRET = 'fallback_development_secret_key_do_not_use_in_production';
}

// Signup - no authentication middleware
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide all required fields' 
      });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        error: 'User already exists with this email' 
      });
    }  

    const user = await User.create({ username, email, password });
    
    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create user response without sensitive data
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      profileImage: user.profileImage || '',
      age: user.age || '',
      gender: user.gender || '',
      phone: user.phone || '',
      country: user.country || '',
      city: user.city || '',
      qualification: user.qualification || '',
      address: user.address || ''
    };

    res.status(201).json({ 
      success: true, 
      token,
      user: userResponse 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: process.env.NODE_ENV === 'development' ? err.message : null 
    });
  }
});

// Login - no authentication middleware
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide email and password' 
      });
    }
    
    // Fetch user with password for authentication
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create user response without sensitive data
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      profileImage: user.profileImage || '',
      age: user.age || '',
      gender: user.gender || '',
      phone: user.phone || '',
      country: user.country || '',
      city: user.city || '',
      qualification: user.qualification || '',
      address: user.address || ''
    };

    res.json({ 
      success: true, 
      token,
      user: userResponse 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? err.message : null 
    });
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // .env se Gmail address
    pass: process.env.EMAIL_PASS        // .env se App Password
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log("Transporter Error:", error);
  } else {
    console.log("Transporter is ready to send messages");
  }
});


// Forgot Password - no authentication middleware
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'No user found with this email address.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expire time (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Try sending the email separately
    try {
      await transporter.sendMail({
        from: `"Task Manager" <${process.env.EMAIL_USER}>`,
        to: "technicalhasankhan.1@gmail.com",
        subject: "Reset Your Password",
        html: `
          <h3>Reset your password</h3>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 10 minutes.</p>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email.'
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong. Please try again.' 
    });
  }
});


// Reset Password - no authentication middleware
router.post('/reset-password/:token', async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired token. Please request a new password reset link.' 
      });
    }
    
    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    res.status(200).json({ 
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.' 
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong. Please try again.' 
    });
  }
});

module.exports = router;

