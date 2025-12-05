/**
 * EC Site Scraper Service
 * ECサイトから商品情報を抽出するサービス
 */

import { productStore } from './store.js';
import type { Product } from '../../types/index.js';

export interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  sku?: string;
  category?: string[];
  brand?: string;
  availability: 'InStock' | 'OutOfStock' | 'LimitedStock';
  weight?: string;
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
  reviews?: ReviewSummary;
}

export interface ProductVariant {
  name: string;
  sku?: string;
  price?: number;
  availability: string;
  attributes: Record<string, string>;
}

export interface ReviewSummary {
  rating: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
}

export interface ScrapeJobConfig {
  url: string;
  storeType: 'general_ec' | 'shopify' | 'base' | 'custom';
  options?: {
    extractVariants?: boolean;
    extractReviews?: boolean;
    maxProducts?: number;
    categoryFilter?: string;
  };
}

export interface ScrapeResult {
  success: boolean;
  jobId: string;
  productsExtracted: number;
  productsImported: number;
  errors: string[];
  summary: {
    categories: Record<string, number>;
    priceRange: { min: number; max: number };
    outOfStockCount: number;
  };
}

// Job tracking
interface ScrapeJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: ScrapeJobConfig;
  progress: number;
  result?: ScrapeResult;
  createdAt: Date;
  updatedAt: Date;
}

class ECScraperService {
  private jobs: Map<string, ScrapeJob> = new Map();

  /**
   * スクレイピングジョブを作成
   */
  createJob(config: ScrapeJobConfig): ScrapeJob {
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ScrapeJob = {
      id: jobId,
      status: 'pending',
      config,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * ジョブを取得
   */
  getJob(jobId: string): ScrapeJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 全ジョブを取得
   */
  getAllJobs(): ScrapeJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Shopify商品JSONを解析
   */
  async parseShopifyProducts(url: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];

    try {
      // Shopify products.json endpoint
      const baseUrl = new URL(url);
      const productsUrl = `${baseUrl.origin}/products.json`;

      const response = await fetch(productsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OmakaseAI/1.0)',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json() as { products: ShopifyProduct[] };

      for (const item of data.products) {
        const variant = item.variants?.[0];
        const product: ScrapedProduct = {
          name: item.title,
          description: this.stripHtml(item.body_html || ''),
          price: variant ? parseFloat(variant.price) : 0,
          originalPrice: variant?.compare_at_price ? parseFloat(variant.compare_at_price) : undefined,
          currency: 'JPY',
          imageUrl: item.images?.[0]?.src,
          productUrl: `${baseUrl.origin}/products/${item.handle}`,
          sku: variant?.sku || item.id?.toString(),
          category: item.product_type ? [item.product_type] : [],
          brand: item.vendor,
          availability: variant?.available ? 'InStock' : 'OutOfStock',
          variants: item.variants?.map((v: ShopifyVariant) => ({
            name: v.title,
            sku: v.sku,
            price: parseFloat(v.price),
            availability: v.available ? 'InStock' : 'OutOfStock',
            attributes: {
              option1: v.option1 || '',
              option2: v.option2 || '',
              option3: v.option3 || '',
            },
          })),
        };
        products.push(product);
      }
    } catch (error) {
      console.error('Shopify scrape error:', error);
    }

    return products;
  }

  /**
   * スクレイピングジョブを実行
   */
  async executeJob(jobId: string): Promise<ScrapeResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    job.status = 'running';
    job.updatedAt = new Date();

    const result: ScrapeResult = {
      success: false,
      jobId,
      productsExtracted: 0,
      productsImported: 0,
      errors: [],
      summary: {
        categories: {},
        priceRange: { min: Infinity, max: 0 },
        outOfStockCount: 0,
      },
    };

    try {
      let scrapedProducts: ScrapedProduct[] = [];

      // Shopify系サイトの場合
      if (job.config.storeType === 'shopify') {
        scrapedProducts = await this.parseShopifyProducts(job.config.url);
      } else {
        // 汎用スクレイピング（将来実装）
        result.errors.push('Generic scraping not yet implemented. Use Shopify store type.');
      }

      // 最大商品数制限
      if (job.config.options?.maxProducts) {
        scrapedProducts = scrapedProducts.slice(0, job.config.options.maxProducts);
      }

      result.productsExtracted = scrapedProducts.length;
      job.progress = 50;

      // ProductStoreにインポート
      for (const scraped of scrapedProducts) {
        try {
          const productData: Partial<Product> = {
            name: scraped.name,
            description: scraped.description,
            price: scraped.price,
            imageUrl: scraped.imageUrl,
            productUrl: scraped.productUrl,
            isActive: scraped.availability === 'InStock',
            stockQuantity: scraped.availability === 'OutOfStock' ? 0 : undefined,
          };

          productStore.add(productData);
          result.productsImported++;

          // 統計更新
          if (scraped.category?.[0]) {
            result.summary.categories[scraped.category[0]] =
              (result.summary.categories[scraped.category[0]] || 0) + 1;
          }
          if (scraped.price > 0) {
            result.summary.priceRange.min = Math.min(result.summary.priceRange.min, scraped.price);
            result.summary.priceRange.max = Math.max(result.summary.priceRange.max, scraped.price);
          }
          if (scraped.availability === 'OutOfStock') {
            result.summary.outOfStockCount++;
          }
        } catch (err) {
          result.errors.push(`Failed to import: ${scraped.name}`);
        }
      }

      job.progress = 100;
      result.success = result.productsImported > 0;

      // 価格レンジ修正
      if (result.summary.priceRange.min === Infinity) {
        result.summary.priceRange.min = 0;
      }

    } catch (error) {
      result.errors.push(String(error));
      job.status = 'failed';
    }

    job.status = result.success ? 'completed' : 'failed';
    job.result = result;
    job.updatedAt = new Date();

    return result;
  }

  /**
   * HTMLタグを除去
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * ジョブをクリア
   */
  clearJobs(): void {
    this.jobs.clear();
  }
}

// Shopify API types
interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  images: { src: string }[];
  variants: ShopifyVariant[];
}

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

export const ecScraperService = new ECScraperService();
