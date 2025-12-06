/**
 * Knowledge Importer Service - 多様なソースからナレッジを取り込む
 * CSV, JSON, Shopify API, 手動入力に対応
 */

import { v4 as uuidv4 } from 'uuid';
import { productStore } from './store.js';
import { knowledgeStore, type FAQ } from './knowledge.js';
import { storeContextStore, type StoreContext } from './store-context.js';

// ==================== Types ====================

export interface ImportSource {
  type: 'csv' | 'json' | 'shopify' | 'url' | 'manual';
  name: string;
}

export interface ImportProgress {
  id: string;
  source: ImportSource;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  startedAt: Date;
  completedAt?: Date;
  errors: string[];
}

export interface CSVProductRow {
  name: string;
  description?: string;
  price?: string | number;
  imageUrl?: string;
  productUrl?: string;
  category?: string;
  sku?: string;
  stock?: string | number;
}

export interface JSONProductData {
  products: Array<{
    id?: string;
    name: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    productUrl?: string;
    category?: string;
    sku?: string;
    stockQuantity?: number;
    variants?: Array<{
      name: string;
      price?: number;
      sku?: string;
    }>;
  }>;
  storeInfo?: {
    name?: string;
    description?: string;
    url?: string;
    categories?: string[];
  };
  faqs?: Array<{
    question: string;
    answer: string;
    category?: string;
  }>;
}

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  handle: string;
  status: string;
  images: Array<{ src: string }>;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku?: string;
    inventory_quantity?: number;
  }>;
}

// ==================== Import Progress Store ====================

class ImportProgressStore {
  private progress: Map<string, ImportProgress> = new Map();

  create(source: ImportSource): ImportProgress {
    const progress: ImportProgress = {
      id: uuidv4(),
      source,
      status: 'pending',
      totalItems: 0,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      startedAt: new Date(),
      errors: [],
    };
    this.progress.set(progress.id, progress);
    return progress;
  }

  get(id: string): ImportProgress | undefined {
    return this.progress.get(id);
  }

  update(id: string, updates: Partial<ImportProgress>): ImportProgress | undefined {
    const progress = this.progress.get(id);
    if (!progress) return undefined;

    const updated = { ...progress, ...updates };
    this.progress.set(id, updated);
    return updated;
  }

  getAll(): ImportProgress[] {
    return Array.from(this.progress.values());
  }

  getRecent(limit: number = 10): ImportProgress[] {
    return this.getAll()
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }
}

export const importProgressStore = new ImportProgressStore();

// ==================== CSV Parser ====================

export function parseCSV(csvContent: string): CSVProductRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // ヘッダー行を解析
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  // カラムマッピング
  const columnMap = {
    name: findColumn(headers, ['name', '商品名', 'title', 'product_name', '名前']),
    description: findColumn(headers, ['description', '説明', 'desc', '商品説明', 'body']),
    price: findColumn(headers, ['price', '価格', '金額', 'amount', '値段']),
    imageUrl: findColumn(headers, ['image', 'imageurl', 'image_url', '画像', 'img', 'picture']),
    productUrl: findColumn(headers, ['url', 'producturl', 'product_url', 'link', 'href', '商品URL']),
    category: findColumn(headers, ['category', 'カテゴリ', 'type', '分類']),
    sku: findColumn(headers, ['sku', '品番', 'product_id', 'item_code']),
    stock: findColumn(headers, ['stock', '在庫', 'quantity', '数量', 'inventory']),
  };

  // データ行を解析
  const products: CSVProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: CSVProductRow = {
      name: columnMap.name !== -1 ? values[columnMap.name] || '' : '',
    };

    if (columnMap.description !== -1) row.description = values[columnMap.description];
    if (columnMap.price !== -1) row.price = values[columnMap.price];
    if (columnMap.imageUrl !== -1) row.imageUrl = values[columnMap.imageUrl];
    if (columnMap.productUrl !== -1) row.productUrl = values[columnMap.productUrl];
    if (columnMap.category !== -1) row.category = values[columnMap.category];
    if (columnMap.sku !== -1) row.sku = values[columnMap.sku];
    if (columnMap.stock !== -1) row.stock = values[columnMap.stock];

    if (row.name) {
      products.push(row);
    }
  }

  return products;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

