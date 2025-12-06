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
import { scraperRouter } from './routes/scraper.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { handleWebSocket } from './websocket/handler.js';
import { ecScraperService } from './services/ec-scraper.js';
import { productStore } from './services/store.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('server');

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
app.use('/api/scraper', scraperRouter);
app.use('/api/knowledge', knowledgeRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket for real-time voice
wss.on('connection', handleWebSocket);

const PORT = process.env.PORT || 3000;

/**
 * 起動時に商品データを自動取得
 */
async function initializeProducts(): Promise<void> {
  const storeUrl = process.env.STORE_URL;
  const storeType = (process.env.STORE_TYPE || 'shopify') as 'shopify' | 'general_ec' | 'base' | 'custom';
  const maxProducts = parseInt(process.env.MAX_PRODUCTS || '50', 10);

  if (!storeUrl) {
    log.info('STORE_URL not set, skipping product initialization');
    return;
  }

  log.info('Initializing products', { url: storeUrl });

  try {
    // 既存の商品をクリア
    productStore.clear();

    // スクレイプジョブを作成・実行
    const job = ecScraperService.createJob({
      url: storeUrl,
      storeType,
      options: { maxProducts },
    });

    const result = await ecScraperService.executeJob(job.id);

    if (result.success) {
      log.info('Products loaded', {
        count: result.productsImported,
        priceRange: result.summary.priceRange,
      });
    } else {
      log.error('Failed to initialize products', { errors: result.errors });
    }
  } catch (error) {
    log.error('Product initialization error', { error });
  }
}

server.listen(PORT, () => {
  log.info('Server started', {
    port: PORT,
    widget: `http://localhost:${PORT}`,
    dashboard: `http://localhost:${PORT}/dashboard`,
  });

  // 商品データを初期化
  void initializeProducts();
});

export { app, server, wss };
