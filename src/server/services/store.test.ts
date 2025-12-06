/**
 * ProductStore Unit Tests
 */

import { productStore } from './store.js';
import type { Product } from '../../types/index.js';

describe('ProductStore', () => {
  beforeEach(() => {
    productStore.clear();
  });

  describe('add', () => {
    it('should add a product with default values', () => {
      const product = productStore.add({ name: 'Test Product' });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(0);
      expect(product.isActive).toBe(true);
    });

    it('should add a product with all fields', () => {
      const product = productStore.add({
        name: '抹茶ラテ',
        description: '京都宇治抹茶使用',
        price: 580,
        productUrl: 'https://example.com/matcha',
        imageUrl: 'https://example.com/matcha.jpg',
        stockQuantity: 100,
        lowStockThreshold: 10,
      });

      expect(product.name).toBe('抹茶ラテ');
      expect(product.price).toBe(580);
      expect(product.stockQuantity).toBe(100);
    });
  });

  describe('get', () => {
    it('should return product by id', () => {
      const added = productStore.add({ name: 'Test' });
      const found = productStore.get(added.id);

      expect(found).toEqual(added);
    });

    it('should return undefined for non-existent id', () => {
      const found = productStore.get('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all products', () => {
      productStore.add({ name: 'Product 1' });
      productStore.add({ name: 'Product 2' });

      const all = productStore.getAll();

      expect(all).toHaveLength(2);
    });

    it('should return empty array when no products', () => {
      const all = productStore.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update product fields', () => {
      const product = productStore.add({ name: 'Original', price: 100 });
      const updated = productStore.update(product.id, { price: 200 });

      expect(updated?.price).toBe(200);
      expect(updated?.name).toBe('Original');
    });

    it('should return undefined for non-existent id', () => {
      const updated = productStore.update('non-existent', { price: 100 });

      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete product', () => {
      const product = productStore.add({ name: 'To Delete' });
      const result = productStore.delete(product.id);

      expect(result).toBe(true);
      expect(productStore.get(product.id)).toBeUndefined();
    });

    it('should return false for non-existent id', () => {
      const result = productStore.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      productStore.add({ name: '抹茶ラテ', description: '京都産の抹茶' });
      productStore.add({ name: 'ほうじ茶', description: '香ばしい味わい' });
      productStore.add({ name: '玄米茶', description: '抹茶入り' });
    });

    it('should search by name', () => {
      const results = productStore.search('抹茶');

      expect(results).toHaveLength(2);
    });

    it('should search by description', () => {
      const results = productStore.search('京都');

      expect(results).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      productStore.add({ name: 'Matcha Latte', description: 'Green tea' });
      const results = productStore.search('matcha');

      expect(results).toHaveLength(1);
    });
  });

  describe('stock management', () => {
    let product: Product;

    beforeEach(() => {
      product = productStore.add({
        name: 'Stock Test',
        stockQuantity: 10,
        lowStockThreshold: 3,
      });
    });

    describe('updateStock', () => {
      it('should update stock quantity', () => {
        const updated = productStore.updateStock(product.id, 20);

        expect(updated?.stockQuantity).toBe(20);
      });

      it('should not go below 0', () => {
        const updated = productStore.updateStock(product.id, -5);

        expect(updated?.stockQuantity).toBe(0);
      });
    });

    describe('decrementStock', () => {
      it('should decrement stock', () => {
        const result = productStore.decrementStock(product.id, 3);

        expect(result.success).toBe(true);
        expect(result.product?.stockQuantity).toBe(7);
      });

      it('should fail if not enough stock', () => {
        const result = productStore.decrementStock(product.id, 20);

        expect(result.success).toBe(false);
        expect(result.error).toBe('在庫が不足しています');
      });

      it('should return error for non-existent product', () => {
        const result = productStore.decrementStock('non-existent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('商品が見つかりません');
      });
    });

    describe('incrementStock', () => {
      it('should increment stock', () => {
        const updated = productStore.incrementStock(product.id, 5);

        expect(updated?.stockQuantity).toBe(15);
      });
    });

    describe('getStockStatus', () => {
      it('should return in stock status', () => {
        const status = productStore.getStockStatus(product.id);

        expect(status?.inStock).toBe(true);
        expect(status?.quantity).toBe(10);
        expect(status?.isLowStock).toBe(false);
      });

      it('should return low stock status', () => {
        productStore.updateStock(product.id, 2);
        const status = productStore.getStockStatus(product.id);

        expect(status?.inStock).toBe(true);
        expect(status?.isLowStock).toBe(true);
        expect(status?.message).toContain('残りわずか');
      });

      it('should return out of stock status', () => {
        productStore.updateStock(product.id, 0);
        const status = productStore.getStockStatus(product.id);

        expect(status?.inStock).toBe(false);
        expect(status?.message).toBe('在庫切れ');
      });
    });

    describe('getOutOfStockProducts', () => {
      it('should return only out of stock products', () => {
        productStore.add({ name: 'Out', stockQuantity: 0 });
        productStore.add({ name: 'In Stock', stockQuantity: 5 });

        const outOfStock = productStore.getOutOfStockProducts();

        expect(outOfStock).toHaveLength(1);
        expect(outOfStock[0].name).toBe('Out');
      });
    });

    describe('getLowStockProducts', () => {
      it('should return only low stock products', () => {
        productStore.add({ name: 'Low', stockQuantity: 2, lowStockThreshold: 5 });
        productStore.add({ name: 'Normal', stockQuantity: 100 });

        const lowStock = productStore.getLowStockProducts();

        // beforeEach product has stock=10, threshold=3, so it's NOT low stock
        // Only the 'Low' product (stock=2 < threshold=5) is low stock
        expect(lowStock).toHaveLength(1);
        expect(lowStock[0].name).toBe('Low');
      });
    });
  });

  describe('workspace isolation', () => {
    it('should isolate products by workspace', () => {
      productStore.add({ name: 'Default' });
      productStore.add({ name: 'Workspace A' }, 'workspace-a');
      productStore.add({ name: 'Workspace B' }, 'workspace-b');

      expect(productStore.getAll()).toHaveLength(1);
      expect(productStore.getAll('workspace-a')).toHaveLength(1);
      expect(productStore.getAll('workspace-b')).toHaveLength(1);
    });

    it('should clear only specific workspace', () => {
      productStore.add({ name: 'Default' });
      productStore.add({ name: 'Workspace A' }, 'workspace-a');

      productStore.clear('workspace-a');

      expect(productStore.getAll()).toHaveLength(1);
      expect(productStore.getAll('workspace-a')).toHaveLength(0);
    });
  });

  describe('getProductContext', () => {
    it('should generate context string', () => {
      productStore.add({
        name: '抹茶ラテ',
        price: 580,
        description: '京都宇治抹茶使用',
        productUrl: 'https://example.com',
      });

      const context = productStore.getProductContext();

      expect(context).toContain('抹茶ラテ');
      expect(context).toContain('¥580');
      expect(context).toContain('京都宇治抹茶使用');
    });

    it('should return message when no products', () => {
      const context = productStore.getProductContext();

      expect(context).toBe('現在、商品情報がありません。');
    });

    it('should exclude inactive products', () => {
      productStore.add({ name: 'Active', isActive: true });
      productStore.add({ name: 'Inactive', isActive: false });

      const context = productStore.getProductContext();

      expect(context).toContain('Active');
      expect(context).not.toContain('Inactive');
    });
  });
});
