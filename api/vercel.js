const app = require('./index');

// Vercel serverless function handler
module.exports = (req, res) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Use the Express app
  app(req, res);
};