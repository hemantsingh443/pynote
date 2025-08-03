// @ts-check
const { VercelRequest, VercelResponse } = require('@vercel/node');
const nodeFetch = require('node-fetch');

// Enable CORS for the function
const config = {
  runtime: 'nodejs',
};

// Helper function to log errors to Vercel's logging system
function logError(error, context = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  }));
}

async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  // Log the incoming request for debugging
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body ? JSON.stringify(req.body).substring(0, 500) : 'No body'
  });

  let repoUrl: string;
  try {
    // Parse the request body
    if (typeof req.body === 'string') {
      req.body = JSON.parse(req.body);
    }
    
    repoUrl = req.body.repoUrl;
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid repoUrl',
        received: typeof req.body === 'object' ? req.body : {}
      });
    }

  try {
    // Validate GitHub URL
    const githubUrl = new URL(repoUrl);
    if (githubUrl.hostname !== 'github.com') {
      throw new Error('Only GitHub repositories are supported');
    }

    // Construct the direct download URL for the repository zip
    const repoPath = githubUrl.pathname.replace(/\.git$/, '');
    const zipUrl = `https://api.github.com/repos${repoPath}/zipball/main`;
    
    // Forward the request to GitHub API
    const response = await nodeFetch(zipUrl, {
      headers: {
        'User-Agent': 'PyNote/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    // Get the zip file as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${githubUrl.pathname.split('/').pop() || 'repo'}.zip"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.status(200).send(buffer);
  } catch (error) {
    const errorId = `err_${Date.now()}`;
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { rawError: String(error) };
    
    // Log the full error details
    logError(error, {
      errorId,
      repoUrl,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body).substring(0, 1000) : 'No body'
      }
    });
    
    // Return a sanitized error response
    res.status(500).json({
      error: 'Failed to clone repository',
      errorId,
      details: errorDetails.message || 'An unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;