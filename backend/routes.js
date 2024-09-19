import { UrlModel } from './db.js';
import { checkAuthenticated, handleAuthCallback, renderHomePage, initiateAuth, renderHomePageAfterAuth, handleUserLogout } from './auth.js';
import { shortenUrl } from './urlShortener.js';
import { getUrlSummary } from './urlSummary.js';
import { getUrlTable } from './urlTable.js';
import RateLimit from 'express-rate-limit';

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});
export const setRoutes = (router) => {
  // Add routes related to authentication using the exported functions
  router.get('/auth/callback', handleAuthCallback);
  router.get('/', renderHomePage);
  router.get('/auth', initiateAuth);
  router.get('/home', checkAuthenticated, renderHomePageAfterAuth);
  router.get('/logout', handleUserLogout);
  // Route to shorten a URL
  router.post('/shorten', shortenUrl);
  // Route to retrieve URL details based on custom ID
  router.get('/url-summary/:customId', getUrlSummary);
  // Route to retrieve the table of URLs
  router.get('/urls', limiter, getUrlTable);

// ... (other routes)
};
