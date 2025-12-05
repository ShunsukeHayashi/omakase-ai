/**
 * Cart Widget - Voice Agent Tool Call対応カートウィジェット
 *
 * Voice Agentからのツールコール結果を受け取り、
 * カート操作UIを表示するServer-Driven UIコンポーネント
 */

import React, { useState, useCallback } from 'react';
import { Card, CardBody, Button, Divider, Chip, Badge, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

// --- Types ---

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  imageUrl?: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax?: number;
  total?: number;
  formattedTotal?: string;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

// Tool call result types from Voice Agent
export interface AddToCartResult {
  success: boolean;
  message?: string;
  error?: string;
  cartSummary?: CartSummary;
}

export interface GetCartResult {
  itemCount: number;
  subtotal: number;
  items: CartItem[];
  formattedTotal: string;
}

export interface PlaceOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  itemCount?: number;
  subtotal?: number;
  tax?: number;
  total?: number;
  formattedTotal?: string;
  message?: string;
  error?: string;
  status?: string;
}

export interface SearchProductsResult {
  count: number;
  products: ProductSuggestion[];
}

// Widget action types
export type CartAction =
  | { type: 'cart.add'; payload: { productId: string; quantity?: number } }
  | { type: 'cart.remove'; payload: { productId: string } }
  | { type: 'cart.update'; payload: { productId: string; quantity: number } }
  | { type: 'cart.clear' }
  | { type: 'cart.checkout' }
  | { type: 'product.select'; payload: { productId: string } };

export interface CartWidgetProps {
  items?: CartItem[];
  summary?: CartSummary;
  suggestions?: ProductSuggestion[];
  isLoading?: boolean;
  lastAction?: string;
  orderResult?: PlaceOrderResult | null;
  onAction?: (action: CartAction) => void;
  className?: string;
}

// --- Helper Components ---

