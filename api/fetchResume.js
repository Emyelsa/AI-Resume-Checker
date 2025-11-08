// api/fetchResume.js - Vercel Serverless Function
const axios = require('axios');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Fetch the file from Firebase Storage
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    // Send it back to the frontend
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    res.status(200).send(Buffer.from(response.data));

  } catch (error) {
    console.error('Fetch resume error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
};