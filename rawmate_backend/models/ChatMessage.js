// models/ChatMessage.js
import mongoose from 'mongoose'; // Change 'require' to 'import'

const chatMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },
    senderId: {
        type: String, // To store the sender's User _id
        ref: 'User',
        required: true,
    },
    senderName: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

// Use mongoose.model directly. The check mongoose.models.ChatMessage is more typical for
// hot-reloading environments or when you might define the model multiple times,
// but for standard ES module exports, a direct model definition is common.
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage; // Change 'module.exports' to 'export default'