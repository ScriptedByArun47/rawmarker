// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { // Allow client to provide _id (e.g., UUID from frontend)
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
  },
  role: {
    type: String,
    enum: ['vendor', 'supplier'],
    required: true,
  },
  location: {
    type: String,
    trim: true,
    default: 'Unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
    // Disable automatic _id generation as we are providing it
    _id: false // Disable mongoose's default _id behavior
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;