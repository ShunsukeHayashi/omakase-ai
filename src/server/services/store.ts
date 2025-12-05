/**
 * In-Memory Product Store
 * 本番環境ではDBに置き換え
 */

import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../types/index.js';

class ProductStore {
  private products: Map<string, Product> = new Map();

  getAll(): Product[] {
    return Array.from(this.products.values());
  }

  get(id: string): Product | undefined {
    return this.products.get(id);
  }

  add(data: Partial<Product>): Product {
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

    this.products.set(product.id, product);
    return product;
  }

  update(id: string, data: Partial<Product>): Product | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...existing,
      ...data,
      id: existing.id, // IDは変更不可
    };

    this.products.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  search(query: string): Product[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }

  clear(): void {
    this.products.clear();
  }

  /**
   * 在庫数量を更新
   */
  updateStock(id: string, quantity: number): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;

    product.stockQuantity = Math.max(0, quantity);
    this.products.set(id, product);
    return product;
  }

  /**
   * 在庫を減らす（購入時）
   */
  decrementStock(id: string, amount: number = 1): { success: boolean; product?: Product; error?: string } {
    const product = this.products.get(id);
    if (!product) {
      return { success: false, error: '商品が見つかりません' };
    }

    // 在庫管理なしの場合は常に成功
    if (product.stockQuantity === undefined) {
      return { success: true, product };
    }

    if (product.stockQuantity < amount) {
      return { success: false, error: '在庫が不足しています', product };
    }

    product.stockQuantity -= amount;
    this.products.set(id, product);
    return { success: true, product };
  }

  /**
   * 在庫を増やす（入荷時）
   */
  incrementStock(id: string, amount: number = 1): Product | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;

    product.stockQuantity = (product.stockQuantity ?? 0) + amount;
    this.products.set(id, product);
    return product;
  }

  /**
   * 在庫状況を取得
   */
  getStockStatus(id: string): { inStock: boolean; quantity?: number; isLowStock: boolean; message: string } | undefined {
    const product = this.products.get(id);
    if (!product) return undefined;

    // 在庫管理なしの場合
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

  /**
   * 在庫切れ商品を取得
   */
  getOutOfStockProducts(): Product[] {
    return this.getAll().filter(p => p.stockQuantity === 0);
  }

  /**
   * 在庫少の商品を取得
   */
  getLowStockProducts(): Product[] {
    return this.getAll().filter(p => {
      if (p.stockQuantity === undefined || p.stockQuantity === 0) return false;
      const threshold = p.lowStockThreshold ?? 5;
      return p.stockQuantity <= threshold;
    });
  }

  /**
   * 商品情報をLLM用のコンテキストとして整形
   */
  getProductContext(): string {
    const products = this.getAll().filter((p) => p.isActive);

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

    return `【取り扱い商品一覧】\n\n${context}`;
  }
}

export const productStore = new ProductStore();
