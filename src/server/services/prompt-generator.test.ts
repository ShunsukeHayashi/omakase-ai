/**
 * Prompt Generator Unit Tests
 */

import {
  generateDynamicPrompt,
  generateStoreContextFromUrl,
  previewPrompt,
  type DynamicPromptConfig,
  type StoreContext,
} from './prompt-generator.js';
import { productStore } from './store.js';

describe('PromptGenerator', () => {
  const baseConfig: DynamicPromptConfig = {
    agentType: 'shopping-guide',
    agentName: 'テストアシスタント',
    personality: 'フレンドリーで親切なアシスタント',
    language: 'Japanese',
    startMessage: 'いらっしゃいませ！',
    endMessage: 'ありがとうございました！',
  };

  beforeEach(() => {
    productStore.clear();
  });

  describe('generateDynamicPrompt', () => {
    it('should generate prompt with basic config', () => {
      const prompt = generateDynamicPrompt(baseConfig);

      expect(prompt).toContain('テストアシスタント');
      expect(prompt).toContain('フレンドリーで親切なアシスタント');
      expect(prompt).toContain('いらっしゃいませ');
      expect(prompt).toContain('ありがとうございました');
    });

    it('should include Japanese language instructions', () => {
      const prompt = generateDynamicPrompt(baseConfig);

      expect(prompt).toContain('日本語で応答');
    });

    it('should include English language instructions', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        language: 'English',
      };
      const prompt = generateDynamicPrompt(config);

      expect(prompt).toContain('English');
    });

    it('should include Korean language instructions', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        language: 'Korean',
      };
      const prompt = generateDynamicPrompt(config);

      expect(prompt).toContain('한국어');
    });

    it('should include product context when products exist', () => {
      productStore.add({
        name: '抹茶ラテ',
        price: 500,
        description: '京都産抹茶使用',
      });

      const prompt = generateDynamicPrompt(baseConfig);

      expect(prompt).toContain('抹茶ラテ');
      expect(prompt).toContain('¥500');
    });

    it('should show no products message when no products', () => {
      const prompt = generateDynamicPrompt(baseConfig);

      expect(prompt).toContain('商品情報が登録されていません');
    });

    it('should include store context when provided', () => {
      const storeContext: StoreContext = {
        storeName: 'テストショップ',
        storeDescription: 'テスト用のお店',
        categories: ['お茶', '和菓子'],
        brandVoice: {
          tone: 'フォーマル',
          keywords: ['伝統', '品質'],
          avoidWords: ['安い'],
        },
        policies: {
          shipping: '送料無料',
          returns: '7日以内返品可',
          payment: 'カード・PayPay',
        },
      };

      const config: DynamicPromptConfig = {
        ...baseConfig,
        storeContext,
      };

      const prompt = generateDynamicPrompt(config);

      expect(prompt).toContain('テストショップ');
      expect(prompt).toContain('テスト用のお店');
      expect(prompt).toContain('お茶、和菓子');
      expect(prompt).toContain('フォーマル');
      expect(prompt).toContain('伝統、品質');
      expect(prompt).toContain('安い');
      expect(prompt).toContain('送料無料');
    });

    it('should include custom rules when provided', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        customRules: ['競合他社の話はしない', '割引は勝手に約束しない'],
      };

      const prompt = generateDynamicPrompt(config);

      expect(prompt).toContain('カスタムルール');
      expect(prompt).toContain('競合他社の話はしない');
      expect(prompt).toContain('割引は勝手に約束しない');
    });

    it('should include enabled features section', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        enabledFeatures: {
          productSearch: true,
          recommendations: true,
          priceComparison: false,
          inventoryCheck: false,
        },
      };

      const prompt = generateDynamicPrompt(config);

      expect(prompt).toContain('商品検索');
      expect(prompt).toContain('商品レコメンド');
    });

    describe('agent types', () => {
      it('should generate shopping-guide role', () => {
        const prompt = generateDynamicPrompt({
          ...baseConfig,
          agentType: 'shopping-guide',
        });

        expect(prompt).toContain('ショッピングガイド');
      });

      it('should generate product-sales role', () => {
        const prompt = generateDynamicPrompt({
          ...baseConfig,
          agentType: 'product-sales',
        });

        expect(prompt).toContain('商品販売スペシャリスト');
      });

      it('should generate faq-support role', () => {
        const prompt = generateDynamicPrompt({
          ...baseConfig,
          agentType: 'faq-support',
        });

        expect(prompt).toContain('FAQサポート');
      });

      it('should generate omotenashi-advisor role', () => {
        const prompt = generateDynamicPrompt({
          ...baseConfig,
          agentType: 'omotenashi-advisor',
        });

        expect(prompt).toContain('おもてなしアドバイザー');
      });

      it('should default to shopping-guide for unknown type', () => {
        const prompt = generateDynamicPrompt({
          ...baseConfig,
          agentType: 'unknown-type',
        });

        expect(prompt).toContain('ショッピングガイド');
      });
    });

    it('should filter inactive products', () => {
      productStore.add({ name: 'Active Product', isActive: true });
      productStore.add({ name: 'Inactive Product', isActive: false });

      const prompt = generateDynamicPrompt(baseConfig);

      expect(prompt).toContain('Active Product');
      expect(prompt).not.toContain('Inactive Product');
    });
  });

  describe('generateStoreContextFromUrl', () => {
    it('should extract store name from URL', () => {
      const context = generateStoreContextFromUrl('https://www.example.com/shop');

      expect(context.storeName).toBe('Example');
      expect(context.storeUrl).toBe('https://www.example.com/shop');
    });

    it('should handle URL without www', () => {
      const context = generateStoreContextFromUrl('https://mystore.co.jp');

      expect(context.storeName).toBe('Mystore');
    });

    it('should set default brand voice', () => {
      const context = generateStoreContextFromUrl('https://test.com');

      expect(context.brandVoice).toBeDefined();
      expect(context.brandVoice?.tone).toBe('フレンドリーでプロフェッショナル');
    });
  });

  describe('previewPrompt', () => {
    it('should return prompt and stats', () => {
      productStore.add({ name: 'Product 1', isActive: true });
      productStore.add({ name: 'Product 2', isActive: true });

      const result = previewPrompt(baseConfig);

      expect(result.prompt).toBeDefined();
      expect(result.stats.totalLength).toBeGreaterThan(0);
      expect(result.stats.productCount).toBe(2);
      expect(result.stats.hasStoreContext).toBe(false);
    });

    it('should detect enabled features', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        enabledFeatures: {
          productSearch: true,
          recommendations: true,
          priceComparison: true,
          inventoryCheck: false,
        },
      };

      const result = previewPrompt(config);

      expect(result.stats.enabledFeatures).toContain('productSearch');
      expect(result.stats.enabledFeatures).toContain('recommendations');
      expect(result.stats.enabledFeatures).toContain('priceComparison');
      expect(result.stats.enabledFeatures).not.toContain('inventoryCheck');
    });

    it('should detect store context presence', () => {
      const config: DynamicPromptConfig = {
        ...baseConfig,
        storeContext: {
          storeName: 'Test Store',
        },
      };

      const result = previewPrompt(config);

      expect(result.stats.hasStoreContext).toBe(true);
    });

    it('should work with workspace id', () => {
      productStore.add({ name: 'Default Product' });
      productStore.add({ name: 'Workspace Product' }, 'test-workspace');

      const defaultResult = previewPrompt(baseConfig);
      const workspaceResult = previewPrompt(baseConfig, 'test-workspace');

      expect(defaultResult.stats.productCount).toBe(1);
      expect(workspaceResult.stats.productCount).toBe(1);
    });
  });
});
