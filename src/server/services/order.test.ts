/**
 * OrderStore Unit Tests
 */

import { orderStore } from './order.js';
import type { CreateOrderInput, Order } from './order.js';
import type { Product } from '../../types/index.js';

describe('OrderStore', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: '抹茶ラテ',
    price: 500,
    description: '',
    productUrl: '',
    imageUrl: '',
    stockQuantity: 10,
    lowStockThreshold: 5,
    isActive: true,
  };

  const baseInput: CreateOrderInput = {
    cartId: 'cart-123',
    sessionId: 'session-456',
    items: [{ product: mockProduct, quantity: 2 }],
  };

  beforeEach(() => {
    orderStore.clear();
  });

  describe('create', () => {
    it('should create order with correct totals', () => {
      const order = orderStore.create(baseInput);

      expect(order.id).toBeDefined();
      expect(order.cartId).toBe('cart-123');
      expect(order.sessionId).toBe('session-456');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productName).toBe('抹茶ラテ');
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].subtotal).toBe(1000); // 500 * 2
      expect(order.subtotal).toBe(1000);
      expect(order.tax).toBe(100); // 10%
      expect(order.total).toBe(1100);
      expect(order.status).toBe('pending');
    });

    it('should create order with multiple items', () => {
      const product2: Product = {
        ...mockProduct,
        id: 'prod-2',
        name: 'ほうじ茶',
        price: 400,
      };

      const input: CreateOrderInput = {
        ...baseInput,
        items: [
          { product: mockProduct, quantity: 2 }, // 1000
          { product: product2, quantity: 3 }, // 1200
        ],
      };

      const order = orderStore.create(input);

      expect(order.items).toHaveLength(2);
      expect(order.subtotal).toBe(2200);
      expect(order.tax).toBe(220);
      expect(order.total).toBe(2420);
    });

    it('should include customer info if provided', () => {
      const input: CreateOrderInput = {
        ...baseInput,
        customerInfo: {
          name: '山田太郎',
          email: 'yamada@example.com',
          phone: '090-1234-5678',
        },
      };

      const order = orderStore.create(input);

      expect(order.customerInfo?.name).toBe('山田太郎');
      expect(order.customerInfo?.email).toBe('yamada@example.com');
    });

    it('should include notes if provided', () => {
      const input: CreateOrderInput = {
        ...baseInput,
        notes: 'ギフト包装希望',
      };

      const order = orderStore.create(input);

      expect(order.notes).toBe('ギフト包装希望');
    });
  });

  describe('get', () => {
    it('should return order by id', () => {
      const created = orderStore.create(baseInput);
      const found = orderStore.get(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = orderStore.get('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getBySessionId', () => {
    it('should return orders by session id', () => {
      orderStore.create(baseInput);
      orderStore.create({ ...baseInput, cartId: 'cart-2' });
      orderStore.create({ ...baseInput, sessionId: 'other-session' });

      const orders = orderStore.getBySessionId('session-456');

      expect(orders).toHaveLength(2);
    });

    it('should return empty array for unknown session', () => {
      const orders = orderStore.getBySessionId('unknown');

      expect(orders).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all orders', () => {
      orderStore.create(baseInput);
      orderStore.create({ ...baseInput, cartId: 'cart-2' });

      const orders = orderStore.getAll();

      expect(orders).toHaveLength(2);
    });
  });

  describe('getByStatus', () => {
    it('should filter orders by status', () => {
      const order1 = orderStore.create(baseInput);
      orderStore.create({ ...baseInput, cartId: 'cart-2' });
      orderStore.confirm(order1.id);

      const confirmed = orderStore.getByStatus('confirmed');
      const pending = orderStore.getByStatus('pending');

      expect(confirmed).toHaveLength(1);
      expect(pending).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update order status', () => {
      const order = orderStore.create(baseInput);
      const updated = orderStore.updateStatus(order.id, 'processing');

      expect(updated?.status).toBe('processing');
    });

    it('should return undefined for non-existent order', () => {
      const updated = orderStore.updateStatus('non-existent', 'confirmed');

      expect(updated).toBeUndefined();
    });
  });

  describe('confirm', () => {
    it('should confirm order', () => {
      const order = orderStore.create(baseInput);
      const confirmed = orderStore.confirm(order.id);

      expect(confirmed?.status).toBe('confirmed');
    });
  });

  describe('cancel', () => {
    it('should cancel pending order', () => {
      const order = orderStore.create(baseInput);
      const cancelled = orderStore.cancel(order.id);

      expect(cancelled?.status).toBe('cancelled');
    });

    it('should not cancel shipped order', () => {
      const order = orderStore.create(baseInput);
      orderStore.updateStatus(order.id, 'shipped');

      const cancelled = orderStore.cancel(order.id);

      expect(cancelled).toBeUndefined();
    });

    it('should not cancel delivered order', () => {
      const order = orderStore.create(baseInput);
      orderStore.updateStatus(order.id, 'delivered');

      const cancelled = orderStore.cancel(order.id);

      expect(cancelled).toBeUndefined();
    });

    it('should return undefined for non-existent order', () => {
      const cancelled = orderStore.cancel('non-existent');

      expect(cancelled).toBeUndefined();
    });
  });

  describe('updateCustomerInfo', () => {
    it('should update customer info', () => {
      const order = orderStore.create(baseInput);
      const updated = orderStore.updateCustomerInfo(order.id, {
        name: '新しい名前',
        address: '東京都渋谷区',
      });

      expect(updated?.customerInfo?.name).toBe('新しい名前');
      expect(updated?.customerInfo?.address).toBe('東京都渋谷区');
    });

    it('should merge with existing info', () => {
      const input: CreateOrderInput = {
        ...baseInput,
        customerInfo: { name: '元の名前', email: 'original@example.com' },
      };
      const order = orderStore.create(input);
      const updated = orderStore.updateCustomerInfo(order.id, {
        phone: '090-1111-2222',
      });

      expect(updated?.customerInfo?.name).toBe('元の名前');
      expect(updated?.customerInfo?.email).toBe('original@example.com');
      expect(updated?.customerInfo?.phone).toBe('090-1111-2222');
    });

    it('should return undefined for non-existent order', () => {
      const updated = orderStore.updateCustomerInfo('non-existent', {
        name: 'test',
      });

      expect(updated).toBeUndefined();
    });
  });

  describe('formatOrderForVoice', () => {
    it('should format order for voice output', () => {
      const order = orderStore.create(baseInput);
      const formatted = orderStore.formatOrderForVoice(order);

      expect(formatted).toContain('ご注文番号');
      expect(formatted).toContain('抹茶ラテ');
      expect(formatted).toContain('2点');
      expect(formatted).toContain('1,000円');
      expect(formatted).toContain('小計');
      expect(formatted).toContain('消費税');
      expect(formatted).toContain('合計1,100円');
    });
  });

  describe('clear', () => {
    it('should clear all orders', () => {
      orderStore.create(baseInput);
      orderStore.create({ ...baseInput, cartId: 'cart-2' });

      orderStore.clear();

      expect(orderStore.getAll()).toHaveLength(0);
    });
  });
});
