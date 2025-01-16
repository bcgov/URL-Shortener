// Import necessary libraries and plugins
import dayjs from 'dayjs'; // Utility for handling dates and times
import utc from 'dayjs/plugin/utc.js'; // Plugin to manage UTC dates
import timezone from 'dayjs/plugin/timezone.js'; // Plugin to manage timezones

import { UrlModel } from './db.js'; // MongoDB model for URL storage
import { generateRandomString } from './randomstring.js'; // Utility to generate random strings
import { authenticateMiddleware } from './auth.js'; // Middleware for user authentication

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to generate the next customId
const getNextCustomId = async () => {
  // Fetch the last document in the collection, sorted by customId
  const lastUrl = await UrlModel.findOne({}, {}, { sort: { customId: -1 } }).exec();
  // If no document exists, start from 1000
  return lastUrl ? lastUrl.customId + 1 : 1000;
};

// Function to shorten a URL
export const shortenUrl = [
  authenticateMiddleware, // Enforce authentication for this route
  async (req, res) => {
    const { targetUrl, description, expiryDate } = req.body; // Extract inputs from request body

    // Validate the inputs
    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }
    if (expiryDate && isNaN(Date.parse(expiryDate))) {
      return res.status(400).json({ error: 'Invalid expiryDate format' });
    }

    try {
      const createdTime = dayjs().utc().toDate(); // Get the current time in UTC
      const nextId = await getNextCustomId(); // Generate the next customId

      // Generate a unique short URL string
      let shortenedUrlString;
      do {
        shortenedUrlString = generateRandomString(6);
      } while (await UrlModel.exists({ shortenedUrlString })); // Ensure uniqueness

      // Convert expiryDate to UTC format if provided
      const expiryDateUTC = expiryDate ? dayjs(expiryDate).utc().toDate() : null;

      // Create a new document in the database
      const urlDocument = new UrlModel({
        targetUrl,
        description,
        expiryDate: expiryDateUTC,
        createdTime,
        shortenedUrlString,
        customId: nextId,
        createdBy: req.user ? req.user.idir_username : 'unknown', // Record the creator
        versions: [], // Initialize the version history
        updatedAt: null,
        editedBy: null,
      });

      await urlDocument.save(); // Save the document

      // Construct the full shortened URL
      const shortenedUrl = `${process.env.VANITY_URL}/${shortenedUrlString}`;

      // Respond with the shortened URL and customId
      res.json({ shortenedUrl, customId: nextId });
    } catch (error) {
      console.error('Error processing URL:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
];

// Function to update an existing URL
export const updateUrl = [
  authenticateMiddleware, // Enforce authentication for this route
  async (req, res) => {
    const { customId } = req.params; // Extract customId from route parameters
    const { targetUrl, expiryDate, description } = req.body; // Extract inputs from request body

    // Validate inputs
    if (expiryDate && isNaN(Date.parse(expiryDate))) {
      return res.status(400).json({ error: 'Invalid expiryDate format' });
    }

    try {
      // Find the existing document by customId
      const urlDocument = await UrlModel.findOne({ customId });

      if (!urlDocument) {
        return res.status(404).json({ error: 'URL not found' });
      }

      // Add the current state to the version history before updating
      urlDocument.versions.push({
        targetUrl: urlDocument.targetUrl,
        expiryDate: urlDocument.expiryDate,
        description: urlDocument.description,
        updatedAt: dayjs().utc().toDate(),
        editedBy: req.user ? req.user.idir_username : 'unknown',
      });

      // Update the fields with new values
      if (targetUrl) urlDocument.targetUrl = targetUrl;
      if (expiryDate) urlDocument.expiryDate = dayjs(expiryDate).utc().toDate();
      if (description) urlDocument.description = description;

      // Update metadata for the document
      urlDocument.updatedAt = dayjs().utc().toDate();
      urlDocument.editedBy = req.user ? req.user.idir_username : 'unknown';

      await urlDocument.save(); // Save the updated document

      res.json({ message: 'URL updated successfully', urlDocument });
    } catch (error) {
      console.error('Error updating URL:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
];

// Function to retrieve the version history of a URL
export const getHistory = [
  authenticateMiddleware,
  async (req, res) => {
    const { customId } = req.params;

    try {
      const urlDocument = await UrlModel.findOne({ customId });

      if (!urlDocument) {
        return res.status(404).json({ error: 'URL not found' });
      }

      // Convert timestamps in the version history to UTC
      const versions = urlDocument.versions.map((version) => ({
        ...version,
        updatedAt: version.updatedAt ? dayjs(version.updatedAt).utc().toISOString() : null,
      }));

      res.json({ versions });
    } catch (error) {
      console.error('Error fetching version history:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
];

export const handleRedirect = async (req, res) => {
  const { shortUrl } = req.params;

  // Validate that shortUrl is exactly 6 digits
  const shortUrlPattern = /^\d{6}$/;
  if (!shortUrl || !shortUrlPattern.test(shortUrl)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid URL</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: red; font-size: 24px; }
        </style>
      </head>
      <body>
        <h1 class="error">Invalid or Missing URL</h1>
        <p>The URL you requested is not valid. Please check the format or contact support.</p>
      </body>
      </html>
    `);
  }

  try {
    const urlDocument = await UrlModel.findOne({ shortenedUrlString: shortUrl });

    // Check if the URL exists in the database
    if (!urlDocument) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; font-size: 24px; }
          </style>
        </head>
        <body>
          <h1 class="error">This link does not exist.</h1>
          <p>Please check the URL or contact support for assistance.</p>
        </body>
        </html>
      `);
    }

    const currentDate = dayjs().utc();
    const expiryDate = urlDocument.expiryDate ? dayjs(urlDocument.expiryDate).utc() : null;

    // Check if the URL is expired
    if (expiryDate && currentDate.isAfter(expiryDate)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Expired</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: orange; font-size: 24px; }
          </style>
        </head>
        <body>
          <h1 class="error">This link has expired.</h1>
          <p>The link you are trying to access is no longer valid.</p>
        </body>
        </html>
      `);
    }


    // Redirect valid links with 307 Temporary Redirect
    return res.status(307).location(urlDocument.targetUrl).end();


  } catch (error) {
    console.error('Error handling redirect:', error.message);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Server Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: red; font-size: 24px; }
        </style>
      </head>
      <body>
        <h1 class="error">An unexpected error occurred.</h1>
        <p>Please try again later or contact support.</p>
      </body>
      </html>
    `);
  }
};

