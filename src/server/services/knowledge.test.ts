/**
 * KnowledgeStore Unit Tests
 */

import { knowledgeStore } from './knowledge.js';
import type { StoreInfo } from './knowledge.js';

describe('KnowledgeStore', () => {
  describe('default FAQs', () => {
    it('should have default FAQs loaded', () => {
      const faqs = knowledgeStore.getAllFAQs();

      expect(faqs.length).toBeGreaterThan(0);
    });

    it('should include shipping FAQ', () => {
      const results = knowledgeStore.searchFAQ('送料');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].question).toContain('送料');
    });
  });

  describe('addFAQ', () => {
    it('should add new FAQ', () => {
      const beforeCount = knowledgeStore.getAllFAQs().length;

      const faq = knowledgeStore.addFAQ({
        question: 'テスト質問',
        answer: 'テスト回答',
        category: 'テスト',
        keywords: ['テスト', 'test'],
        isActive: true,
      });

      expect(faq.id).toBeDefined();
      expect(faq.question).toBe('テスト質問');
      expect(faq.createdAt).toBeInstanceOf(Date);

      const afterCount = knowledgeStore.getAllFAQs().length;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it('should not include inactive FAQ in getAllFAQs', () => {
      const beforeCount = knowledgeStore.getAllFAQs().length;

      knowledgeStore.addFAQ({
        question: '非アクティブ質問',
        answer: '非アクティブ回答',
        category: 'テスト',
        keywords: [],
        isActive: false,
      });

      const afterCount = knowledgeStore.getAllFAQs().length;
      expect(afterCount).toBe(beforeCount); // Should not increase
    });
  });

  describe('searchFAQ', () => {
    it('should find FAQ by question', () => {
      const results = knowledgeStore.searchFAQ('返品');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].question).toContain('返品');
    });

    it('should find FAQ by keyword', () => {
      const results = knowledgeStore.searchFAQ('クレジットカード');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ by category', () => {
      const results = knowledgeStore.searchFAQ('配送');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = knowledgeStore.searchFAQ('存在しないクエリ12345');

      expect(results).toEqual([]);
    });

    it('should limit results to 5', () => {
      // Add many FAQs with same keyword
      for (let i = 0; i < 10; i++) {
        knowledgeStore.addFAQ({
          question: `重複質問${i}`,
          answer: '回答',
          category: '重複カテゴリ',
          keywords: ['重複キーワード'],
          isActive: true,
        });
      }

      const results = knowledgeStore.searchFAQ('重複');

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should be case-insensitive', () => {
      knowledgeStore.addFAQ({
        question: 'UPPERCASE QUESTION',
        answer: 'answer',
        category: 'test',
        keywords: ['UPPER'],
        isActive: true,
      });

      const results = knowledgeStore.searchFAQ('uppercase');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getFAQsByCategory', () => {
    it('should return FAQs by category', () => {
      const faqs = knowledgeStore.getFAQsByCategory('配送');

      expect(faqs.length).toBeGreaterThan(0);
      for (const faq of faqs) {
        expect(faq.category).toBe('配送');
      }
    });

    it('should return empty array for non-existent category', () => {
      const faqs = knowledgeStore.getFAQsByCategory('存在しないカテゴリ');

      expect(faqs).toEqual([]);
    });
  });

  describe('storeInfo', () => {
    it('should have default store info', () => {
      const info = knowledgeStore.getStoreInfo();

      expect(info.name).toBeDefined();
    });

    it('should set and get store info', () => {
      const newInfo: StoreInfo = {
        name: 'テストストア',
        description: 'テスト用のストア',
        businessHours: {
          weekdays: '9:00-18:00',
          weekends: '10:00-17:00',
          holidays: '休業',
        },
        shipping: {
          domestic: '全国一律500円',
          international: '各国により異なる',
          freeShippingThreshold: 5000,
        },
        returns: {
          policy: '7日以内返品可',
          period: '7日間',
          conditions: ['未開封', '未使用'],
        },
        contact: {
          email: 'test@example.com',
          phone: '03-1234-5678',
        },
        paymentMethods: ['クレジットカード', 'PayPay', '銀行振込'],
      };

      knowledgeStore.setStoreInfo(newInfo);
      const info = knowledgeStore.getStoreInfo();

      expect(info.name).toBe('テストストア');
      expect(info.description).toBe('テスト用のストア');
      expect(info.businessHours?.weekdays).toBe('9:00-18:00');
      expect(info.shipping?.freeShippingThreshold).toBe(5000);
    });
  });

  describe('getStoreInfoContext', () => {
    beforeEach(() => {
      knowledgeStore.setStoreInfo({
        name: 'コンテキストテスト店',
        description: 'テスト説明',
        businessHours: {
          weekdays: '9:00-18:00',
          weekends: '10:00-17:00',
          holidays: '休業',
        },
        shipping: {
          domestic: '全国一律500円',
          freeShippingThreshold: 5000,
        },
        returns: {
          policy: '返品可能',
          period: '7日',
          conditions: [],
        },
        paymentMethods: ['カード', 'PayPay'],
        contact: {
          email: 'test@example.com',
        },
      });
    });

    it('should generate context string', () => {
      const context = knowledgeStore.getStoreInfoContext();

      expect(context).toContain('コンテキストテスト店');
      expect(context).toContain('テスト説明');
      expect(context).toContain('9:00-18:00');
      expect(context).toContain('全国一律500円');
      expect(context).toContain('¥5,000');
      expect(context).toContain('カード、PayPay');
      expect(context).toContain('test@example.com');
    });

    it('should include store name section', () => {
      const context = knowledgeStore.getStoreInfoContext();

      expect(context).toContain('【ストア情報】');
      expect(context).toContain('店舗名:');
    });
  });

  describe('formatFAQResults', () => {
    it('should format FAQ results', () => {
      const faqs = knowledgeStore.searchFAQ('送料');
      const formatted = knowledgeStore.formatFAQResults(faqs);

      expect(formatted).toContain('【FAQ検索結果】');
      expect(formatted).toContain('Q:');
      expect(formatted).toContain('A:');
    });

    it('should return no results message for empty array', () => {
      const formatted = knowledgeStore.formatFAQResults([]);

      expect(formatted).toBe('該当するFAQが見つかりませんでした。');
    });
  });
});
