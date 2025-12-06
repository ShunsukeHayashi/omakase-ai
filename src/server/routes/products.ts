/**
 * Products Router - 商品管理API
 */

import { Router, type Request } from 'express';
import type { Product } from '../../types/index.js';
import { productStore } from '../services/store.js';

export const productsRouter = Router();

const getWorkspaceId = (req: Request): string => {
  const headerVal = req.headers['x-workspace-id'];
  if (Array.isArray(headerVal)) return headerVal[0] || 'default';
  return (headerVal as string)?.trim() || 'default';
};

// Request body types
interface ProductInput {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
  isActive?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

interface StockUpdateInput {
  quantity: number;
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
  const workspaceId = getWorkspaceId(req);
  const productData: Partial<Product> = {
    name: body.name,
    description: body.description,
    price: body.price,
    imageUrl: body.imageUrl,
    productUrl: body.productUrl,
    isActive: body.isActive ?? true,
    stockQuantity: body.stockQuantity,
    lowStockThreshold: body.lowStockThreshold,
  };
  const product = productStore.add(productData, workspaceId);
  res.status(201).json({ success: true, product });
});

// PUT /api/products/:id - 商品更新
productsRouter.put('/:id', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const body = req.body as Partial<ProductInput>;
  const updateData: Partial<Product> = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
    ...(body.productUrl !== undefined && { productUrl: body.productUrl }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.stockQuantity !== undefined && { stockQuantity: body.stockQuantity }),
    ...(body.lowStockThreshold !== undefined && { lowStockThreshold: body.lowStockThreshold }),
  };
  const product = productStore.update(id, updateData, workspaceId);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ success: true, product });
});

// DELETE /api/products/:id - 商品削除
productsRouter.delete('/:id', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const deleted = productStore.delete(id, workspaceId);

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
  const workspaceId = getWorkspaceId(req);

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
    return productStore.add(productData, workspaceId);
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
  const workspaceId = getWorkspaceId(req);
  const products = productStore.search(query, workspaceId);
  res.json({
    success: true,
    query,
    count: products.length,
    products,
  });
});

// ==================== 在庫管理 API ====================

// GET /api/products/:id/stock - 在庫状況取得
productsRouter.get('/:id/stock', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const stockStatus = productStore.getStockStatus(id, workspaceId);

  if (!stockStatus) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({ success: true, ...stockStatus });
});

// PUT /api/products/:id/stock - 在庫数量更新
productsRouter.put('/:id/stock', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const body = req.body as StockUpdateInput;

  if (typeof body.quantity !== 'number') {
    res.status(400).json({ error: 'Quantity must be a number' });
    return;
  }

  const product = productStore.updateStock(id, body.quantity, workspaceId);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const stockStatus = productStore.getStockStatus(id, workspaceId);
  res.json({
    success: true,
    product,
    stockStatus,
  });
});

// POST /api/products/:id/stock/decrement - 在庫減少（購入時）
productsRouter.post('/:id/stock/decrement', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const body = req.body as { amount?: number };
  const amount = body.amount ?? 1;

  const result = productStore.decrementStock(id, amount, workspaceId);

  if (!result.success) {
    res.status(result.error === '商品が見つかりません' ? 404 : 400).json({
      success: false,
      error: result.error,
      product: result.product,
    });
    return;
  }

  const stockStatus = productStore.getStockStatus(id, workspaceId);
  res.json({
    success: true,
    product: result.product,
    stockStatus,
  });
});

// POST /api/products/:id/stock/increment - 在庫増加（入荷時）
productsRouter.post('/:id/stock/increment', (req, res): void => {
  const { id } = req.params;
  const workspaceId = getWorkspaceId(req);
  const body = req.body as { amount?: number };
  const amount = body.amount ?? 1;

  const product = productStore.incrementStock(id, amount, workspaceId);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const stockStatus = productStore.getStockStatus(id, workspaceId);
  res.json({
    success: true,
    product,
    stockStatus,
  });
});

// GET /api/products/inventory/low-stock - 在庫少商品一覧
productsRouter.get('/inventory/low-stock', (req, res): void => {
  const workspaceId = getWorkspaceId(req);
  const products = productStore.getLowStockProducts(workspaceId);
  res.json({
    success: true,
    count: products.length,
    products,
  });
});

// GET /api/products/inventory/out-of-stock - 在庫切れ商品一覧
productsRouter.get('/inventory/out-of-stock', (req, res): void => {
  const workspaceId = getWorkspaceId(req);
  const products = productStore.getOutOfStockProducts(workspaceId);
  res.json({
    success: true,
    count: products.length,
    products,
  });
});

// DELETE /api/products - 全商品削除
productsRouter.delete('/', (req, res): void => {
  const workspaceId = getWorkspaceId(req);
  productStore.clear(workspaceId);
  res.json({ success: true, message: 'All products cleared' });
});
