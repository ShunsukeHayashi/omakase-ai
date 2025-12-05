/**
 * Shopping Cart Service
 * セッションベースのカート管理
 */

import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../types/index.js';
import { productStore } from './store.js';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

class CartStore {
  private carts: Map<string, Cart> = new Map();

  /**
   * 新しいカートを作成
   */
  create(): Cart {
    const cart: Cart = {
      id: uuidv4(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.carts.set(cart.id, cart);
    return cart;
  }

  /**
   * カートを取得（なければ作成）
   */
  getOrCreate(cartId?: string): Cart {
    if (cartId && this.carts.has(cartId)) {
      return this.carts.get(cartId)!;
    }
    return this.create();
  }

  /**
   * カートを取得
   */
  get(cartId: string): Cart | undefined {
    return this.carts.get(cartId);
  }

  /**
   * カートに商品を追加
   */
  addItem(cartId: string, productId: string, quantity: number = 1): CartItem | null {
    const cart = this.getOrCreate(cartId);
    const product = productStore.get(productId);

    if (!product) {
      return null;
    }

    // 既存アイテムを探す
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
      cart.updatedAt = new Date();
      return existingItem;
    }

    // 新規アイテム
    const newItem: CartItem = {
      productId,
      product,
      quantity,
      addedAt: new Date(),
    };

    cart.items.push(newItem);
    cart.updatedAt = new Date();

    return newItem;
  }

  /**
   * カートから商品を削除
   */
  removeItem(cartId: string, productId: string): boolean {
    const cart = this.carts.get(cartId);
    if (!cart) return false;

    const index = cart.items.findIndex((item) => item.productId === productId);
    if (index === -1) return false;

    cart.items.splice(index, 1);
    cart.updatedAt = new Date();
    return true;
  }

  /**
   * 数量を更新
   */
  updateQuantity(cartId: string, productId: string, quantity: number): CartItem | null {
    const cart = this.carts.get(cartId);
    if (!cart) return null;

    const item = cart.items.find((item) => item.productId === productId);
    if (!item) return null;

    if (quantity <= 0) {
      this.removeItem(cartId, productId);
      return null;
    }

    item.quantity = quantity;
    cart.updatedAt = new Date();
    return item;
  }

  /**
   * カートをクリア
   */
  clear(cartId: string): void {
    const cart = this.carts.get(cartId);
    if (cart) {
      cart.items = [];
      cart.updatedAt = new Date();
    }
  }

  /**
   * カート内の全アイテムを取得
   */
  getItems(cartId: string): CartItem[] {
    const cart = this.carts.get(cartId);
    return cart?.items ?? [];
  }

  /**
   * カートの合計を計算
   */
  getTotal(cartId: string): { subtotal: number; itemCount: number; items: CartItem[] } {
    const cart = this.carts.get(cartId);
    if (!cart) {
      return { subtotal: 0, itemCount: 0, items: [] };
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, itemCount, items: cart.items };
  }

  /**
   * カート情報をLLM用に整形
   */
  getCartContext(cartId: string): string {
    const { subtotal, itemCount, items } = this.getTotal(cartId);

    if (items.length === 0) {
      return 'カートは空です。';
    }

    let context = `【カート内容】（${itemCount}点）\n`;
    for (const item of items) {
      context += `- ${item.product.name} × ${item.quantity}`;
      if (item.product.price > 0) {
        context += ` = ¥${(item.product.price * item.quantity).toLocaleString()}`;
      }
      context += '\n';
    }
    context += `\n小計: ¥${subtotal.toLocaleString()}`;

    return context;
  }
}

export const cartStore = new CartStore();
