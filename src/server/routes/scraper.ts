/**
 * EC Scraper Router - 商品カタログ取り込みAPI
 */

import { Router } from 'express';
import { ecScraperService, type ScrapeJobConfig } from '../services/ec-scraper.js';

export const scraperRouter = Router();

// Request types
interface CreateJobRequest {
  url: string;
  storeType?: 'general_ec' | 'shopify' | 'base' | 'custom';
  options?: {
    extractVariants?: boolean;
    extractReviews?: boolean;
    maxProducts?: number;
    categoryFilter?: string;
  };
}

/**
 * POST /api/scraper/jobs - スクレイピングジョブを作成
 */
scraperRouter.post('/jobs', (req, res): void => {
  const body = req.body as CreateJobRequest;

  if (!body.url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  // URLバリデーション
  try {
    new URL(body.url);
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  const config: ScrapeJobConfig = {
    url: body.url,
    storeType: body.storeType || 'shopify',
    options: body.options,
  };

  const job = ecScraperService.createJob(config);

  res.status(201).json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      config: job.config,
      createdAt: job.createdAt,
    },
    message: 'Job created. Use POST /api/scraper/jobs/:id/execute to start.',
  });
});

/**
 * GET /api/scraper/jobs - 全ジョブ一覧
 */
scraperRouter.get('/jobs', (_req, res): void => {
  const jobs = ecScraperService.getAllJobs();

  res.json({
    success: true,
    count: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      url: job.config.url,
      productsImported: job.result?.productsImported,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })),
  });
});

/**
 * GET /api/scraper/jobs/:id - ジョブ詳細取得
 */
scraperRouter.get('/jobs/:id', (req, res): void => {
  const { id } = req.params;
  const job = ecScraperService.getJob(id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      config: job.config,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
});

/**
 * POST /api/scraper/jobs/:id/execute - ジョブを実行
 */
scraperRouter.post('/jobs/:id/execute', async (req, res): Promise<void> => {
  const { id } = req.params;
  const job = ecScraperService.getJob(id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status === 'running') {
    res.status(409).json({ error: 'Job is already running' });
    return;
  }

  if (job.status === 'completed') {
    res.status(409).json({ error: 'Job already completed', result: job.result });
    return;
  }

  try {
    // 非同期で実行
    const result = await ecScraperService.executeJob(id);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Job execution failed',
      details: String(error),
    });
  }
});

/**
 * POST /api/scraper/import - URLから直接インポート（ワンショット）
 */
scraperRouter.post('/import', async (req, res): Promise<void> => {
  const body = req.body as CreateJobRequest;

  if (!body.url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    new URL(body.url);
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  const config: ScrapeJobConfig = {
    url: body.url,
    storeType: body.storeType || 'shopify',
    options: body.options,
  };

  // ジョブ作成と即時実行
  const job = ecScraperService.createJob(config);

  try {
    const result = await ecScraperService.executeJob(job.id);

    res.json({
      success: result.success,
      jobId: job.id,
      productsExtracted: result.productsExtracted,
      productsImported: result.productsImported,
      summary: result.summary,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Import failed',
      details: String(error),
    });
  }
});

/**
 * DELETE /api/scraper/jobs - 全ジョブをクリア
 */
scraperRouter.delete('/jobs', (_req, res): void => {
  ecScraperService.clearJobs();
  res.json({ success: true, message: 'All jobs cleared' });
});
