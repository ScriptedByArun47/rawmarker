// server.js (Full Code - NO AUTHENTICATION VERSION)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import database connection and models
const connectDB = require('./config/db');
const Group = require('./models/Group');
const JoinRequest = require('./models/JoinRequest');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User'); // User model is still needed for role/name/location
const OrderRequest = require('./models/OrderRequest'); // New OrderRequest model

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://127.0.0.1:5500", // Allow your frontend origin
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- MongoDB Connection ---
connectDB();

// --- Simplified User "Identification" (No traditional Auth) ---
// This endpoint is for the frontend to tell the backend who the "current user" is
// based on client-side UUID and input.
app.post('/api/user/identify', async (req, res) => {
    const { _id, name, email, role, location } = req.body; // _id is expected to be a client-generated UUID

    if (!_id || !name || !email || !role) {
        return res.status(400).json({ message: 'User ID, name, email, and role are required.' });
    }
    if (!['vendor', 'supplier'].includes(role)) {
        return res.status(400).json({ message: 'Role must be "vendor" or "supplier".' });
    }

    try {
        let user = await User.findById(_id);

        if (!user) {
            // Create a new user if the ID doesn't exist
            user = new User({
                _id,
                name,
                email,
                role,
                location: location || 'Unknown',
            });
            await user.save();
            return res.status(201).json({ message: 'User profile created.', user });
        } else {
            // Update existing user's details if they identify again (e.g., changed name or role)
            // Only update fields that are provided, but ensure role isn't changed if already set for a user.
            // For this 'no-auth' demo, we allow role changes for flexibility. In a real app, this would be restricted.
            user.name = name;
            user.email = email;
            user.role = role;
            user.location = location || user.location;
            await user.save();
            return res.status(200).json({ message: 'User profile updated.', user });
        }
    } catch (error) {
        console.error("Error identifying user:", error);
        res.status(500).json({ message: 'Server error during user identification', error: error.message });
    }
});


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGroupChat', async (groupId) => {
        socket.join(groupId);
        console.log(`Socket ${socket.id} joined group chat room: ${groupId}`);
        try {
            const messages = await ChatMessage.find({ groupId }).sort({ timestamp: 1 }).limit(50);
            socket.emit('chatHistory', messages);
        } catch (error) {
            console.error('Error fetching chat history:', error);
            socket.emit('chatError', 'Failed to load chat history.');
        }
    });

    socket.on('chatMessage', async ({ groupId, senderId, senderName, message }) => {
        // In this no-auth setup, senderId and senderName come from the client.
        // A real app would derive these from a token.
        try {
            const newChatMessage = new ChatMessage({
                groupId,
                senderId: senderId || 'anonymous',
                senderName: senderName || 'Anonymous',
                message,
            });
            const savedMessage = await newChatMessage.save();
            io.to(groupId).emit('groupChatMessage', {
                groupId: savedMessage.groupId,
                senderId: savedMessage.senderId,
                senderName: savedMessage.senderName,
                message: savedMessage.message,
                timestamp: savedMessage.timestamp,
                _id: savedMessage._id
            });
        } catch (error) {
            console.error('Error saving or broadcasting message:', error);
            socket.emit('chatError', 'Failed to send message.');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


// --- API Endpoints (NO JWT PROTECTION) ---
// All these routes now expect userId and userRole to be passed explicitly from the frontend.
// This is a SECURITY RISK for a real application.

// Create Group endpoint (Vendor only)
app.post('/api/groups', async (req, res) => {
    const { product, price, totalQuantity, minJoinQuantity, pickupPoint, userId, userRole } = req.body;
    if (userRole !== 'vendor') {
        return res.status(403).json({ message: 'Only vendors can create groups.' });
    }
    try {
        const newGroup = new Group({
            creatorId: userId,
            product,
            price,
            totalQuantity,
            minJoinQuantity,
            pickupPoint,
            joinedQuantity: 0,
        });
        const savedGroup = await newGroup.save();
        res.status(201).json(savedGroup);
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: 'Error creating group', error: error.message });
    }
});

// Get all groups endpoint (Accessible to all)
app.get('/api/groups', async (req, res) => {
    try {
        // Can add filtering by location from req.query if needed
        const groups = await Group.find({});
        res.json(groups);
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({ message: 'Error fetching groups', error: error.message });
    }
});

// Get user's created groups endpoint (Vendor only)
app.get('/api/groups/my/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const userGroups = await Group.find({ creatorId: userId });
        res.json(userGroups);
    } catch (error) {
        console.error("Error fetching my groups:", error);
        res.status(500).json({ message: 'Error fetching your groups', error: error.message });
    }
});

