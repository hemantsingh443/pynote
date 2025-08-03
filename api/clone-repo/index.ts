import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// Enable debug logging
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[clone-repo]', ...args);
const error = (...args: any[]) => console.error('[clone-repo]', ...args);

// Enable CORS
const allowCors = (fn: Function) => async (req: VercelRequest, res: VercelResponse) => {
  log('CORS middleware:', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-V, Authorization'
  );
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    log('Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  log('Request received:', { 
    method: req.method, 
    url: req.url, 
    headers: req.headers,
    body: req.body 
  });
  
  if (req.method !== 'POST') {
    const errorMsg = `Method not allowed: ${req.method}`;
    log(errorMsg);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  // Handle JSON body
  let repoUrl: string;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    repoUrl = body.repoUrl;
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      const errorMsg = `Invalid repoUrl: ${repoUrl}`;
      log(errorMsg);
      return res.status(400).json({ 
        error: 'Missing or invalid repoUrl',
        received: repoUrl
      });
    }
  } catch (error) {
    const errorMsg = 'Error parsing request body';
    log(errorMsg, error);
    return res.status(400).json({ 
      error: 'Invalid request body',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  try {
    log('Processing repository URL:', repoUrl);
    
    // Validate GitHub URL
    let githubUrl: URL;
    try {
      githubUrl = new URL(repoUrl);
      if (githubUrl.hostname !== 'github.com') {
        throw new Error('Only GitHub repositories are supported');
      }
    } catch (error) {
      const errorMsg = 'Invalid GitHub URL';
      log(errorMsg, error);
      return res.status(400).json({ 
        error: errorMsg,
        details: error instanceof Error ? error.message : 'Invalid URL format'
      });
    }

    // Construct the direct download URL for the repository zip
    const repoPath = githubUrl.pathname.replace(/\.git$/, '').replace(/^\/+/, '');
    const [owner, repo] = repoPath.split('/');
    const repoName = repo || 'repository';
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/main`;
    
    log('Fetching repository zip from:', zipUrl);
    
    try {
      // Forward the request to GitHub API
      const response = await fetch(zipUrl, {
        headers: {
          'User-Agent': 'PyNote/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `GitHub API error: ${response.status} ${response.statusText}`;
        error(errorMsg, { 
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        
        return res.status(502).json({
          error: 'Failed to fetch repository',
          details: errorMsg,
          status: response.status,
          statusText: response.statusText
        });
      }

      // Get the zip file as a buffer
      const buffer = await response.buffer();
      log(`Downloaded ${buffer.length} bytes`);
      
      // Set appropriate headers for file download
      const filename = `${repoName}-${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the file
      log(`Sending response with zip file: ${filename} (${buffer.length} bytes)`);
      return res.status(200).send(buffer);
      
    } catch (error) {
      const errorMsg = 'Error processing GitHub response';
      error(errorMsg, error);
      return res.status(500).json({
        error: 'Failed to process repository download',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
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
