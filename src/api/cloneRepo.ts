import { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';

export async function cloneRepo(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    // Read request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const { repoUrl } = body;
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing or invalid repoUrl' }));
      return;
    }

    // Validate GitHub URL
    const githubUrl = new URL(repoUrl);
    if (githubUrl.hostname !== 'github.com') {
      throw new Error('Only GitHub repositories are supported');
    }

    // Construct the direct download URL for the repository zip
    const repoPath = githubUrl.pathname.replace(/\.git$/, '');
    const zipUrl = `https://api.github.com/repos${repoPath}/zipball/main`;
    
    // Forward the request to GitHub API
    const response = await fetch(zipUrl, {
      headers: {
        'User-Agent': 'PyNote/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    // Get the zip file as a buffer
    const buffer = await response.buffer();
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${githubUrl.pathname.split('/').pop() || 'repo'}.zip"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send the file
    res.statusCode = 200;
    res.end(buffer);
  } catch (error) {
    console.error('Error cloning repository:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Failed to clone repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
