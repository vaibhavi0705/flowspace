import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import cardRoutes from './routes/cards.js';
import { initSockets } from './sockets/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  const server = http.createServer(app);

  const origins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''));

  // Socket.io shares the same HTTP server and the same CORS allow-list as the REST API
  const io = new Server(server, { cors: { origin: origins } });
  app.set('io', io);
  app.set('trust proxy', 1); // behind Render's proxy, so rate limiting sees real client IPs

  app.use(helmet());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // Slow down brute-force attempts on login and register
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes' },
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/boards', boardRoutes);
  app.use('/api', listRoutes);
  app.use('/api', cardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  initSockets(io);
  return { app, server, io };
}
