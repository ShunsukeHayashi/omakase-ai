/**
 * In-Memory Order Store
 * 注文管理サービス
 */

import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../types/index.js';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  cartId: string;
  sessionId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  cartId: string;
  sessionId: string;
  items: Array<{
    product: Product;
    quantity: number;
  }>;
  customerInfo?: Order['customerInfo'];
  notes?: string;
}

class OrderStore {
  private orders: Map<string, Order> = new Map();
  private readonly TAX_RATE = 0.10; // 消費税10%

  /**
   * 注文を作成
   */
  create(input: CreateOrderInput): Order {
    const items: OrderItem[] = input.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.floor(subtotal * this.TAX_RATE);
    const total = subtotal + tax;

    const order: Order = {
      id: uuidv4(),
      cartId: input.cartId,
      sessionId: input.sessionId,
      items,
      subtotal,
      tax,
      total,
      status: 'pending',
      customerInfo: input.customerInfo,
      notes: input.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    return order;
  }

  /**
   * 注文を取得
   */
  get(id: string): Order | undefined {
    return this.orders.get(id);
  }

  /**
   * セッションIDで注文を検索
   */
  getBySessionId(sessionId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.sessionId === sessionId
    );
  }

  /**
   * 全注文を取得
   */
  getAll(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * ステータスで絞り込み
   */
  getByStatus(status: OrderStatus): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.status === status
    );
  }

  /**
   * ステータスを更新
   */
  updateStatus(id: string, status: OrderStatus): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;

    order.status = status;
    order.updatedAt = new Date();
    this.orders.set(id, order);
    return order;
  }

  /**
   * 注文を確定
   */
  confirm(id: string): Order | undefined {
    return this.updateStatus(id, 'confirmed');
  }

  /**
   * 注文をキャンセル
   */
  cancel(id: string): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;

    // すでに発送済みや配達済みの場合はキャンセル不可
    if (['shipped', 'delivered'].includes(order.status)) {
      return undefined;
    }

    return this.updateStatus(id, 'cancelled');
  }

  /**
   * 顧客情報を更新
   */
  updateCustomerInfo(id: string, customerInfo: Order['customerInfo']): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;

    order.customerInfo = { ...order.customerInfo, ...customerInfo };
    order.updatedAt = new Date();
    this.orders.set(id, order);
    return order;
  }

  /**
   * 注文のフォーマット（音声用）
   */
  formatOrderForVoice(order: Order): string {
    const itemsText = order.items
      .map((item) => `${item.productName} ${item.quantity}点 ${item.subtotal.toLocaleString()}円`)
      .join('、');

    return `ご注文番号${order.id.slice(0, 8)}、商品は${itemsText}、小計${order.subtotal.toLocaleString()}円、消費税${order.tax.toLocaleString()}円、合計${order.total.toLocaleString()}円です。`;
  }

  /**
   * ストアをクリア
   */
  clear(): void {
    this.orders.clear();
  }
}

export const orderStore = new OrderStore();
