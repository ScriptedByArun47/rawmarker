// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  creatorId: {
    type: String, // Changed to String to match User._id
    ref: 'User',
    required: true,
  },
  product: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  minJoinQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  joinedQuantity: {
    type: Number,
    default: 0,
  },
  pickupPoint: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'Completed'],
    default: 'Open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

module.exports = Group;