// ==================== Import Functions ====================

/**
 * CSVから商品をインポート
 */
export function importFromCSV(
  csvContent: string,
  options: { clearExisting?: boolean; progressId?: string } = {}
): { success: boolean; imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  try {
    const rows = parseCSV(csvContent);

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'processing',
        totalItems: rows.length,
      });
    }

    if (options.clearExisting) {
      productStore.clear();
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const price = typeof row.price === 'string'
          ? parseFloat(row.price.replace(/[^0-9.]/g, '')) || 0
          : row.price || 0;

        const stock = typeof row.stock === 'string'
          ? parseInt(row.stock, 10)
          : row.stock;

        productStore.add({
          name: row.name,
          description: row.description || '',
          price,
          imageUrl: row.imageUrl,
          productUrl: row.productUrl || '',
          stockQuantity: isNaN(stock as number) ? undefined : stock as number,
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      if (options.progressId) {
        importProgressStore.update(options.progressId, {
          processedItems: i + 1,
          successItems: imported,
          failedItems: errors.length,
        });
      }
    }

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'completed',
        completedAt: new Date(),
        errors,
      });
    }

    return { success: true, imported, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(errorMsg);

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'failed',
        completedAt: new Date(),
        errors,
      });
    }

    return { success: false, imported, errors };
  }
}

/**
 * JSONから商品・FAQ・ストア情報をインポート
 */
export function importFromJSON(
  jsonData: JSONProductData,
  options: { clearExisting?: boolean; progressId?: string } = {}
): { success: boolean; products: number; faqs: number; errors: string[] } {
  const errors: string[] = [];
  let productsImported = 0;
  let faqsImported = 0;

  try {
    const totalItems = (jsonData.products?.length || 0) + (jsonData.faqs?.length || 0);

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'processing',
        totalItems,
      });
    }

    if (options.clearExisting) {
      productStore.clear();
    }

    // ストア情報をインポート
    if (jsonData.storeInfo) {
      const context: StoreContext = {
        storeName: jsonData.storeInfo.name || 'My Store',
        storeDescription: jsonData.storeInfo.description,
        storeUrl: jsonData.storeInfo.url,
        categories: jsonData.storeInfo.categories,
      };
      storeContextStore.set(context);
    }

    // 商品をインポート
    for (const product of jsonData.products || []) {
      try {
        productStore.add({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price || 0,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl || '',
          stockQuantity: product.stockQuantity,
        });
        productsImported++;
      } catch (err) {
        errors.push(`Product "${product.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // FAQをインポート
    for (const faq of jsonData.faqs || []) {
      try {
        knowledgeStore.addFAQ({
          question: faq.question,
          answer: faq.answer,
          category: faq.category || '一般',
          keywords: extractKeywords(faq.question + ' ' + faq.answer),
          isActive: true,
        });
        faqsImported++;
      } catch (err) {
        errors.push(`FAQ "${faq.question}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'completed',
        processedItems: totalItems,
        successItems: productsImported + faqsImported,
        failedItems: errors.length,
        completedAt: new Date(),
        errors,
      });
    }

    return { success: true, products: productsImported, faqs: faqsImported, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(errorMsg);

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'failed',
        completedAt: new Date(),
        errors,
      });
    }

    return { success: false, products: productsImported, faqs: faqsImported, errors };
  }
}

/**
 * Shopify APIから商品をインポート
 */
