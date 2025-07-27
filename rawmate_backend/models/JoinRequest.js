// models/JoinRequest.js
const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  userId: {
    type: String, // Changed to String to match User._id
    ref: 'User',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const JoinRequest = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema);

module.exports = JoinRequest;