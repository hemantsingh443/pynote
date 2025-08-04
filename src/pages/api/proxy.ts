//TODO:::

/*
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/*
 * A simple proxy API route to bypass CORS issues for client-side fetching.
 * It takes a `url` query parameter, fetches it on the server, and streams
 * the response back to the client.
 */  

/*
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
    });

    // Pipe the response stream directly to the client
    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);

  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch the requested URL' });
    }
  }
}
*/