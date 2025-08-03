const fetch = require('node-fetch');

function logError(error, context = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: error.message,
    stack: error.stack,
    ...context
  }));
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let repoUrl;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    repoUrl = body.repoUrl;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid repoUrl' });
    }

    const githubUrl = new URL(repoUrl);
    if (githubUrl.hostname !== 'github.com') {
      throw new Error('Only GitHub repositories are supported');
    }

    const repoPath = githubUrl.pathname.replace(/\.git$/, '');
    const zipUrl = `https://api.github.com/repos${repoPath}/zipball/main`;

    const response = await fetch(zipUrl, { headers: { 'User-Agent': 'PyNote/1.0' } });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API error: ${response.statusText} - ${errorBody}`);
    }

    const buffer = await response.buffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${repoPath.split('/').pop() || 'repo'}.zip"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);

  } catch (error) {
    const errorId = `err_${Date.now()}`;
    logError(error, { errorId, repoUrl });

    res.status(500).json({
      error: 'Failed to clone repository',
      errorId,
      details: error.message || 'An unknown error occurred',
    });
  }
};

// Export the handler
module.exports = handler;

// Attach the config to the exported handler
module.exports.config = {
  runtime: 'nodejs',
};