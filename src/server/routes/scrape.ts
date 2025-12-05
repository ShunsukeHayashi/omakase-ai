/**
 * Site Scraping Router - データフィード自動取得
 */

import { Router } from 'express';
import { scrapeProductsFromUrl } from '../services/scraper.js';

export const scrapeRouter = Router();

// Request body types
interface ScrapeInput {
  url: string;
  maxProducts?: number;
}

// POST /api/scrape - URLから商品情報をスクレイピング
scrapeRouter.post('/', async (req, res): Promise<void> => {
  try {
    const body = req.body as ScrapeInput;
    const url = body.url;
    const maxProducts = body.maxProducts ?? 50;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const products = await scrapeProductsFromUrl(url, maxProducts);

    res.json({
      success: true,
      url,
      productsCount: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to scrape products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/scrape/status/:jobId - スクレイピング状況確認
scrapeRouter.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  // TODO: Implement job status tracking
  res.json({
    jobId,
    status: 'completed',
    message: 'Status tracking not yet implemented',
  });
});
