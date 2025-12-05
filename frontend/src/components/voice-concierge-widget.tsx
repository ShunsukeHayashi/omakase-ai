import React, { useState, useEffect } from 'react';
import { Button, Card, Divider, Badge, Avatar } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

// --- Types ---

export type VoiceStatus = 'idle' | 'connecting' | 'active' | 'speaking' | 'listening';

export interface ProductSuggestion {
  id: string;
  title: string;
  price: string;
  imageUrl?: string;
}

export interface VoiceConciergeWidgetProps {
  status?: VoiceStatus;
  lastUtterance?: string;
  suggestion?: ProductSuggestion | null;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  onVoiceRepeat?: () => void;
  onAddToCart?: (productId: string) => void;
}

// --- SDUI Types for JSON Schema Support ---

export interface SDUIAction {
  type: string;
  payload?: Record<string, unknown>;
}

export interface SDUINode {
  type: string;
  key?: string;
  children?: SDUINode | SDUINode[];
  [key: string]: unknown;
}

// --- Helper Components ---

const WaveformBars = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-center justify-center gap-0.5 h-4">
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        className="w-0.5 rounded-full bg-primary"
        animate={isActive ? {
          height: [4, 12, 6, 14, 4],
        } : { height: 4 }}
        transition={isActive ? {
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.1,
          ease: 'easeInOut',
        } : { duration: 0.2 }}
      />
    ))}
  </div>
);

// --- Main Component ---

