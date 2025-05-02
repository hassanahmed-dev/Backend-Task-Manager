const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
try {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary environment variables');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Cloudinary configuration error:', error.message);
  throw error;
}

// Helper for error responses
const sendError = (res, status, message, err) => {
  console.error(`Error: ${message}`, err);
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
};

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json(user);
  } catch (err) {
    sendError(res, 500, 'Server error fetching profile', err);
  }
});

// Update user profile
router.put('/update', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const fields = ['firstName', 'lastName', 'age', 'gender', 'phone', 'country', 'city', 'address', 'qualification'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save();
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json({ success: true, message: 'Profile updated', user: updatedUser });
  } catch (err) {
    sendError(res, 500, 'Server error updating profile', err);
  }
});

// Upload profile image
router.post('/upload-profile-image', auth, async (req, res) => {
  try {
    const { profileImage } = req.body;
    console.log('Received profileImage length:', profileImage?.length);

    if (!profileImage) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    console.log('Uploading to Cloudinary for user:', req.user.id);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(profileImage, {
      folder: `users/${req.user.id}`,
      public_id: `profile_${req.user.id}_${Date.now()}`,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [{ width: 200, height: 200, crop: 'fill' }],
    }).catch(err => {
      console.error('Cloudinary upload error:', err);
      throw new Error(`Cloudinary upload failed: ${err.message}`);
    });

    console.log('Cloudinary upload successful:', result.secure_url);

    user.profileImage = result.secure_url;
    await user.save().catch(err => {
      console.error('User save error:', err);
      throw new Error(`Failed to save user: ${err.message}`);
    });

    res.json({
      success: true,
      message: 'Profile image uploaded',
      imageUrl: result.secure_url,
      user: { ...user.toJSON(), password: undefined },
    });
  } catch (err) {
    sendError(res, 500, 'Server error uploading image', err);
  }
});

// Remove profile image
router.delete('/remove-profile-image', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.profileImage) {
      const publicId = user.profileImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`users/${req.user.id}/${publicId}`).catch(err => {
        console.error('Cloudinary delete error:', err);
        throw new Error(`Failed to delete image: ${err.message}`);
      });
      user.profileImage = null;
      await user.save().catch(err => {
        console.error('User save error:', err);
        throw new Error(`Failed to save user: ${err.message}`);
      });
    }

    res.json({
      success: true,
      message: 'Profile image removed',
      user: { ...user.toJSON(), password: undefined },
    });
  } catch (err) {
    sendError(res, 500, 'Server error removing image', err);
  }
});

module.exports = router;