const CartItemRow: React.FC<{
  item: CartItem;
  onRemove?: () => void;
  onUpdateQuantity?: (quantity: number) => void;
}> = ({ item, onRemove, onUpdateQuantity }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="flex items-center gap-3 py-2"
  >
    {/* Product Image */}
    <div className="w-12 h-12 rounded-lg bg-default-100 flex items-center justify-center overflow-hidden shrink-0">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <Icon icon="lucide:package" className="text-xl text-default-400" />
      )}
    </div>

    {/* Product Info */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{item.name}</p>
      <div className="flex items-center gap-2 text-xs text-foreground-500">
        <span>¥{item.price.toLocaleString()}</span>
        <span>×</span>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className="h-5 w-5 min-w-5"
            onPress={() => onUpdateQuantity?.(item.quantity - 1)}
            isDisabled={item.quantity <= 1}
          >
            <Icon icon="lucide:minus" className="text-xs" />
          </Button>
          <span className="w-6 text-center font-medium">{item.quantity}</span>
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            className="h-5 w-5 min-w-5"
            onPress={() => onUpdateQuantity?.(item.quantity + 1)}
          >
            <Icon icon="lucide:plus" className="text-xs" />
          </Button>
        </div>
      </div>
    </div>

    {/* Total & Remove */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">¥{item.total.toLocaleString()}</span>
      {onRemove && (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          className="h-6 w-6 min-w-6"
          onPress={onRemove}
        >
          <Icon icon="lucide:trash-2" className="text-sm" />
        </Button>
      )}
    </div>
  </motion.div>
);

const ProductSuggestionCard: React.FC<{
  product: ProductSuggestion;
  onAddToCart?: () => void;
  onSelect?: () => void;
}> = ({ product, onAddToCart, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center gap-3 p-2 rounded-lg bg-default-50 hover:bg-default-100 transition-colors cursor-pointer"
    onClick={onSelect}
  >
    <div className="w-10 h-10 rounded-md bg-default-200 flex items-center justify-center overflow-hidden shrink-0">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <Icon icon="lucide:box" className="text-lg text-default-400" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{product.name}</p>
      <p className="text-xs text-foreground-500">¥{product.price.toLocaleString()}</p>
    </div>
    <Button
      size="sm"
      color="primary"
      variant="flat"
      onPress={() => {
        onAddToCart?.();
      }}
    >
      <Icon icon="lucide:plus" className="mr-1" />
      追加
    </Button>
  </motion.div>
);

const OrderConfirmation: React.FC<{
  order: PlaceOrderResult;
  onClose?: () => void;
}> = ({ order, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-4"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
      <Icon icon="lucide:check" className="text-3xl text-success" />
    </div>
    <h3 className="text-lg font-bold mb-1">ご注文ありがとうございます！</h3>
    <p className="text-sm text-foreground-500 mb-4">{order.message}</p>

    <div className="bg-default-100 rounded-lg p-3 mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span>注文番号</span>
        <span className="font-mono font-bold">{order.orderNumber}</span>
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span>商品点数</span>
        <span>{order.itemCount}点</span>
      </div>
      <Divider className="my-2" />
      <div className="flex justify-between font-bold">
        <span>合計</span>
        <span className="text-primary">{order.formattedTotal}</span>
      </div>
    </div>

    {onClose && (
      <Button color="primary" variant="flat" onPress={onClose}>
        閉じる
      </Button>
    )}
  </motion.div>
);

// --- Main Component ---

export const CartWidget: React.FC<CartWidgetProps> = ({
  items = [],
  summary,
  suggestions = [],
  isLoading = false,
  lastAction,
  orderResult,
  onAction,
  className,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const itemCount = summary?.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = summary?.subtotal ?? items.reduce((sum, item) => sum + item.total, 0);
  const total = summary?.total ?? subtotal;

  const handleAddToCart = useCallback(
    (productId: string, quantity = 1) => {
      onAction?.({ type: 'cart.add', payload: { productId, quantity } });
    },
    [onAction]
  );

  const handleRemoveFromCart = useCallback(
    (productId: string) => {
      onAction?.({ type: 'cart.remove', payload: { productId } });
    },
    [onAction]
  );

  const handleUpdateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        handleRemoveFromCart(productId);
      } else {
        onAction?.({ type: 'cart.update', payload: { productId, quantity } });
      }
    },
    [onAction, handleRemoveFromCart]
  );

  const handleCheckout = useCallback(() => {
    onAction?.({ type: 'cart.checkout' });
  }, [onAction]);

  const handleSelectProduct = useCallback(
    (productId: string) => {
      onAction?.({ type: 'product.select', payload: { productId } });
    },
    [onAction]
  );

  // Show order confirmation
  if (orderResult?.success) {
    return (
      <Card className={clsx('w-full max-w-sm', className)}>
        <CardBody>
          <OrderConfirmation
            order={orderResult}
            onClose={() => onAction?.({ type: 'cart.clear' })}
          />
        </CardBody>
      </Card>
    );
  }

  // Minimized view
  if (isMinimized && itemCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx('fixed bottom-4 right-4 z-50', className)}
      >
        <Badge content={itemCount} color="primary" size="lg">
          <Button
            isIconOnly
            size="lg"
            color="primary"
            variant="shadow"
            className="h-14 w-14 rounded-full"
            onPress={() => setIsMinimized(false)}
          >
            <Icon icon="lucide:shopping-cart" className="text-2xl" />
          </Button>
        </Badge>
      </motion.div>
    );
  }

  return (
    <Card className={clsx('w-full max-w-sm', className)}>
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:shopping-cart" className="text-xl text-primary" />
            <h3 className="font-bold">カート</h3>
            {itemCount > 0 && (
              <Chip size="sm" color="primary" variant="flat">
                {itemCount}点
              </Chip>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isLoading && <Spinner size="sm" />}
            {itemCount > 0 && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => setIsMinimized(true)}
              >
                <Icon icon="lucide:minimize-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Last Action Feedback */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-sm">
                <Icon icon="lucide:check-circle" />
                <span>{lastAction}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Items */}
        {items.length > 0 ? (
          <>
            <div className="max-h-48 overflow-y-auto -mx-2 px-2">
              <AnimatePresence>
                {items.map((item) => (
                  <CartItemRow
                    key={item.productId}
                    item={item}
                    onRemove={() => handleRemoveFromCart(item.productId)}
                    onUpdateQuantity={(qty) => handleUpdateQuantity(item.productId, qty)}
                  />
                ))}
              </AnimatePresence>
            </div>

            <Divider className="my-3" />

            {/* Summary */}
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between text-foreground-500">
                <span>小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              {summary?.tax !== undefined && (
                <div className="flex justify-between text-foreground-500">
                  <span>消費税</span>
                  <span>¥{summary.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>合計</span>
                <span className="text-primary">¥{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              color="primary"
              variant="shadow"
              className="w-full bg-gradient-to-r from-primary to-secondary"
              onPress={handleCheckout}
              isDisabled={isLoading}
            >
              <Icon icon="lucide:credit-card" className="mr-2" />
              購入手続きへ
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Icon icon="lucide:shopping-bag" className="text-4xl text-default-300 mx-auto mb-2" />
            <p className="text-sm text-foreground-500">カートは空です</p>
            <p className="text-xs text-foreground-400 mt-1">
              音声で「カートに追加して」と言ってください
            </p>
          </div>
        )}

        {/* Product Suggestions */}
        {suggestions.length > 0 && (
          <>
            <Divider className="my-4" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:sparkles" className="text-warning" />
                <span className="text-sm font-medium">おすすめ商品</span>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => setShowSuggestions(!showSuggestions)}
              >
                <Icon icon={showSuggestions ? 'lucide:chevron-up' : 'lucide:chevron-down'} />
              </Button>
            </div>
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {suggestions.slice(0, 3).map((product) => (
                    <ProductSuggestionCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => handleAddToCart(product.id)}
                      onSelect={() => handleSelectProduct(product.id)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </CardBody>
    </Card>
  );
};

// --- Tool Call Result Handler ---

/**
 * Voice Agentのツールコール結果からカートウィジェットの状態を更新する
 */
export function handleToolCallResult(
  functionName: string,
  result: unknown,
  currentState: {
    items: CartItem[];
    summary?: CartSummary;
    suggestions: ProductSuggestion[];
    orderResult?: PlaceOrderResult | null;
  }
): {
  items: CartItem[];
  summary?: CartSummary;
  suggestions: ProductSuggestion[];
  lastAction?: string;
  orderResult?: PlaceOrderResult | null;
} {
  switch (functionName) {
    case 'add_to_cart': {
      const addResult = result as AddToCartResult;
      return {
        ...currentState,
        summary: addResult.cartSummary,
        lastAction: addResult.success ? addResult.message : undefined,
      };
    }

    case 'get_cart': {
      const cartResult = result as GetCartResult;
      return {
        ...currentState,
        items: cartResult.items,
        summary: {
          itemCount: cartResult.itemCount,
          subtotal: cartResult.subtotal,
        },
      };
    }

    case 'remove_from_cart': {
      const removeResult = result as AddToCartResult;
      return {
        ...currentState,
        summary: removeResult.cartSummary,
        lastAction: removeResult.success ? removeResult.message : undefined,
      };
    }

    case 'search_products':
    case 'get_recommendations': {
      const searchResult = result as SearchProductsResult;
      return {
        ...currentState,
        suggestions: searchResult.products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
        })),
      };
    }

    case 'place_order': {
      const orderResult = result as PlaceOrderResult;
      return {
        ...currentState,
        orderResult,
        items: orderResult.success ? [] : currentState.items,
        lastAction: orderResult.success ? undefined : orderResult.error,
      };
    }

    case 'clear_cart': {
      return {
        ...currentState,
        items: [],
        summary: { itemCount: 0, subtotal: 0 },
        lastAction: 'カートを空にしました',
        orderResult: null,
      };
    }

    default:
      return currentState;
  }
}

export default CartWidget;
