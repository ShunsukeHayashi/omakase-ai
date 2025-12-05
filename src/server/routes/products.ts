/**
 * Products Router - 商品管理API
 */

import { Router } from 'express';
import type { Product } from '../../types/index.js';
import { productStore } from '../services/store.js';

export const productsRouter = Router();

// Request body types
interface ProductInput {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
  isActive?: boolean;
}

interface BulkProductsInput {
  products: ProductInput[];
}

// GET /api/products - 全商品取得
productsRouter.get('/', (_req, res): void => {
  const products = productStore.getAll();
  res.json({
    success: true,
    count: products.length,
    products,
  });
});

// GET /api/products/:id - 商品詳細取得
productsRouter.get('/:id', (req, res): void => {
  const { id } = req.params;
  const product = productStore.get(id);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ success: true, product });
});

// POST /api/products - 商品追加
productsRouter.post('/', (req, res): void => {
  const body = req.body as ProductInput;
  const productData: Partial<Product> = {
    name: body.name,
    description: body.description,
    price: body.price,
    imageUrl: body.imageUrl,
    productUrl: body.productUrl,
    isActive: body.isActive ?? true,
  };
  const product = productStore.add(productData);
  res.status(201).json({ success: true, product });
});

// PUT /api/products/:id - 商品更新
productsRouter.put('/:id', (req, res): void => {
  const { id } = req.params;
  const body = req.body as Partial<ProductInput>;
  const updateData: Partial<Product> = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
    ...(body.productUrl !== undefined && { productUrl: body.productUrl }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  };
  const product = productStore.update(id, updateData);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ success: true, product });
});

// DELETE /api/products/:id - 商品削除
productsRouter.delete('/:id', (req, res): void => {
  const { id } = req.params;
  const deleted = productStore.delete(id);

  if (!deleted) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ success: true, message: 'Product deleted' });
});

// POST /api/products/bulk - 一括追加
productsRouter.post('/bulk', (req, res): void => {
  const body = req.body as BulkProductsInput;
  const { products } = body;

  if (!Array.isArray(products)) {
    res.status(400).json({ error: 'Products array required' });
    return;
  }

  const added = products.map((p: ProductInput) => {
    const productData: Partial<Product> = {
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl,
      isActive: p.isActive ?? true,
    };
    return productStore.add(productData);
  });
  res.status(201).json({
    success: true,
    count: added.length,
    products: added,
  });
});

// GET /api/products/search/:query - 商品検索
productsRouter.get('/search/:query', (req, res): void => {
  const { query } = req.params;
  const products = productStore.search(query);
  res.json({
    success: true,
    query,
    count: products.length,
    products,
  });
});
