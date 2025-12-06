/**
 * Workspace-aware in-memory Product Store
 * 本番環境ではDBに置き換え
 */

import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../types/index.js';

const DEFAULT_WORKSPACE = 'default';

class ProductStore {
  private stores: Map<string, Map<string, Product>> = new Map();

  private getStore(workspaceId: string = DEFAULT_WORKSPACE): Map<string, Product> {
    if (!this.stores.has(workspaceId)) {
      this.stores.set(workspaceId, new Map());
    }
    return this.stores.get(workspaceId)!;
  }

  getAll(workspaceId?: string): Product[] {
    return Array.from(this.getStore(workspaceId).values());
  }

  get(id: string, workspaceId?: string): Product | undefined {
    return this.getStore(workspaceId).get(id);
  }

  add(data: Partial<Product>, workspaceId?: string): Product {
    const store = this.getStore(workspaceId);
    const product: Product = {
      id: data.id || uuidv4(),
      name: data.name || 'Unnamed Product',
      description: data.description || '',
      price: data.price || 0,
      productUrl: data.productUrl || '',
      isActive: data.isActive ?? true,
    };

    if (data.imageUrl) {
      product.imageUrl = data.imageUrl;
    }
    if (data.stockQuantity !== undefined) {
      product.stockQuantity = data.stockQuantity;
    }
    if (data.lowStockThreshold !== undefined) {
      product.lowStockThreshold = data.lowStockThreshold;
    }

    store.set(product.id, product);
    return product;
  }

  update(id: string, data: Partial<Product>, workspaceId?: string): Product | undefined {
    const store = this.getStore(workspaceId);
    const existing = store.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...existing,
      ...data,
      id: existing.id,
    };

    store.set(id, updated);
    return updated;
  }

  delete(id: string, workspaceId?: string): boolean {
    return this.getStore(workspaceId).delete(id);
  }

  search(query: string, workspaceId?: string): Product[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll(workspaceId).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }

  clear(workspaceId?: string): void {
    if (workspaceId) {
      this.getStore(workspaceId).clear();
    } else {
      this.stores.clear();
    }
  }

  updateStock(id: string, quantity: number, workspaceId?: string): Product | undefined {
    const store = this.getStore(workspaceId);
    const product = store.get(id);
    if (!product) return undefined;

    product.stockQuantity = Math.max(0, quantity);
    store.set(id, product);
    return product;
  }

  decrementStock(id: string, amount: number = 1, workspaceId?: string): { success: boolean; product?: Product; error?: string } {
    const store = this.getStore(workspaceId);
    const product = store.get(id);
    if (!product) {
      return { success: false, error: '商品が見つかりません' };
    }

    if (product.stockQuantity === undefined) {
      return { success: true, product };
    }

    if (product.stockQuantity < amount) {
      return { success: false, error: '在庫が不足しています', product };
    }

    product.stockQuantity -= amount;
    store.set(id, product);
    return { success: true, product };
  }

  incrementStock(id: string, amount: number = 1, workspaceId?: string): Product | undefined {
    const store = this.getStore(workspaceId);
    const product = store.get(id);
    if (!product) return undefined;

    product.stockQuantity = (product.stockQuantity ?? 0) + amount;
    store.set(id, product);
    return product;
  }

  getStockStatus(id: string, workspaceId?: string): { inStock: boolean; quantity?: number; isLowStock: boolean; message: string } | undefined {
    const product = this.getStore(workspaceId).get(id);
    if (!product) return undefined;

    if (product.stockQuantity === undefined) {
      return {
        inStock: true,
        isLowStock: false,
        message: '在庫あり',
      };
    }

    const threshold = product.lowStockThreshold ?? 5;
    const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= threshold;

    if (product.stockQuantity === 0) {
      return {
        inStock: false,
        quantity: 0,
        isLowStock: false,
        message: '在庫切れ',
      };
    }

    return {
      inStock: true,
      quantity: product.stockQuantity,
      isLowStock,
      message: isLowStock
        ? `残りわずか（${product.stockQuantity}点）`
        : `在庫あり（${product.stockQuantity}点）`,
    };
  }

  getOutOfStockProducts(workspaceId?: string): Product[] {
    return this.getAll(workspaceId).filter(p => p.stockQuantity === 0);
  }

  getLowStockProducts(workspaceId?: string): Product[] {
    return this.getAll(workspaceId).filter(p => {
      if (p.stockQuantity === undefined || p.stockQuantity === 0) return false;
      const threshold = p.lowStockThreshold ?? 5;
      return p.stockQuantity <= threshold;
    });
  }

  getProductContext(workspaceId?: string): string {
    const products = this.getAll(workspaceId).filter((p) => p.isActive);

    if (products.length === 0) {
      return '現在、商品情報がありません。';
    }

    const context = products
      .map((p, i) => {
        let info = `【商品${i + 1}】${p.name}`;
        if (p.price > 0) {
          info += ` - ¥${p.price.toLocaleString()}`;
        }
        if (p.description) {
          info += `\n説明: ${p.description}`;
        }
        if (p.productUrl) {
          info += `\nURL: ${p.productUrl}`;
        }
        return info;
      })
      .join('\n\n');

    return context;
  }
}

export const productStore = new ProductStore();