export async function importFromShopify(
  config: ShopifyConfig,
  options: { clearExisting?: boolean; progressId?: string; limit?: number } = {}
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    const apiVersion = config.apiVersion || '2024-01';
    const baseUrl = `https://${config.shopDomain}/admin/api/${apiVersion}`;
    const limit = options.limit || 250;

    if (options.progressId) {
      importProgressStore.update(options.progressId, { status: 'processing' });
    }

    // Shopify APIから商品を取得
    const response = await fetch(`${baseUrl}/products.json?limit=${limit}`, {
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { products: ShopifyProduct[] };
    const products = data.products || [];

    if (options.progressId) {
      importProgressStore.update(options.progressId, { totalItems: products.length });
    }

    if (options.clearExisting) {
      productStore.clear();
    }

    // ストア情報を設定
    storeContextStore.set({
      storeName: config.shopDomain.replace('.myshopify.com', ''),
      storeUrl: `https://${config.shopDomain}`,
    });

    // 商品をインポート
    for (let i = 0; i < products.length; i++) {
      const shopifyProduct = products[i];
      try {
        // HTMLタグを除去
        const description = shopifyProduct.body_html
          ? shopifyProduct.body_html.replace(/<[^>]*>/g, '').trim()
          : '';

        // 最初のバリアントの価格を使用
        const firstVariant = shopifyProduct.variants[0];
        const price = firstVariant ? parseFloat(firstVariant.price) : 0;
        const stock = firstVariant?.inventory_quantity;

        productStore.add({
          name: shopifyProduct.title,
          description: description.slice(0, 500),
          price,
          imageUrl: shopifyProduct.images[0]?.src,
          productUrl: `https://${config.shopDomain}/products/${shopifyProduct.handle}`,
          stockQuantity: stock,
        });
        imported++;
      } catch (err) {
        errors.push(`Product "${shopifyProduct.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      if (options.progressId) {
        importProgressStore.update(options.progressId, {
          processedItems: i + 1,
          successItems: imported,
          failedItems: errors.length,
        });
      }
    }

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'completed',
        completedAt: new Date(),
        errors,
      });
    }

    return { success: true, imported, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(errorMsg);

    if (options.progressId) {
      importProgressStore.update(options.progressId, {
        status: 'failed',
        completedAt: new Date(),
        errors,
      });
    }

    return { success: false, imported, errors };
  }
}

/**
 * テキストからキーワードを抽出
 */
function extractKeywords(text: string): string[] {
  // 簡易的なキーワード抽出（日本語対応）
  const words = text
    .replace(/[。、！？「」『』（）[\]【】]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && w.length <= 20);

  // 重複除去して上位10件を返す
  return [...new Set(words)].slice(0, 10);
}

/**
 * サンプルFAQを自動生成
 */
export function generateSampleFAQs(storeContext?: StoreContext): Omit<FAQ, 'id' | 'createdAt'>[] {
  const storeName = storeContext?.storeName || 'お店';

  return [
    {
      question: '送料はいくらですか？',
      answer: `${storeName}では、5,000円以上のご購入で送料無料です。5,000円未満の場合は全国一律500円となります。`,
      category: '配送',
      keywords: ['送料', '配送料', '無料', '送料無料'],
      isActive: true,
    },
    {
      question: '返品はできますか？',
      answer: '商品到着後7日以内であれば、未使用・未開封の商品に限り返品を承ります。お客様都合の返品の場合、返送料はお客様負担となります。',
      category: '返品・交換',
      keywords: ['返品', '返金', '交換', 'キャンセル'],
      isActive: true,
    },
    {
      question: '届くまでどのくらいかかりますか？',
      answer: '通常、ご注文から2-3営業日でお届けいたします。お届け日時のご指定も承っております。',
      category: '配送',
      keywords: ['届く', '配達', '日数', 'いつ届く', '配送日'],
      isActive: true,
    },
    {
      question: 'ギフトラッピングはできますか？',
      answer: 'はい、承っております。ご注文時にギフトラッピングオプションをお選びください。料金は300円です。',
      category: 'サービス',
      keywords: ['ギフト', 'ラッピング', 'プレゼント', '包装'],
      isActive: true,
    },
  ];
}
