/**
 * Knowledge Router - ナレッジ取り込みAPI
 * CSV, JSON, Shopify, URL からのインポートに対応
 */

import { Router } from 'express';
import multer from 'multer';
import {
  importFromCSV,
  importFromJSON,
  importFromShopify,
  importProgressStore,
  generateSampleFAQs,
  type JSONProductData,
  type ShopifyConfig,
} from '../services/knowledge-importer.js';
import { knowledgeStore } from '../services/knowledge.js';
import { productStore } from '../services/store.js';
import { storeContextStore } from '../services/store-context.js';
import { scrapeProductsFromUrl } from '../services/scraper.js';
import { generateStoreContextFromUrl, previewPrompt, type DynamicPromptConfig } from '../services/prompt-generator.js';

export const knowledgeRouter = Router();

// Multer設定（メモリストレージ、最大10MB）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ==================== Import APIs ====================

/**
 * POST /api/knowledge/import/csv
 * CSVファイルから商品をインポート
 */
knowledgeRouter.post('/import/csv', upload.single('file'), (req, res): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const clearExisting = (req.body as Record<string, unknown>).clearExisting === 'true';

    // インポート進捗を作成
    const progress = importProgressStore.create({
      type: 'csv',
      name: req.file.originalname,
    });

    // インポート実行
    const result = importFromCSV(csvContent, { clearExisting, progressId: progress.id });
    // eslint-disable-next-line no-console
    console.log(`CSV import completed: ${result.imported} products`);

    res.json({
      success: true,
      progressId: progress.id,
      message: 'Import started',
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('CSV import error:', error);
    res.status(500).json({
      error: 'Failed to import CSV',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/knowledge/import/json
 * JSONファイルから商品・FAQ・ストア情報をインポート
 */
knowledgeRouter.post('/import/json', upload.single('file'), (req, res): void => {
  try {
    let jsonData: JSONProductData;
    const body = req.body as Record<string, unknown>;

    if (req.file) {
      // ファイルアップロードの場合
      const content = req.file.buffer.toString('utf-8');
      jsonData = JSON.parse(content) as JSONProductData;
    } else if (body.data) {
      // リクエストボディの場合
      jsonData = typeof body.data === 'string' ? JSON.parse(body.data) as JSONProductData : body.data as JSONProductData;
    } else {
      res.status(400).json({ error: 'JSON file or data is required' });
      return;
    }

    const clearExisting = body.clearExisting === 'true' || body.clearExisting === true;

    // インポート進捗を作成
    const progress = importProgressStore.create({
      type: 'json',
      name: req.file?.originalname || 'JSON data',
    });

    // インポート実行
    const result = importFromJSON(jsonData, { clearExisting, progressId: progress.id });
    // eslint-disable-next-line no-console
    console.log(`JSON import completed: ${result.products} products, ${result.faqs} FAQs`);

    res.json({
      success: true,
      progressId: progress.id,
      message: 'Import started',
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('JSON import error:', error);
    res.status(500).json({
      error: 'Failed to import JSON',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/knowledge/import/shopify
 * Shopify APIから商品をインポート
 */
knowledgeRouter.post('/import/shopify', (req, res): void => {
  try {
    const { shopDomain, accessToken, apiVersion, clearExisting, limit } = req.body as {
      shopDomain?: string;
      accessToken?: string;
      apiVersion?: string;
      clearExisting?: boolean;
      limit?: number;
    };

    if (!shopDomain || !accessToken) {
      res.status(400).json({ error: 'shopDomain and accessToken are required' });
      return;
    }

    const config: ShopifyConfig = {
      shopDomain,
      accessToken,
      apiVersion,
    };

    // インポート進捗を作成
    const progress = importProgressStore.create({
      type: 'shopify',
      name: shopDomain,
    });

    // 非同期でインポート実行
    void importFromShopify(config, {
      clearExisting,
      progressId: progress.id,
      limit,
    }).then(result => {
      // eslint-disable-next-line no-console
      console.log(`Shopify import completed: ${result.imported} products`);
    });

    res.json({
      success: true,
      progressId: progress.id,
      message: 'Import started',
    });
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Shopify import error:', error);
    res.status(500).json({
      error: 'Failed to import from Shopify',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/knowledge/import/url
 * URLから商品情報をスクレイピング
 */
knowledgeRouter.post('/import/url', async (req, res): Promise<void> => {
  try {
    const { url, maxProducts = 50, clearExisting = false } = req.body as {
      url?: string;
      maxProducts?: number;
      clearExisting?: boolean;
    };

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // インポート進捗を作成
    const progress = importProgressStore.create({
      type: 'url',
      name: new URL(url).hostname,
    });

    importProgressStore.update(progress.id, { status: 'processing' });

    // 同期的に実行（スクレイピングは比較的早い）
    const storeContext = generateStoreContextFromUrl(url);
    const products = await scrapeProductsFromUrl(url, maxProducts);

    if (clearExisting) {
      productStore.clear();
    }

    let imported = 0;
    for (const product of products) {
      productStore.add(product);
      imported++;
    }

    storeContextStore.set(storeContext);

    // サンプルプロンプトを生成
    const sampleConfig: DynamicPromptConfig = {
      agentType: 'shopping-guide',
      agentName: 'アヤ',
      personality: '明るく親しみやすい。',
      language: 'Japanese',
      startMessage: `こんにちは！${storeContext.storeName}へようこそ。`,
      endMessage: 'ありがとうございました！',
      storeContext,
      enabledFeatures: {
        productSearch: true,
        recommendations: true,
        priceComparison: false,
        inventoryCheck: false,
      },
    };

    const preview = previewPrompt(sampleConfig);

    importProgressStore.update(progress.id, {
      status: 'completed',
      totalItems: products.length,
      processedItems: products.length,
      successItems: imported,
      completedAt: new Date(),
    });

    res.json({
      success: true,
      progressId: progress.id,
      storeContext,
      productsCount: imported,
      products: products.slice(0, 10),
      samplePrompt: preview,
    });
  } catch (error) {
    console.error('URL import error:', error);
    res.status(500).json({
      error: 'Failed to import from URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== Progress APIs ====================

/**
 * GET /api/knowledge/import/progress/:id
 * インポート進捗を取得
 */
knowledgeRouter.get('/import/progress/:id', (req, res): void => {
  const { id } = req.params;
  const progress = importProgressStore.get(id);

  if (!progress) {
    res.status(404).json({ error: 'Progress not found' });
    return;
  }

  res.json({ success: true, progress });
});

/**
 * GET /api/knowledge/import/history
 * インポート履歴を取得
 */
knowledgeRouter.get('/import/history', (req, res): void => {
  const limit = parseInt(req.query.limit as string) || 10;
  const history = importProgressStore.getRecent(limit);

  res.json({
    success: true,
    count: history.length,
    history,
  });
});

// ==================== FAQ APIs ====================

/**
 * GET /api/knowledge/faqs
 * 全FAQを取得
 */
knowledgeRouter.get('/faqs', (_req, res): void => {
  const faqs = knowledgeStore.getAllFAQs();
  res.json({
    success: true,
    count: faqs.length,
    faqs,
  });
});

/**
 * POST /api/knowledge/faqs
 * FAQを追加
 */
knowledgeRouter.post('/faqs', (req, res): void => {
  try {
    const { question, answer, category, keywords } = req.body as {
      question?: string;
      answer?: string;
      category?: string;
      keywords?: string[];
    };

    if (!question || !answer) {
      res.status(400).json({ error: 'question and answer are required' });
      return;
    }

    const faq = knowledgeStore.addFAQ({
      question,
      answer,
      category: category || '一般',
      keywords: keywords || [],
      isActive: true,
    });

    res.status(201).json({ success: true, faq });
  } catch (error) {
    console.error('FAQ creation error:', error);
    res.status(500).json({
      error: 'Failed to create FAQ',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/knowledge/faqs/generate
 * サンプルFAQを自動生成
 */
knowledgeRouter.post('/faqs/generate', (req, res): void => {
  try {
    const storeContext = storeContextStore.get();
    const sampleFAQs = generateSampleFAQs(storeContext || undefined);

    const added = sampleFAQs.map(faq => knowledgeStore.addFAQ(faq));

    res.json({
      success: true,
      count: added.length,
      faqs: added,
    });
  } catch (error) {
    console.error('FAQ generation error:', error);
    res.status(500).json({
      error: 'Failed to generate FAQs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/knowledge/faqs/search
 * FAQ検索
 */
knowledgeRouter.get('/faqs/search', (req, res): void => {
  const query = req.query.q as string;

  if (!query) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const results = knowledgeStore.searchFAQ(query);
  res.json({
    success: true,
    query,
    count: results.length,
    results,
  });
});

// ==================== Summary APIs ====================

/**
 * GET /api/knowledge/summary
 * ナレッジベースのサマリを取得
 */
knowledgeRouter.get('/summary', (_req, res): void => {
  const products = productStore.getAll();
  const faqs = knowledgeStore.getAllFAQs();
  const storeContext = storeContextStore.get();
  const recentImports = importProgressStore.getRecent(5);

  // カテゴリ別集計
  const faqCategories: Record<string, number> = {};
  for (const faq of faqs) {
    faqCategories[faq.category] = (faqCategories[faq.category] || 0) + 1;
  }

  // 価格統計
  const prices = products.filter(p => p.price > 0).map(p => p.price);
  const priceStats = prices.length > 0 ? {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
  } : null;

  res.json({
    success: true,
    summary: {
      store: {
        name: storeContext?.storeName || 'Not configured',
        url: storeContext?.storeUrl,
        categories: storeContext?.categories || [],
      },
      products: {
        total: products.length,
        active: products.filter(p => p.isActive).length,
        withImages: products.filter(p => p.imageUrl).length,
        priceStats,
      },
      faqs: {
        total: faqs.length,
        categories: faqCategories,
      },
      recentImports: recentImports.map(p => ({
        id: p.id,
        source: p.source,
        status: p.status,
        items: p.successItems,
        startedAt: p.startedAt,
      })),
    },
  });
});

/**
 * DELETE /api/knowledge/clear
 * 全データをクリア
 */
knowledgeRouter.delete('/clear', (req, res): void => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { products: clearProducts, faqs: _clearFaqs, storeContext: clearStore } = req.query as {
    products?: string;
    faqs?: string;
    storeContext?: string;
  };

  if (clearProducts === 'true') {
    productStore.clear();
  }

  // FAQクリアは現在未実装（必要に応じて追加）

  if (clearStore === 'true') {
    storeContextStore.set({ storeName: '' });
  }

  res.json({
    success: true,
    message: 'Data cleared',
  });
});
