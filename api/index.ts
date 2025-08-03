import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Root API endpoint hit!');
  return res.status(200).json({
    message: 'Root API endpoint',
    availableEndpoints: [
      '/api/test/hello',
      '/api/clone-repo'
    ],
    timestamp: new Date().toISOString()
  });
}
