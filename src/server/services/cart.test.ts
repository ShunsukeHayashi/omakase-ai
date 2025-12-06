/**
 * CartStore Unit Tests
 */

import { cartStore } from './cart.js';
import { productStore } from './store.js';
import type { Cart } from './cart.js';

describe('CartStore', () => {
  let testProductId: string;

  beforeEach(() => {
    // Clear all carts by creating fresh instance behavior
    // Since we can't access private carts, we'll work with new cart IDs
    productStore.clear();

    // Create test product
    const product = productStore.add({
      name: 'Test Product',
      price: 1000,
    });
    testProductId = product.id;
  });

  describe('create', () => {
    it('should create a new empty cart', () => {
      const cart = cartStore.create();

      expect(cart.id).toBeDefined();
      expect(cart.items).toEqual([]);
      expect(cart.createdAt).toBeInstanceOf(Date);
      expect(cart.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getOrCreate', () => {
    it('should return existing cart if cartId exists', () => {
      const cart1 = cartStore.create();
      const cart2 = cartStore.getOrCreate(cart1.id);

      expect(cart2.id).toBe(cart1.id);
    });

    it('should create new cart if cartId does not exist', () => {
      const cart = cartStore.getOrCreate('non-existent');

      expect(cart.id).toBeDefined();
      expect(cart.id).not.toBe('non-existent');
    });

    it('should create new cart if no cartId provided', () => {
      const cart = cartStore.getOrCreate();

      expect(cart.id).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return cart by id', () => {
      const created = cartStore.create();
      const found = cartStore.get(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = cartStore.get('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const cart = cartStore.create();
      const item = cartStore.addItem(cart.id, testProductId, 2);

      expect(item).not.toBeNull();
      expect(item?.productId).toBe(testProductId);
      expect(item?.quantity).toBe(2);
      expect(item?.product.name).toBe('Test Product');
    });

    it('should return null for non-existent product', () => {
      const cart = cartStore.create();
      const item = cartStore.addItem(cart.id, 'non-existent', 1);

      expect(item).toBeNull();
    });

    it('should increase quantity for existing item', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId, 2);
      const item = cartStore.addItem(cart.id, testProductId, 3);

      expect(item?.quantity).toBe(5);
    });

    it('should default quantity to 1', () => {
      const cart = cartStore.create();
      const item = cartStore.addItem(cart.id, testProductId);

      expect(item?.quantity).toBe(1);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId);

      const result = cartStore.removeItem(cart.id, testProductId);

      expect(result).toBe(true);
      expect(cartStore.getItems(cart.id)).toHaveLength(0);
    });

    it('should return false for non-existent cart', () => {
      const result = cartStore.removeItem('non-existent', testProductId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent item', () => {
      const cart = cartStore.create();
      const result = cartStore.removeItem(cart.id, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId, 1);

      const item = cartStore.updateQuantity(cart.id, testProductId, 5);

      expect(item?.quantity).toBe(5);
    });

    it('should return null for non-existent cart', () => {
      const item = cartStore.updateQuantity('non-existent', testProductId, 5);

      expect(item).toBeNull();
    });

    it('should return null for non-existent item', () => {
      const cart = cartStore.create();
      const item = cartStore.updateQuantity(cart.id, 'non-existent', 5);

      expect(item).toBeNull();
    });

    it('should remove item when quantity is 0 or less', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId, 3);

      const item = cartStore.updateQuantity(cart.id, testProductId, 0);

      expect(item).toBeNull();
      expect(cartStore.getItems(cart.id)).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all items from cart', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId, 2);

      cartStore.clear(cart.id);

      expect(cartStore.getItems(cart.id)).toHaveLength(0);
    });

    it('should do nothing for non-existent cart', () => {
      // Should not throw
      expect(() => cartStore.clear('non-existent')).not.toThrow();
    });
  });

  describe('getItems', () => {
    it('should return all items in cart', () => {
      const cart = cartStore.create();
      const product2 = productStore.add({ name: 'Product 2', price: 500 });
      cartStore.addItem(cart.id, testProductId);
      cartStore.addItem(cart.id, product2.id);

      const items = cartStore.getItems(cart.id);

      expect(items).toHaveLength(2);
    });

    it('should return empty array for non-existent cart', () => {
      const items = cartStore.getItems('non-existent');

      expect(items).toEqual([]);
    });
  });

  describe('getTotal', () => {
    it('should calculate correct totals', () => {
      const cart = cartStore.create();
      const product2 = productStore.add({ name: 'Product 2', price: 500 });
      cartStore.addItem(cart.id, testProductId, 2); // 1000 * 2 = 2000
      cartStore.addItem(cart.id, product2.id, 3); // 500 * 3 = 1500

      const total = cartStore.getTotal(cart.id);

      expect(total.subtotal).toBe(3500);
      expect(total.itemCount).toBe(5);
      expect(total.items).toHaveLength(2);
    });

    it('should return zero totals for non-existent cart', () => {
      const total = cartStore.getTotal('non-existent');

      expect(total.subtotal).toBe(0);
      expect(total.itemCount).toBe(0);
      expect(total.items).toEqual([]);
    });

    it('should return zero totals for empty cart', () => {
      const cart = cartStore.create();
      const total = cartStore.getTotal(cart.id);

      expect(total.subtotal).toBe(0);
      expect(total.itemCount).toBe(0);
    });
  });

  describe('getCartContext', () => {
    it('should generate context string', () => {
      const cart = cartStore.create();
      cartStore.addItem(cart.id, testProductId, 2);

      const context = cartStore.getCartContext(cart.id);

      expect(context).toContain('カート内容');
      expect(context).toContain('Test Product');
      expect(context).toContain('× 2');
      expect(context).toContain('小計');
    });

    it('should return empty cart message', () => {
      const cart = cartStore.create();
      const context = cartStore.getCartContext(cart.id);

      expect(context).toBe('カートは空です。');
    });

    it('should handle products with zero price', () => {
      const freeProduct = productStore.add({ name: 'Free Item', price: 0 });
      const cart = cartStore.create();
      cartStore.addItem(cart.id, freeProduct.id);

      const context = cartStore.getCartContext(cart.id);

      expect(context).toContain('Free Item');
      expect(context).toContain('× 1');
      // Should not contain price for zero-price items
    });
  });
});
