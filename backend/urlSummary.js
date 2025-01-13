import { UrlModel } from './db.js';
import { authenticateMiddleware, authenticate } from './auth.js'; // Import both authenticate function and middleware

export const getUrlSummary = [
  authenticateMiddleware, // Middleware to enforce authentication
  async (req, res) => {
    const customId = req.params.customId;

    try {
      // Query the database to get the URL details based on customId
      const urlDetails = await UrlModel.findOne({ customId });

      if (!urlDetails) {
        return res.status(404).json({ error: 'URL not found' });
      }

      // Construct the complete shortened URL
      const shortenedUrl = `${process.env.VANITY_URL}/${urlDetails.shortenedUrlString}`;

      // Send the URL details and shortened URL as a JSON response
      res.json({
        targetUrl: urlDetails.targetUrl,
        description: urlDetails.description,
        expiryDate: urlDetails.expiryDate,
        shortenedUrlString: urlDetails.shortenedUrlString,
        customId: urlDetails.customId,
        createdTime: urlDetails.createdTime,
        updatedAt: urlDetails.updatedAt || null, // Ensure updatedAt is included
        editedBy: urlDetails.editedBy || null, // Include editedBy, which will be null if not set
        createdBy: urlDetails.createdBy,
        shortenedUrl, // Include the complete shortened URL
      });

    } catch (error) {
      console.error('Error retrieving URL details:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
];
