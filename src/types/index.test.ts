/**
 * Type definition tests
 *
 * These tests verify that the type definitions are correct
 * and can be used as expected.
 */

import type {
  AgentConfig,
  AgentType,
  AgentMode,
  WidgetConfig,
  Product,
  QAItem,
} from './index.js';

describe('Type Definitions', () => {
  describe('AgentConfig', () => {
    it('should accept valid agent configuration', () => {
      const config: AgentConfig = {
        type: 'shopping-guide',
        modes: ['voice', 'chat'],
        status: 'active',
        isDefault: true,
      };

      expect(config.type).toBe('shopping-guide');
      expect(config.modes).toContain('voice');
      expect(config.status).toBe('active');
    });

    it('should accept all agent types', () => {
      const types: AgentType[] = [
        'shopping-guide',
        'product-sales',
        'faq-support',
        'onboarding',
        'robotics',
      ];

      expect(types).toHaveLength(5);
    });

    it('should accept all agent modes', () => {
      const modes: AgentMode[] = ['voice', 'chat', 'vision'];

      expect(modes).toHaveLength(3);
    });
  });

  describe('WidgetConfig', () => {
    it('should accept valid widget configuration', () => {
      const config: WidgetConfig = {
        position: 'bottom-right',
        style: 'button',
        heightPercentage: 89,
        showWelcomeNotification: true,
      };

      expect(config.position).toBe('bottom-right');
      expect(config.heightPercentage).toBe(89);
    });
  });

  describe('Product', () => {
    it('should accept valid product', () => {
      const product: Product = {
        id: 'prod-001',
        name: 'Test Product',
        description: 'A test product',
        price: 1000,
        productUrl: 'https://example.com/product',
        isActive: true,
      };

      expect(product.name).toBe('Test Product');
      expect(product.isActive).toBe(true);
    });
  });

  describe('QAItem', () => {
    it('should accept valid Q&A item', () => {
      const qa: QAItem = {
        id: 'qa-001',
        question: 'How do I use this?',
        answer: 'Simply click the button.',
        status: 'active',
      };

      expect(qa.question).toBeDefined();
      expect(qa.status).toBe('active');
    });
  });
});
