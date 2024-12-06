// Import dotenv to manage environment variables
import dotenv from 'dotenv';
import express from 'express'; // Import the Express framework for building the server
import cors from 'cors'; // Import CORS middleware to enable cross-origin requests
import { setRoutes } from './routes.js'; // Import the function to set up application routes
import { authenticateMiddleware } from './auth.js'; // Import the authenticateMiddleware function for user validation
import rateLimit from 'express-rate-limit'; // Import the express-rate-limit package

// Load environment variables from the .env file into process.env
dotenv.config();

// Retrieve the backend URL from environment variables
const backendURL = process.env.BACKEND_URL;

// Initialize an Express application
const app = express();

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// Use CORS middleware to allow cross-origin requests
app.use(cors());

// Middleware to parse incoming JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handle favicon.ico requests to prevent unnecessary logs or errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No Content
});

// Health check route to ensure the backend is operational (No auth required)
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// Create a new Express router
const router = express.Router();

// Apply the rate limiter to all routes in the router
router.use(limiter);

// Apply authentication middleware to protected routes only
// All routes defined in `setRoutes` will now be protected by the authentication middleware
router.use(authenticateMiddleware);

// Set up your application routes
setRoutes(router);

// Use the router for all defined routes
app.use('/', router);

// Start the Express server and listen on port 3000
app.listen(3000, function () {
  console.log(`Listening at ${backendURL}`); // Log the backend URL to the console
  console.log('NODE_ENV:', process.env.NODE_ENV); // Log the current Node environment
});
