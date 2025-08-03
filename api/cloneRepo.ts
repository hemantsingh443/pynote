import { type NextApiRequest, type NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoUrl } = req.body;
  
  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid repoUrl' });
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
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Error cloning repository:', error);
    res.status(500).json({ 
      error: 'Failed to clone repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
