export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    const zipUrl = `${repoUrl}/archive/refs/heads/main.zip`;
    
    // Forward the request to GitHub
    const response = await fetch(zipUrl, {
      headers: {
        'User-Agent': 'PyNote/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub error: ${response.statusText}`);
    }

    // Get the zip file as array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for JSON transport
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    // Return the base64 encoded zip data
    res.status(200).json({ 
      success: true,
      data: base64Data,
      filename: `${githubUrl.pathname.split('/').pop() || 'repo'}.zip`
    });
  } catch (error) {
    console.error('Error cloning repository:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to clone repository'
    });
  }
}
