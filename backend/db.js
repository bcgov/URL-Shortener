import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Determine MongoDB connection details based on environment

// Check if the environment is local
const isLocal = process.env.NODE_ENV === 'local';
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Is local environment: ${isLocal}`);

// Set MongoDB host based on environment variables
const mongodbHost = process.env.MONGODB_HOST;
const mongodbDatabase = process.env.MONGODB_DATABASE;
const mongodbPort = process.env.MONGODB_PORT;
console.log(`MongoDB Host: ${mongodbHost}`);
console.log(`MongoDB Database: ${mongodbDatabase}`);
console.log(`MongoDB Port: ${mongodbPort}`);

let mongoURL;

// Construct MongoDB connection URL
if (isLocal) {
  mongoURL = `mongodb://${mongodbHost}:${mongodbPort}/${mongodbDatabase}`;
  console.log(`Local MongoDB URL: ${mongoURL}`);
} else {
  if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
    const mongodbUser = process.env.MONGODB_USER;
    const mongodbPassword = process.env.MONGODB_PASSWORD;
    console.log(`MongoDB User: ${mongodbUser}`);
    mongoURL = `mongodb://${mongodbUser}:${mongodbPassword}@${mongodbHost}:${mongodbPort}/${mongodbDatabase}?authSource=admin`;
    console.log(`Non-local MongoDB URL: ${mongoURL}`);
  } else {
    console.error("MongoDB credentials are missing in the environment variables.");
    process.exit(1); // Exit if credentials are missing
  }
}

let connectionAttempts = 0;
const maxConnectionAttempts = 3;

// Function to connect to MongoDB with retry logic
async function connectToDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURL, {
      serverSelectionTimeoutMS: 30000, // Timeout for server selection
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    console.error('Full Error:', err);
    console.error('MongoDB URL:', mongoURL);
    connectionAttempts++;
    if (connectionAttempts < maxConnectionAttempts) {
      console.log(`Retrying connection in 5 seconds (Attempt ${connectionAttempts}/${maxConnectionAttempts})`);
      setTimeout(connectToDatabase, 5000); // Retry after 5 seconds
    } else {
      console.error(`Max connection attempts (${maxConnectionAttempts}) reached. Exiting process.`);
      process.exit(1); // Exit process after max attempts
    }
  }
}

// Initial connection attempt
connectToDatabase();

// Define schema for URL data
const urlSchema = new mongoose.Schema({
  targetUrl: { type: String, required: true },
  description: { type: String },
  expiryDate: { type: Date },
  shortenedUrlString: { type: String, unique: true },
  customId: { type: Number, unique: true, required: true, default: 999 },
  createdTime: { type: Date, default: Date.now },
  createdBy: { type: String }, // User who created the entry
  updatedAt: { type: Date, default: null }, // Set to null initially
  editedBy: { type: String, default: "" }, // Set to empty string initially
  versions: [
    {
      targetUrl: { type: String },
      expiryDate: { type: Date },
      description: { type: String },
      updatedAt: { type: Date, default: Date.now }, // Timestamp of the edit
      editedBy: { type: String }, // User who made the edit
    },
  ],
});

// Create model based on schema
export const UrlModel = mongoose.model('Url', urlSchema);
