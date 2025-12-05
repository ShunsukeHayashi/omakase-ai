/**
 * Site Scraper Service - ECサイトから商品情報を取得
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '../../types/index.js';

interface ScrapedProduct extends Omit<Product, 'isActive'> {
  isActive: boolean;
  metadata?: {
    category?: string;
    brand?: string;
    sku?: string;
    rating?: number;
    reviewCount?: number;
    specifications?: Record<string, string>;
  };
}

/**
 * URLから商品情報をスクレイピング
 */
export async function scrapeProductsFromUrl(
  url: string,
  maxProducts: number = 50
): Promise<ScrapedProduct[]> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data as string);
    const products: ScrapedProduct[] = [];

    // 一般的なECサイトの商品セレクタパターン
    const productSelectors = [
      '[data-product]',
      '.product-item',
      '.product-card',
      '.product',
      '[itemtype="http://schema.org/Product"]',
      '[itemtype="https://schema.org/Product"]',
      '.product-grid-item',
      '.grid-product',
      '.woocommerce-product',
      'li.product',
      '.item-box',
      '.goods-item',
      '.itemList',
    ];

    let foundSelector: string | null = null;

    for (const selector of productSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        foundSelector = selector;
        break;
      }
    }

    if (!foundSelector) {
      $('a[href*="product"], a[href*="item"], a[href*="goods"]').each(
        (_, el) => {
          if (products.length >= maxProducts) return false;

          const $el = $(el);
          const href = $el.attr('href');
          const text = $el.text().trim();

          if (href && text && text.length > 0) {
            const fullUrl = href.startsWith('http')
              ? href
              : new URL(href, url).toString();

            products.push({
              id: uuidv4(),
              name: text.slice(0, 200),
              description: '',
              price: 0,
              productUrl: fullUrl,
              isActive: true,
            });
          }
        }
      );
    } else {
      $(foundSelector).each((_, el) => {
        if (products.length >= maxProducts) return false;

        const $el = $(el);
        const product = extractProductInfo($, $el, url);

        if (product.name) {
          products.push(product);
        }
      });
    }

    const jsonLdProducts = extractFromJsonLd($, url);
    for (const product of jsonLdProducts) {
      if (products.length >= maxProducts) break;
      if (!products.find((p) => p.productUrl === product.productUrl)) {
        products.push(product);
      }
    }

    return products;
  } catch (error) {
    throw error;
  }
}

function extractProductInfo(
  $: cheerio.CheerioAPI,
  $el: ReturnType<cheerio.CheerioAPI>,
  baseUrl: string
): ScrapedProduct {
  const nameSelectors = [
    '[itemprop="name"]',
    '.product-name',
    '.product-title',
    '.item-name',
    'h2',
    'h3',
    '.title',
  ];
  let name = '';
  for (const selector of nameSelectors) {
    const text = $el.find(selector).first().text().trim();
    if (text) {
      name = text;
      break;
    }
  }

  const priceSelectors = [
    '[itemprop="price"]',
    '.price',
    '.product-price',
    '.item-price',
    '[data-price]',
  ];
  let price = 0;
  for (const selector of priceSelectors) {
    const $price = $el.find(selector).first();
    const priceText = $price.attr('content') || $price.text();
    const parsed = parsePrice(priceText);
    if (parsed > 0) {
      price = parsed;
      break;
    }
  }

  const descSelectors = [
    '[itemprop="description"]',
    '.product-description',
    '.description',
    '.item-desc',
    'p',
  ];
  let description = '';
  for (const selector of descSelectors) {
    const text = $el.find(selector).first().text().trim();
    if (text && text.length > 10) {
      description = text.slice(0, 500);
      break;
    }
  }

  const imageSelectors = [
    '[itemprop="image"]',
    'img.product-image',
    'img.item-image',
    'img',
  ];
  let imageUrl: string | undefined;
  for (const selector of imageSelectors) {
    const $img = $el.find(selector).first();
    const src =
      $img.attr('src') ||
      $img.attr('data-src') ||
      $img.attr('data-lazy-src') ||
      $img.attr('data-original');
    if (src) {
      imageUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      break;
    }
  }

  const linkSelectors = ['a[href*="product"]', 'a[href*="item"]', 'a'];
  let productUrl = '';
  for (const selector of linkSelectors) {
    const href = $el.find(selector).first().attr('href') || $el.attr('href');
    if (href) {
      productUrl = href.startsWith('http')
        ? href
        : new URL(href, baseUrl).toString();
      break;
    }
  }

  return {
    id: uuidv4(),
    name: name || 'Unknown Product',
    description,
    price,
    imageUrl,
    productUrl: productUrl || baseUrl,
    isActive: true,
  };
}

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  offers?: { price?: string | number } | Array<{ price?: string | number }>;
  brand?: { name?: string } | string;
  sku?: string;
  aggregateRating?: {
    ratingValue?: number;
    reviewCount?: number;
  };
}

function extractFromJsonLd(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const html = $(el).html();
      if (!html) return;
      const json: unknown = JSON.parse(html);
      const items: JsonLdProduct[] = Array.isArray(json) ? json : [json as JsonLdProduct];

      for (const item of items) {
        if (item['@type'] === 'Product') {
          const imgUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const brandName = typeof item.brand === 'object' ? item.brand?.name : item.brand;

          products.push({
            id: uuidv4(),
            name: item.name ?? 'Unknown',
            description: item.description ?? '',
            price: parsePrice(String(offers?.price ?? '0')),
            imageUrl: imgUrl,
            productUrl: item.url ?? baseUrl,
            isActive: true,
            metadata: {
              brand: brandName,
              sku: item.sku,
              rating: item.aggregateRating?.ratingValue,
              reviewCount: item.aggregateRating?.reviewCount,
            },
          });
        }
      }
    } catch {
      // JSON parse error, skip
    }
  });

  return products;
}

function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;

  const cleaned = String(priceStr)
    .replace(/[^0-9.,]/g, '')
    .replace(/,/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
