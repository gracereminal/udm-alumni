import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler, requestId, requireCustomHeader } from './middleware/common.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();
  // Behind Vercel's /api rewrite (and the host's proxy): read the client IP from X-Forwarded-For.
  app.set('trust proxy', config.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id, autoLogging: { ignore: (req) => req.url.endsWith('/health') } }));
  app.use(helmet());
  if (config.CORS_ORIGIN) {
    // Only when the API is called cross-origin; production goes through the same-origin Vercel rewrite.
    app.use((req, res, next) => {
      if (req.get('origin') === config.CORS_ORIGIN) {
        res.set({ 'Access-Control-Allow-Origin': config.CORS_ORIGIN, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' });
        if (req.method === 'OPTIONS') {
          res.set({ 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE', 'Access-Control-Allow-Headers': 'content-type,x-requested-with' });
          return res.sendStatus(204);
        }
      }
      next();
    });
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/v1', requireCustomHeader, authenticate, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
