// Import dotenv to manage environment variables
import dotenv from 'dotenv';
import express from 'express'; // Import the Express framework for building the server
import cors from 'cors'; // Import CORS middleware to enable cross-origin requests
import { setRoutes } from './routes.js'; // Import the function to set up application routes
import { authenticateMiddleware } from './auth.js'; // Import the authenticateMiddleware function for user validation
import rateLimit from 'express-rate-limit'; // Import the express-rate-limit package

// Load environment variables from the .env file into process.env
dotenv.config();

// Validate essential environment variables
const { BACKEND_URL, FRONTEND_URL, VANITY_URL } = process.env;
if (!BACKEND_URL || !FRONTEND_URL || !VANITY_URL) {
  console.error('Missing required environment variables: BACKEND_URL, FRONTEND_URL, or VANITY_URL');
  process.exit(1);
}

// Initialize an Express application
const app = express();

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// Use CORS middleware to allow cross-origin requests only from the configured FRONTEND_URL and VANITY_URL
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [FRONTEND_URL, VANITY_URL];
      if (!origin || allowedOrigins.includes(origin)) {
        console.log(`CORS allowed for origin: ${origin || 'null (same-origin or script)'}`);
        callback(null, true); // Allow the origin
      } else {
        console.error(`Blocked by CORS: Origin ${origin} is not allowed`);
        callback(new Error('Not allowed by CORS')); // Deny the origin
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include necessary HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Include necessary headers
    credentials: true, // Include credentials if needed
  })
);


// Ensure preflight requests are handled properly
app.options('*', cors());

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

// Apply authentication middleware selectively
router.use((req, res, next) => {
  // Allow unauthenticated access for:
  // - Short URLs (e.g., /552435)
  // - Validation routes (e.g., /validate/:shortUrl)
  if (/^\/[a-zA-Z0-9]{6}$/.test(req.path) || req.path.startsWith('/validate/')) {
    console.log(`Unauthenticated route accessed: ${req.path}`);
    return next();
  }
  // Apply authentication for all other routes
  authenticateMiddleware(req, res, next);
});

// Set up your application routes
setRoutes(router);

// Use the router for all defined routes
app.use('/', router);

// Start the Express server and listen on port 3000
app.listen(3000, function () {
  console.log(`Listening at ${BACKEND_URL}`); // Log the backend URL to the console
  console.log(`Allowed frontend URL: ${FRONTEND_URL}`); // Log the frontend URL for debugging
  console.log(`Allowed vanity URL: ${VANITY_URL}`); // Log the vanity URL for debugging
  console.log('NODE_ENV:', process.env.NODE_ENV); // Log the current Node environment
});
