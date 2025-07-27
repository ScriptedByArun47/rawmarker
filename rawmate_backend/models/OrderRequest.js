// models/OrderRequest.js
import mongoose from 'mongoose'; // Change 'require' to 'import'

const orderRequestSchema = new mongoose.Schema({
    vendorId: {
        type: String, // Referencing User's _id (which is a String)
        ref: 'User',
        required: true,
    },
    supplierId: {
        type: String, // Referencing User's _id (which is a String)
        ref: 'User',
        required: true,
    },
    productId: { // This could be a product name or a product ID from a supplier's catalog
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    notes: {
        type: String,
        default: '',
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
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update `updatedAt` field on save
orderRequestSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Use mongoose.model directly.
const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);

export default OrderRequest; // Change 'module.exports' to 'export default'