import React from 'react';
import { Card, CardBody, Divider, Chip, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { clsx } from 'clsx';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface CartDisplayProps {
  items: CartItem[];
  subtotal: number;
  tax?: number;
  total?: number;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onRemoveItem?: (productId: string) => void;
  onCheckout?: () => void;
  className?: string;
}

export const CartDisplay: React.FC<CartDisplayProps> = ({
  items,
  subtotal,
  tax,
  total,
  isMinimized = false,
  onToggleMinimize,
  onRemoveItem,
  onCheckout,
  className,
}) => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const displayTotal = total ?? (tax ? subtotal + tax : subtotal);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={clsx('transition-all duration-300', className)}>
      {/* Minimized View - Just a badge */}
      {isMinimized ? (
        <Button
          size="sm"
          variant="flat"
          className="gap-2 bg-primary/10 text-primary"
          onPress={onToggleMinimize}
        >
          <Icon icon="lucide:shopping-cart" className="text-lg" />
          <span className="font-semibold">{itemCount}</span>
          <span className="text-xs text-foreground-500">
            {displayTotal.toLocaleString()}
          </span>
        </Button>
      ) : (
        /* Expanded View */
        <Card
          shadow="sm"
          className="border border-default-200/50 bg-content1/90 backdrop-blur-sm"
        >
          <CardBody className="p-3 gap-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon icon="lucide:shopping-cart" className="text-primary" />
                <span className="text-sm font-semibold">
                  {itemCount}
                </span>
              </div>
              {onToggleMinimize && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onToggleMinimize}
                >
                  <Icon icon="lucide:minus" className="text-sm" />
                </Button>
              )}
            </div>

            <Divider className="my-1" />

            {/* Items List */}
            <div className="max-h-32 overflow-y-auto space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate">{item.productName}</span>
                    {item.quantity > 1 && (
                      <Chip size="sm" variant="flat" className="h-4 min-w-fit">
                        x{item.quantity}
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground-500">
                      {(item.price * item.quantity).toLocaleString()}
                    </span>
                    {onRemoveItem && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 min-w-5"
                        onPress={() => onRemoveItem(item.productId)}
                      >
                        <Icon icon="lucide:x" className="text-xs text-danger" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Divider className="my-1" />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-foreground-500">
                <span>{subtotal.toLocaleString()}</span>
              </div>
              {tax !== undefined && (
                <div className="flex justify-between text-foreground-500">
                  <span>{tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-sm">
                <span>{displayTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button */}
            {onCheckout && (
              <Button
                size="sm"
                color="primary"
                variant="shadow"
                className="w-full mt-1 bg-gradient-to-r from-primary to-secondary"
                onPress={onCheckout}
              >
                <Icon icon="lucide:credit-card" className="mr-1" />
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default CartDisplay;
