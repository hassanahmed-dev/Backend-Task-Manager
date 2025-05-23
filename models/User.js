const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
    validate: {
      validator: function (v) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(v);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    },
  },
  firstName: {
    type: String,
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
  },
  lastName: {
    type: String,
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
  },
  age: {
    type: Number,
    min: [13, 'Age must be at least 13'],
    max: [120, 'Age must be less than 120'],
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s\+\-\(\)]{10,15}$/, 'Invalid phone format'],
  },
  country: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters'],
  },
  qualification: {
    type: String,
    trim: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Hash reset token before saving
userSchema.methods.hashResetToken = async function(token) {
  return await bcrypt.hash(token, 12);
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if the reset token is valid
userSchema.methods.isResetTokenValid = function(token) {
  return bcrypt.compare(token, this.resetPasswordToken) && Date.now() < this.resetPasswordExpire;
};

module.exports = mongoose.model('User', userSchema);