// Join Group Request endpoint (Vendor only)
app.post('/api/join-requests/:groupId/join', async (req, res) => {
    const { groupId } = req.params;
    const { quantity, userId, userRole } = req.body;
    if (userRole !== 'vendor') {
        return res.status(403).json({ message: 'Only vendors can join groups.' });
    }
    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found.' });
        }
        if (quantity < group.minJoinQuantity) {
            return res.status(400).json({ message: `Quantity must be at least ${group.minJoinQuantity} kg.` });
        }
        if (group.joinedQuantity + quantity > group.totalQuantity) {
             return res.status(400).json({ message: `Joining ${quantity} kg would exceed the group's total quantity of ${group.totalQuantity} kg.` });
        }
        if (group.creatorId.toString() === userId.toString()) {
            return res.status(400).json({ message: 'You cannot join a group you created.' });
        }

        const existingRequest = await JoinRequest.findOne({ groupId, userId, status: { $in: ['Pending', 'Accepted'] } });
        if (existingRequest) {
            return res.status(400).json({ message: 'You already have an active join request for this group.' });
        }

        const newJoinRequest = new JoinRequest({
            groupId: group._id,
            userId: userId,
            quantity: quantity,
            status: 'Pending',
        });
        await newJoinRequest.save();

        group.joinedQuantity += quantity;
        await group.save();

        res.status(200).json({ message: 'Join request submitted successfully.', product: group.product });
    } catch (error) {
        console.error("Error joining group:", error);
        res.status(500).json({ message: 'Error joining group', error: error.message });
    }
});


// --- SUPPLIER & ORDER REQUEST ENDPOINTS ---

// Get all suppliers (for vendors to browse)
app.get('/api/suppliers', async (req, res) => {
    try {
        // Only return suppliers (users with role 'supplier')
        const suppliers = await User.find({ role: 'supplier' }).select('-email -createdAt'); // Exclude sensitive/unnecessary fields
        res.json(suppliers);
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message });
    }
});

// Place an order request (Vendor only)
app.post('/api/order-requests', async (req, res) => {
    const { supplierId, productId, quantity, notes, userId, userRole } = req.body; // userId is the vendorId here
    if (userRole !== 'vendor') {
        return res.status(403).json({ message: 'Only vendors can create order requests.' });
    }
    if (!supplierId || !productId || !quantity || !userId) {
        return res.status(400).json({ message: 'Missing required fields for order request.' });
    }

    try {
        // Verify supplier exists and has the 'supplier' role
        const targetSupplier = await User.findById(supplierId);
        if (!targetSupplier || targetSupplier.role !== 'supplier') {
            return res.status(404).json({ message: 'Target supplier not found or is not a valid supplier.' });
        }

        const newOrderRequest = new OrderRequest({
            vendorId: userId, // The user making the request is the vendor
            supplierId,
            productId,
            quantity,
            notes,
            status: 'Pending',
        });
        await newOrderRequest.save();
        res.status(201).json({ message: 'Order request submitted successfully!', request: newOrderRequest });
    } catch (error) {
        console.error("Error creating order request:", error);
        res.status(500).json({ message: 'Failed to create order request', error: error.message });
    }
});

// Get all order requests for a specific supplier (Supplier Dashboard)
app.get('/api/supplier/order-requests/:supplierId', async (req, res) => {
    const { supplierId } = req.params;
    // User role check is done on the frontend. Backend assumes correct ID is passed.
    try {
        const requests = await OrderRequest.find({ supplierId: supplierId })
                                           .populate('vendorId', 'name email location') // Populate vendor details
                                           .sort({ createdAt: -1 }); // Latest first
        res.json(requests);
    } catch (error) {
        console.error("Error fetching supplier's order requests:", error);
        res.status(500).json({ message: 'Failed to fetch order requests', error: error.message });
    }
});

// Update order request status (Supplier only)
app.put('/api/supplier/order-requests/:requestId/status', async (req, res) => {
    const { requestId } = req.params;
    const { status, userId, userRole } = req.body; // userId is the supplierId here
    if (userRole !== 'supplier') {
        return res.status(403).json({ message: 'Only suppliers can update order request status.' });
    }
    if (!['Accepted', 'Declined'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided. Must be "Accepted" or "Declined".' });
    }

    try {
        // Ensure the request belongs to the current supplier (userId)
        const orderRequest = await OrderRequest.findOne({ _id: requestId, supplierId: userId });
        if (!orderRequest) {
            return res.status(404).json({ message: 'Order request not found or you are not authorized to modify it.' });
        }
        if (orderRequest.status !== 'Pending') {
            return res.status(400).json({ message: `Order request already ${orderRequest.status}. Cannot change a non-pending request.` });
        }

        orderRequest.status = status;
        await orderRequest.save();

        res.json({ message: `Order request status updated to ${status}.`, request: orderRequest });
    } catch (error) {
        console.error("Error updating order request status:", error);
        res.status(500).json({ message: 'Failed to update order request status', error: error.message });
    }
});

// Get all order requests placed by a specific vendor (Vendor's own requests)
app.get('/api/vendor/my-order-requests/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    try {
        const requests = await OrderRequest.find({ vendorId: vendorId })
                                           .populate('supplierId', 'name email location') // Populate supplier details
                                           .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching vendor's order requests:", error);
        res.status(500).json({ message: 'Failed to fetch your order requests', error: error.message });
    }
});


// Start the server (use server.listen instead of app.listen for Socket.IO)
server.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
});