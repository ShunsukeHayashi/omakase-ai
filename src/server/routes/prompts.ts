/**
 * Dynamic Prompt Router - プロンプト動的生成API
 */

import { Router } from 'express';
import {
  generateDynamicPrompt,
  generateStoreContextFromUrl,
  previewPrompt,
  type DynamicPromptConfig,
  type StoreContext,
  type EnabledFeatures,
} from '../services/prompt-generator.js';
import { scrapeProductsFromUrl } from '../services/scraper.js';
import { productStore } from '../services/store.js';
import { storeContextStore } from '../services/store-context.js';

export const promptsRouter = Router();

// Request body types
interface PromptGenerateInput {
  agentType?: string;
  agentName?: string;
  personality?: string;
  language?: 'Japanese' | 'English' | 'Korean';
  startMessage?: string;
  endMessage?: string;
  storeContext?: StoreContext;
  customRules?: string[];
  enabledFeatures?: EnabledFeatures;
}

interface UrlContextInput {
  url: string;
  maxProducts?: number;
}

interface StoreContextInput {
  storeName?: string;
  storeDescription?: string;
  storeUrl?: string;
  categories?: string[];
  brandVoice?: {
    tone: string;
    keywords: string[];
    avoidWords: string[];
  };
  policies?: {
    shipping?: string;
    returns?: string;
    support?: string;
  };
}

interface CustomRulesInput {
  rules: string[];
}

/**
 * POST /api/prompts/generate
 * 動的にプロンプトを生成
 */
