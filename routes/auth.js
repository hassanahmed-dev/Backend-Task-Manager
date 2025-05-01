const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();
const nodemailer = require('nodemailer');


// Configure Nodemailer with environment variables
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: 'smtp.gmail.com', // Manually specifying the Gmail SMTP server
  port: 465, // SSL connection port (for Gmail)
  secure: true, // true for SSL, false for TLS
  auth: {
    user: "technicalhassankhan.1@gmail.com", // Your email address
    pass: "ekwo bofb hfpr ntss", // Your Gmail App Password or SMTP password
  },
});

// Signup - no authentication middleware
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email',
      });
    }

    const user = await User.create({ username, email, password });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      address: user.address || '',
    };

    res.status(201).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: process.env.NODE_ENV === 'development' ? err.message : null,
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
        error: 'Please provide email and password',
      });
    }

    // Fetch user with password for authentication
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      address: user.address || '',
    };

    res.json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: process.env.NODE_ENV === 'development' ? err.message : null,
    });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user found with this email' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await user.hashResetToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: "technicalhassankhan.1@gmail.com",
      to: user.email,
      subject: 'Password Reset Request',
      html:`<!DOCTYPE html>
      <html lang="en" >
      <head>
        <meta charset="UTF-8">
        <title>Hassan Ahmed Management Solution - Reset Password</title>
        
      
      </head>
      <body>
      <!-- partial:index.partial.html -->
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
        <div style="margin:50px auto;width:70%;padding:20px 0">
          <div style="border-bottom:1px solid #eee">
            <a href="" style="font-size:1.4em;color: #001529;text-decoration:none;font-weight:600">Hassan Ahmed Management Solution</a>
          </div>
          <p style="font-size:1.1em">Hi,</p>
          <p>Thank you for choosing Hassan Ahmed Management Solution. Use the following link to Reset your Password Recovery Procedure. Link is valid for 1 hour.</p>
          <h2 style="background: #001529;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${resetUrl}</h2>
          <p style="font-size:0.9em;">Regards,<br />Hassan Ahmed Management Soluion</p>
          <hr style="border:none;border-top:1px solid #eee" />
          <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          </div>
        </div>
      </div>
      <!-- partial -->
        
      </body>
      </html>`,
    };
  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully');

  res.status(200).json({ message: 'Password reset link sent to your email' });
} catch (err) {
  console.error('Error in forgot-password:', err);
  res.status(500).json({ message: 'Server error' });
}
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find users whose token has not expired
    const users = await User.find({ resetPasswordExpire: { $gt: Date.now() } });

    // Manually check token match
    let validUser = null;
    for (const user of users) {
      const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
      if (isMatch) {
        validUser = user;
        break;
      }
    }

    if (!validUser) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password and clear token fields
    validUser.password = password;
    validUser.resetPasswordToken = undefined;
    validUser.resetPasswordExpire = undefined;
    await validUser.save();

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
