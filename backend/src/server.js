import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { pool } from './db/index.js';
import { createApp } from './app.js';

const server = createApp().listen(config.PORT, () => logger.info({ port: config.PORT, env: config.NODE_ENV }, 'UDM Alumni API listening'));

const shutdown = (signal) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10e3).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
