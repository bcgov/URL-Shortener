// Import necessary functions for URL shortening, summary retrieval, and URL table management.
import { shortenUrl } from './urlShortener.js';
import { getUrlSummary } from './urlSummary.js';
import { getUrlTable } from './urlTable.js';
import { updateUrl, getHistory } from './urlShortener.js'; // Import new functions
import { handleRedirect, validateShortUrl } from './urlShortener.js'; // Import the new validation function
import RateLimit from 'express-rate-limit'; // Import the rate-limiting middleware for Express.

const authLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes duration for the rate limit.
  max: 100, // Allow a maximum of 100 requests within the 15-minute window.
});

// Rate limiter for general requests: maximum of 100 requests per 15 minutes
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes duration for the rate limit.
  max: 100, // Allow a maximum of 100 requests within the 15-minute window.
});

// Function to set up routes for the application
export const setRoutes = (router) => {
  // Route to create a URL
  router.post('/create', limiter, shortenUrl);

  // Route to retrieve URL details based on custom ID
  router.get('/url-summary/:customId', limiter, getUrlSummary);

  // Route to retrieve the table of URLs
  router.get('/urls', limiter, getUrlTable);

  // Route to update a URL based on customId
  router.put('/update-url/:customId', limiter, updateUrl);

  // Route to fetch the version history of a URL based on customId
  router.get('/url-history/:customId', limiter, getHistory);

  // Route to handle redirection for short URLs
  router.get('/redirect/:shortUrl', limiter, handleRedirect);

  // Route to validate a short URL without redirection
  router.get('/validate/:shortUrl', limiter, validateShortUrl);
};
