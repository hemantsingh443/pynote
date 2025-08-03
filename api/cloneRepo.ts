import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid repoUrl in request body' });
  }

  try {
    const githubUrl = new URL(repoUrl);
    if (githubUrl.hostname !== 'github.com') {
      return res.status(400).json({ error: 'Invalid repoUrl: Only github.com repositories are supported.' });
    }

    const repoPath = githubUrl.pathname.replace(/\.git$/, '');
    const zipUrl = `https://api.github.com/repos${repoPath}/zipball/main`;

    const githubResponse = await fetch(zipUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PyNote-Vercel-Proxy',
      },
    });

    if (!githubResponse.ok || !githubResponse.body) {
      const errorBody = await githubResponse.text();
      console.error('GitHub API Error:', errorBody);
      return res.status(githubResponse.status).send(`Failed to fetch repository from GitHub: ${errorBody}`);
    }

    const disposition = githubResponse.headers.get('content-disposition');
    let filename = 'repository.zip';
    if (disposition && disposition.includes('filename=')) {
      const filenameMatch = /filename=([^;]+)/.exec(disposition);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/"/g, '');
      }
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    githubResponse.body.pipe(res);

  } catch (error) {
    console.error('Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