export const VoiceConciergeWidget: React.FC<VoiceConciergeWidgetProps> = ({
  status = 'idle',
  lastUtterance = 'Tap Talk to start shopping by voice.',
  suggestion = null,
  onVoiceStart,
  onVoiceStop,
  onVoiceRepeat,
  onAddToCart,
}) => {
  const [internalStatus, setInternalStatus] = useState<VoiceStatus>(status);

  useEffect(() => {
    setInternalStatus(status);
  }, [status]);

  const getStatusLabel = (): string => {
    switch (internalStatus) {
      case 'idle': return 'Idle';
      case 'connecting': return 'Connecting...';
      case 'active': return 'Active';
      case 'speaking': return 'Speaking';
      case 'listening': return 'Listening';
      default: return 'Idle';
    }
  };

  const getStatusColor = (): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary' => {
    switch (internalStatus) {
      case 'idle': return 'secondary';
      case 'connecting': return 'warning';
      case 'active': return 'success';
      case 'speaking': return 'primary';
      case 'listening': return 'danger';
      default: return 'secondary';
    }
  };

  const isActive = internalStatus !== 'idle';

  const handleStart = () => {
    setInternalStatus('connecting');
    onVoiceStart?.();
  };

  const handleStop = () => {
    setInternalStatus('idle');
    onVoiceStop?.();
  };

  const handleRepeat = () => {
    onVoiceRepeat?.();
  };

  const handleAddToCart = (productId: string) => {
    onAddToCart?.(productId);
  };

  return (
    <Card className="w-full max-w-sm p-4 bg-content1/90 backdrop-blur-md border border-default-200/50 shadow-lg">
      <div className="flex flex-col gap-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Voice Concierge</h3>
          <Badge
            content={getStatusLabel()}
            color={getStatusColor()}
            variant="flat"
            size="sm"
            className="px-2"
          >
            <span />
          </Badge>
        </div>

        {/* Action Buttons with Transition */}
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                color="primary"
                variant="shadow"
                startContent={<Icon icon="lucide:play" className="text-lg" />}
                onPress={handleStart}
                className="w-full bg-gradient-to-tr from-primary to-secondary"
              >
                Talk to Concierge
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <Button
                variant="bordered"
                startContent={<Icon icon="lucide:phone-off" className="text-lg" />}
                onPress={handleStop}
                className="flex-1"
              >
                Stop
              </Button>
              <Button
                variant="bordered"
                startContent={<Icon icon="lucide:refresh-cw" className="text-lg" />}
                onPress={handleRepeat}
                className="flex-1"
              >
                Repeat
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Utterance Display */}
        <div className="flex items-start gap-2">
          <Icon
            icon="lucide:sparkles"
            className={clsx(
              'text-sm mt-0.5 shrink-0',
              isActive ? 'text-primary' : 'text-foreground-400'
            )}
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className="text-sm text-foreground-500 line-clamp-2 flex-1">
              {lastUtterance}
            </p>
            {(internalStatus === 'speaking' || internalStatus === 'listening') && (
              <WaveformBars isActive={true} />
            )}
          </div>
        </div>

        {/* Product Suggestion */}
        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <Divider className="my-1" />
                <div className="flex items-center gap-3">
                  {/* Product Image */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-default-100 shrink-0">
                    {suggestion.imageUrl ? (
                      <Avatar
                        src={suggestion.imageUrl}
                        className="w-full h-full rounded-lg"
                        imgProps={{ className: 'object-cover' }}
                      />
                    ) : (
                      <Icon icon="lucide:image" className="text-xl text-foreground-400" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {suggestion.title}
                    </span>
                    <span className="text-xs text-foreground-500">
                      {suggestion.price}
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    color="primary"
                    size="sm"
                    variant="shadow"
                    onPress={() => handleAddToCart(suggestion.id)}
                    className="shrink-0 bg-gradient-to-tr from-primary to-secondary"
                  >
                    Add to cart
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

// --- SDUI Renderer ---

/**
 * Renders a VoiceConciergeWidget from SDUI JSON schema
 */
export const renderVoiceConciergeFromSDUI = (
  json: SDUINode,
  handlers: {
    onVoiceStart?: () => void;
    onVoiceStop?: () => void;
    onVoiceRepeat?: () => void;
    onAddToCart?: (productId: string) => void;
  }
): React.ReactElement => {
  // Extract data from SDUI JSON structure
  const extractStatus = (node: SDUINode): VoiceStatus => {
    const badgeNode = findNodeByType(node, 'Badge');
    if (badgeNode) {
      const label = (badgeNode.label as string)?.toLowerCase();
      if (label === 'idle') return 'idle';
      if (label === 'active') return 'active';
      if (label === 'connecting' || label === 'connecting...') return 'connecting';
      if (label === 'speaking') return 'speaking';
      if (label === 'listening') return 'listening';
    }
    return 'idle';
  };

  const extractUtterance = (node: SDUINode): string => {
    const textNodes = findAllNodesByType(node, 'Text');
    for (const textNode of textNodes) {
      const value = textNode.value as string;
      if (value && value.includes('Tap') || value.includes('voice')) {
        return value;
      }
    }
    return 'Tap Talk to start shopping by voice.';
  };

  const extractSuggestion = (node: SDUINode): ProductSuggestion | null => {
    const textNodes = findAllNodesByType(node, 'Text');
    const captionNode = findNodeByType(node, 'Caption');
    const buttonNode = findNodeByType(node, 'Button');

    // Look for product info pattern
    const titleNode = textNodes.find(n =>
      (n.weight === 'semibold' || n.weight === 'bold') &&
      n.value &&
      !(n.value as string).includes('Voice')
    );

    if (titleNode && captionNode) {
      const addAction = buttonNode?.onClickAction as SDUIAction | undefined;
      return {
        id: (addAction?.payload?.id as string) || 'unknown',
        title: titleNode.value as string,
        price: captionNode.value as string,
      };
    }

    return null;
  };

  const findNodeByType = (node: SDUINode, type: string): SDUINode | null => {
    if (node.type === type) return node;

    if (node.children) {
      const children = Array.isArray(node.children) ? node.children : [node.children];
      for (const child of children) {
        const found = findNodeByType(child, type);
        if (found) return found;
      }
    }
    return null;
  };

  const findAllNodesByType = (node: SDUINode, type: string): SDUINode[] => {
    const results: SDUINode[] = [];

    if (node.type === type) {
      results.push(node);
    }

    if (node.children) {
      const children = Array.isArray(node.children) ? node.children : [node.children];
      for (const child of children) {
        results.push(...findAllNodesByType(child, type));
      }
    }

    return results;
  };

  return (
    <VoiceConciergeWidget
      status={extractStatus(json)}
      lastUtterance={extractUtterance(json)}
      suggestion={extractSuggestion(json)}
      onVoiceStart={handlers.onVoiceStart}
      onVoiceStop={handlers.onVoiceStop}
      onVoiceRepeat={handlers.onVoiceRepeat}
      onAddToCart={handlers.onAddToCart}
    />
  );
};

export default VoiceConciergeWidget;
