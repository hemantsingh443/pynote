import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Test endpoint hit!');
  return res.status(200).json({
    message: 'Hello from Vercel!',
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });
}
