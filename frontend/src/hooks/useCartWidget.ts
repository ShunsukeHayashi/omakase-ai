/**
 * useCartWidget Hook
 *
 * Voice Agentからのツールコール結果を受け取り、
 * カートウィジェットの状態を管理するカスタムフック
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CartItem,
  CartSummary,
  ProductSuggestion,
  PlaceOrderResult,
  CartAction,
  handleToolCallResult,
} from '../components/cart-widget';

// Tool call event from WebSocket
export interface ToolCallEvent {
  type: 'response.function_call_arguments.done';
  name: string;
  call_id: string;
  arguments: string;
}

// Function call output from server
export interface FunctionCallOutput {
  name: string;
  output: unknown;
}

export interface CartWidgetState {
  items: CartItem[];
  summary?: CartSummary;
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  lastAction?: string;
  orderResult?: PlaceOrderResult | null;
}

export interface UseCartWidgetOptions {
  onAction?: (action: CartAction) => void;
  onOrderComplete?: (order: PlaceOrderResult) => void;
}

export interface UseCartWidgetReturn {
  state: CartWidgetState;
  handleToolCall: (functionName: string, result: unknown) => void;
  handleAction: (action: CartAction) => void;
  reset: () => void;
  setLoading: (loading: boolean) => void;
}

const initialState: CartWidgetState = {
  items: [],
  suggestions: [],
  isLoading: false,
  lastAction: undefined,
  orderResult: null,
};

/**
 * カートウィジェットの状態管理フック
 */
export function useCartWidget(options: UseCartWidgetOptions = {}): UseCartWidgetReturn {
  const [state, setState] = useState<CartWidgetState>(initialState);
  const lastActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear lastAction after a delay
  useEffect(() => {
    if (state.lastAction) {
      if (lastActionTimeoutRef.current) {
        clearTimeout(lastActionTimeoutRef.current);
      }
      lastActionTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, lastAction: undefined }));
      }, 3000);
    }

    return () => {
      if (lastActionTimeoutRef.current) {
        clearTimeout(lastActionTimeoutRef.current);
      }
    };
  }, [state.lastAction]);

  /**
   * ツールコール結果を処理
   */
  const handleToolCall = useCallback((functionName: string, result: unknown) => {
    setState((prevState) => {
      const newState = handleToolCallResult(functionName, result, {
        items: prevState.items,
        summary: prevState.summary,
        suggestions: prevState.suggestions,
        orderResult: prevState.orderResult,
      });

      // Order complete callback
      if (functionName === 'place_order' && newState.orderResult?.success) {
        options.onOrderComplete?.(newState.orderResult);
      }

      return {
        ...prevState,
        ...newState,
        isLoading: false,
      };
    });
  }, [options]);

  /**
   * カートアクションを処理
   */
  const handleAction = useCallback((action: CartAction) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    options.onAction?.(action);
  }, [options]);

  /**
   * 状態をリセット
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * ローディング状態を設定
   */
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  return {
    state,
    handleToolCall,
    handleAction,
    reset,
    setLoading,
  };
}

/**
 * WebSocketイベントからツールコールを検出して処理するヘルパー
 */
export function createToolCallHandler(
  handleToolCall: (functionName: string, result: unknown) => void
) {
  return (event: Record<string, unknown>) => {
    // Function call完了イベント
    if (event.type === 'response.function_call_arguments.done') {
      const toolEvent = event as unknown as ToolCallEvent;
      console.log('[Tool Call]', toolEvent.name);

      // argumentsはJSON文字列なのでパース
      try {
        const args = JSON.parse(toolEvent.arguments);
        // この時点ではまだ結果がないので、call_idを記録しておく
        // 結果は別のイベントで来る
        console.log('[Tool Call Args]', toolEvent.name, args);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    // Function callの結果（サーバーから返ってくる）
    // WebSocket handlerで処理された後、クライアントに転送される
    if (event.type === 'function_call_result') {
      const resultEvent = event as { name: string; result: unknown };
      handleToolCall(resultEvent.name, resultEvent.result);
    }
  };
}

export default useCartWidget;
