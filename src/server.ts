import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

function extractBearerToken(authHeader?: string | string[]): string | undefined {
  if (!authHeader) return undefined;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function getTokenFromHeaders(req: Request): string | undefined {
  return (
    (req.headers['x-auth-token'] as string | undefined) ||
    (req.headers['x-token'] as string | undefined) ||
    extractBearerToken(req.headers['authorization'])
  );
}

function decryptToken(token: string): unknown {
  const secret = process.env['TOKEN_SECRET_KEY'] ?? 'dev-secret-key';

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('::');

    if (parts.length !== 2) {
      throw new Error('Malformed token');
    }

    const [payloadJson, secretInToken] = parts;

    if (secretInToken !== secret) {
      throw new Error('Invalid secret');
    }

    const payload = JSON.parse(payloadJson);
    return payload;
  } catch (err) {
    console.error('Token decryption/validation failed:', err);
    throw err;
  }
}

app.get('/api/hello', (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Hi hello.' });
});

app.get('/', (req: Request, res: Response, next: NextFunction) => {
    console.log(req.headers);
  const token = getTokenFromHeaders(req);
  
  if (!token) {
    return res.redirect('/error');
  }

  try {
    const payload = decryptToken(token);
    console.log('Decrypted token payload:', payload);

    return res.redirect('/dashboard');
  } catch (error: any) {
    console.error('Token validation failed:', error);
    return res.redirect('/error');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
