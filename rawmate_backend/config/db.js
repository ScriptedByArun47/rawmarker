// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://akisback049:kRQPOcjqInE2t5fT@cluster0.9quv2g9.mongodb.net/', {
      // useNewUrlParser: true, // Deprecated in Mongoose 6+
      // useUnifiedTopology: true, // Deprecated in Mongoose 6+
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;