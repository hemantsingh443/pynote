import type { Plugin } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { cloneRepo } from './src/api/cloneRepo';

interface ApiRoute {
  method: string;
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

const apiRoutes: ApiRoute[] = [
  {
    method: 'POST',
    path: '/api/clone-repo',
    handler: cloneRepo
  }
];

export function apiPlugin(): Plugin {
  return {
    name: 'vite-plugin-api',
    configureServer(server) {
      const app = server.middlewares;
      
      // Handle API routes
      app.use(async (req, res, next) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const route = apiRoutes.find(
            r => r.method === req.method && r.path === url.pathname
          );

          if (route) {
            await route.handler(req, res);
          } else {
            next();
          }
        } catch (error) {
          console.error('API Error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
    }
  };
}
