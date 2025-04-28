const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      phone,
      country,
      city,
      address,
      qualification
    } = req.body;

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
    if (city !== undefined) user.city = city;
    if (address !== undefined) user.address = address;
    if (qualification !== undefined) user.qualification = qualification;

    await user.save();

    // Return user without password
    const updatedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No image file provided" 
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // The file name is saved by multer middleware
    const imageFileName = req.file.filename;
    
    // Update user's profileImage field with the filename
    user.profileImage = imageFileName;
    await user.save();

    // Return success with the image URL
    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      imageUrl: `/api/user/uploads/${imageFileName}`,
      user: {
        ...user.toJSON(),
        password: undefined
      }
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while uploading profile image",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove profile image
const removeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // If user has a profile image, delete it from the server
    if (user.profileImage) {
      const uploadDir = path.join(__dirname, '../uploads');
      const imagePath = path.join(uploadDir, user.profileImage);
      
      // Delete file if it exists
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      
      // Set profileImage to null in database
      user.profileImage = null;
      await user.save();
    }

    // Return success with updated user
    return res.status(200).json({
      success: true,
      message: "Profile image removed successfully",
      user: {
        ...user.toJSON(),
        password: undefined
      }
    });
  } catch (error) {
    console.error("Error removing profile image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while removing profile image",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  updateUserProfile,
  uploadProfileImage,
  removeProfileImage
}; 