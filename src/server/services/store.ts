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