promptsRouter.post('/generate', (req, res): void => {
  try {
    const body = req.body as PromptGenerateInput;
    const config: DynamicPromptConfig = {
      agentType: body.agentType || 'shopping-guide',
      agentName: body.agentName || 'アヤ',
      personality: body.personality || '明るく親しみやすい。お客様のニーズを理解することに長けている。',
      language: body.language || 'Japanese',
      startMessage: body.startMessage || 'こんにちは！本日はどのような商品をお探しですか？',
      endMessage: body.endMessage || 'ご利用ありがとうございました！',
      storeContext: body.storeContext || storeContextStore.get() || undefined,
      customRules: body.customRules,
      enabledFeatures: body.enabledFeatures || {
        productSearch: true,
        recommendations: true,
        priceComparison: false,
        inventoryCheck: false,
      },
    };

    const prompt = generateDynamicPrompt(config);

    res.json({
      success: true,
      prompt,
      config: {
        agentType: config.agentType,
        agentName: config.agentName,
        language: config.language,
        productCount: productStore.getAll().filter((p) => p.isActive).length,
      },
    });
  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({
      error: 'Failed to generate prompt',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts/preview
 * プロンプトのプレビューとStats取得
 */
promptsRouter.post('/preview', (req, res): void => {
  try {
    const body = req.body as PromptGenerateInput;
    const config: DynamicPromptConfig = {
      agentType: body.agentType || 'shopping-guide',
      agentName: body.agentName || 'アヤ',
      personality: body.personality || '明るく親しみやすい。',
      language: body.language || 'Japanese',
      startMessage: body.startMessage || 'こんにちは！',
      endMessage: body.endMessage || 'ありがとうございました！',
      storeContext: body.storeContext || storeContextStore.get() || undefined,
      customRules: body.customRules,
      enabledFeatures: body.enabledFeatures,
    };

    const result = previewPrompt(config);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Prompt preview error:', error);
    res.status(500).json({
      error: 'Failed to preview prompt',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts/from-url
 * URLから商品情報を取得してストアコンテキストを生成
 */
promptsRouter.post('/from-url', async (req, res): Promise<void> => {
  try {
    const body = req.body as UrlContextInput;
    const { url, maxProducts = 50 } = body;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    console.log(`Generating context from URL: ${url}`);

    // 1. URLからストアコンテキストを生成
    const storeContext = generateStoreContextFromUrl(url);

    // 2. 商品情報をスクレイピング
    const products = await scrapeProductsFromUrl(url, maxProducts);

    // 3. 商品をストアに追加
    productStore.clear();
    for (const product of products) {
      productStore.add(product);
    }

    // 4. ストアコンテキストを保存
    storeContextStore.set(storeContext);

    // 5. サンプルプロンプトを生成
    const sampleConfig: DynamicPromptConfig = {
      agentType: 'shopping-guide',
      agentName: 'アヤ',
      personality: '明るく親しみやすい。お客様のニーズを理解することに長けている。',
      language: 'Japanese',
      startMessage: `こんにちは！${storeContext.storeName}へようこそ。本日はどのような商品をお探しですか？`,
      endMessage: 'ご利用ありがとうございました！またのお越しをお待ちしております。',
      storeContext,
      enabledFeatures: {
        productSearch: true,
        recommendations: true,
        priceComparison: false,
        inventoryCheck: false,
      },
    };

    const preview = previewPrompt(sampleConfig);

    res.json({
      success: true,
      storeContext,
      productsCount: products.length,
      products: products.slice(0, 10), // 最初の10件のみ返す
      samplePrompt: preview,
    });
  } catch (error) {
    console.error('URL context generation error:', error);
    res.status(500).json({
      error: 'Failed to generate context from URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prompts/store-context
 * 現在のストアコンテキストを取得
 */
promptsRouter.get('/store-context', (_req, res): void => {
  res.json({
    success: true,
    storeContext: storeContextStore.get(),
    productCount: productStore.getAll().length,
  });
});

/**
 * PUT /api/prompts/store-context
 * ストアコンテキストを更新
 */
promptsRouter.put('/store-context', (req, res): void => {
  try {
    const body = req.body as StoreContextInput;
    const context: StoreContext = {
      storeName: body.storeName || 'My Store',
      storeDescription: body.storeDescription,
      storeUrl: body.storeUrl,
      categories: body.categories,
      brandVoice: body.brandVoice,
      policies: body.policies,
    };

    storeContextStore.set(context);

    res.json({
      success: true,
      storeContext: storeContextStore.get(),
    });
  } catch (error) {
    console.error('Store context update error:', error);
    res.status(500).json({
      error: 'Failed to update store context',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts/custom-rules
 * カスタムルールを追加
 */
promptsRouter.post('/custom-rules', (req, res): void => {
  try {
    const body = req.body as CustomRulesInput;
    const { rules } = body;

    if (!Array.isArray(rules)) {
      res.status(400).json({ error: 'rules must be an array of strings' });
      return;
    }

    // ルールを検証
    const validRules = rules.filter((r) => typeof r === 'string' && r.trim().length > 0);

    res.json({
      success: true,
      rules: validRules,
      count: validRules.length,
    });
  } catch (error) {
    console.error('Custom rules error:', error);
    res.status(500).json({
      error: 'Failed to process custom rules',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prompts/templates
 * 利用可能なプロンプトテンプレート一覧
 */
promptsRouter.get('/templates', (_req, res): void => {
  const templates = [
    {
      id: 'shopping-guide',
      name: 'Shopping Guide',
      nameJa: 'ショッピングガイド',
      description: 'ブランドセーフな挨拶、カタログ連携レコメンド',
      defaultPersonality: '明るく親しみやすい。お客様のニーズを理解することに長けている。',
    },
    {
      id: 'product-sales',
      name: 'Product Sales',
      nameJa: '商品販売スペシャリスト',
      description: '商品スペック、在庫、レビュー連携、アップセル',
      defaultPersonality: '商品知識が豊富。お客様に最適な選択肢を提案することに情熱を持つ。',
    },
    {
      id: 'faq-support',
      name: 'FAQ Support',
      nameJa: 'FAQサポート',
      description: 'ナレッジベースからFAQ即答、記事リンク',
      defaultPersonality: '冷静で的確。お客様の問題を素早く解決することを心がける。',
    },
    {
      id: 'omotenashi-advisor',
      name: 'Omotenashi Advisor',
      nameJa: 'おもてなしアドバイザー',
      description: '潜在ニーズを引き出し、素敵な出会いを提案',
      defaultPersonality: '物腰柔らかで聞き上手、共感力が高い。押し売りせず、共感から始めるスタイル。',
    },
  ];

  res.json({
    success: true,
    templates,
  });
});
