import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Modules don't have __dirname by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable CORS
const allowCors = (fn: Function) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-V, Authorization'
  );
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  console.log('Request received:', { method: req.method, url: req.url, body: req.body });
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle JSON body
  let repoUrl: string;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    repoUrl = body.repoUrl;
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      console.log('Invalid repoUrl:', repoUrl);
      return res.status(400).json({ error: 'Missing or invalid repoUrl' });
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    console.log('Processing repository URL:', repoUrl);
    
    // Validate GitHub URL
    let githubUrl: URL;
    try {
      githubUrl = new URL(repoUrl);
      if (githubUrl.hostname !== 'github.com') {
        throw new Error('Only GitHub repositories are supported');
      }
    } catch (error) {
      console.error('Invalid GitHub URL:', error);
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }

    // Construct the direct download URL for the repository zip
    const repoPath = githubUrl.pathname.replace(/\.git$/, '');
    const repoName = repoPath.split('/').pop() || 'repository';
    const zipUrl = `https://api.github.com/repos${repoPath}/zipball/main`;
    
    console.log('Fetching repository zip from:', zipUrl);
    
    // Forward the request to GitHub API
    const response = await fetch(zipUrl, {
      headers: {
        'User-Agent': 'PyNote/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, response.statusText, errorText);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    try {
      // Get the zip file as a buffer
      const buffer = await response.buffer();
      console.log(`Downloaded ${buffer.length} bytes`);
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${repoName}.zip"`);
      res.setHeader('Content-Length', buffer.length);
      
      // Send the file
      console.log('Sending response with zip file');
      return res.status(200).send(buffer);
    } catch (error) {
      console.error('Error processing GitHub response:', error);
      throw new Error('Failed to process repository download');
    }
  } catch (error) {
    console.error('Error in handler:', error);
    const status = error instanceof Error && error.message.includes('GitHub API error') ? 502 : 500;
    return res.status(status).json({ 
      error: 'Failed to clone repository',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Export the CORS-wrapped handler
export default allowCors(handler);
