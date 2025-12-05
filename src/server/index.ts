/**
 * Omakase AI - Express Server with WebSocket support
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeRouter } from './routes/scrape.js';
import { voiceRouter } from './routes/voice.js';
import { productsRouter } from './routes/products.js';
import { agentsRouter } from './routes/agents.js';
import { promptsRouter } from './routes/prompts.js';
import { handleWebSocket } from './websocket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../../public')));

// API Routes
app.use('/api/scrape', scrapeRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/products', productsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/prompts', promptsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket for real-time voice
wss.on('connection', handleWebSocket);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Omakase AI server running on port ${PORT}`);
  console.log(`Widget: http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});

export { app, server, wss };
