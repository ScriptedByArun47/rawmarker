// config/db.js
import mongoose from 'mongoose'; // Change 'require' to 'import'

const connectDB = async () => {
    try {
        // Ensure your MongoDB connection string is correct here
        const conn = await mongoose.connect('mongodb+srv://akisback049:kRQPOcjqInE2t5fT@cluster0.9quv2g9.mongodb.net/', {
            // These options are deprecated in Mongoose 6+ and can be removed
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`); // More specific error message
        process.exit(1); // Exit process with failure
    }
};

export default connectDB; // Change 'module.exports' to 'export default'