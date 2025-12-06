import React from 'react';
import { Avatar, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { realtimeClient, type AgentConfig, type FunctionCallResult } from '../lib/realtime';
import { CartWidget, type CartAction } from './cart-widget';
import { useCartWidget } from '../hooks/useCartWidget';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// 音声セッション状態を集約
type SessionState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'error';

// カート関連のツール名
const CART_TOOLS = [
  'add_to_cart',
  'get_cart',
  'remove_from_cart',
  'place_order',
  'search_products',
  'get_recommendations',
] as const;

export const PreviewPhone = ({
  config,
  onHide,
}: {
  config: AgentConfig;
  onHide: () => void;
}) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sessionState, setSessionState] = React.useState<SessionState>('idle');
  const [inputText, setInputText] = React.useState('');
  const [showCart, setShowCart] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const isConnecting = sessionState === 'connecting';
  const isConnected = sessionState === 'connected' || sessionState === 'speaking';
  const isSpeaking = sessionState === 'speaking';

  // カートウィジェットの状態管理
  const { state: cartState, handleToolCall } = useCartWidget({
    onOrderComplete: (order) => {
      addMessage('system', `注文完了: ${order.orderNumber}`);
    },
  });

  // Function call結果を処理してカートウィジェットを更新
  const handleFunctionCallResult = React.useCallback((result: FunctionCallResult) => {
    console.log('[UI] Function call result:', result.name, result.result);
    handleToolCall(result.name, result.result);

    // カート関連のツールが呼ばれたらカートを表示
    if (CART_TOOLS.includes(result.name as typeof CART_TOOLS[number])) {
      setShowCart(true);
    }
  }, [handleToolCall]);

  // カートアクションのハンドラ（将来の拡張用）
  const handleCartAction = React.useCallback((action: CartAction) => {
    console.log('[UI] Cart action:', action);
    // 現在は音声経由でのみ操作、将来的にUIからの操作も追加可能
  }, []);

  // カートウィジェットに表示するコンテンツがあるかどうか
  const hasCartContent = React.useMemo(() => {
    return cartState.items.length > 0 ||
           cartState.suggestions.length > 0 ||
           cartState.orderResult !== null;
  }, [cartState.items, cartState.suggestions, cartState.orderResult]);

  // 初期メッセージを表示（会話中のリセットを避ける）
  const initialGreetingShown = React.useRef(false);
  React.useEffect(() => {
    if (initialGreetingShown.current) return;
    if (config.startMessage) {
      setMessages([{
        id: 'initial',
        role: 'assistant',
        content: config.startMessage,
        timestamp: new Date(),
      }]);
      initialGreetingShown.current = true;
    }
  }, [config.startMessage]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: Message['role'], content: string, isError = false) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role,
        content,
        timestamp: new Date(),
        isError,
      },
    ]);
  };

  // 共通コールバック設定（重複を排除）
  const setupCallbacks = React.useCallback(() => {
    realtimeClient.setCallbacks({
      onConnected: () => {
        setSessionState('connected');
        setConnectionError(null);
        addMessage('system', '音声セッションを開始しました');
      },
      onDisconnected: () => {
        setSessionState('idle');
        addMessage('system', '音声セッションを終了しました');
      },
      onTranscript: (text, role) => {
        addMessage(role, text);
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setConnectionError(error.message);
        setSessionState('error');
        addMessage('system', `エラー: ${error.message}`, true);
      },
      onAudioStart: () => {
        setSessionState('speaking');
      },
      onAudioEnd: () => {
        setSessionState('connected');
      },
      onFunctionCall: handleFunctionCallResult,
    });
  }, [handleFunctionCallResult]);

  // 音声セッションを開始
  const startVoiceSession = async () => {
    if (isConnecting || isConnected) return;

    setSessionState('connecting');
    setConnectionError(null);

    try {
      setupCallbacks();
      realtimeClient.setConfig(config);
      await realtimeClient.connect();
    } catch (error) {
      console.error('Failed to start voice session:', error);
      const errorMessage = error instanceof Error ? error.message : '接続に失敗しました';
      setConnectionError(errorMessage);
      setSessionState('error');
      addMessage('system', `接続エラー: ${errorMessage}`, true);
    }
  };

  // 音声セッションを終了
  const stopVoiceSession = () => {
    realtimeClient.disconnect();
    setSessionState('idle');
  };

  // エラー状態からの復帰
  const retryConnection = () => {
    setConnectionError(null);
    setSessionState('idle');
    startVoiceSession();
  };

  // テキストメッセージを送信
  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    addMessage('user', text);

    try {
      if (!isConnected) {
        // 接続していない場合は接続してから送信
        // 接続完了後にメッセージを送信するコールバックを設定
        realtimeClient.setCallbacks({
          onConnected: async () => {
            setSessionState('connected');
            setConnectionError(null);
            addMessage('system', '音声セッションを開始しました');
            // 接続完了後にメッセージ送信
            try {
              await realtimeClient.sendMessage(text);
            } catch (sendError) {
              console.error('Failed to send message after connect:', sendError);
              addMessage('system', 'メッセージの送信に失敗しました', true);
            }
          },
          onDisconnected: () => {
            setSessionState('idle');
            addMessage('system', '音声セッションを終了しました');
          },
          onTranscript: (transcript, role) => {
            addMessage(role, transcript);
          },
          onError: (error) => {
            console.error('Voice error:', error);
            setConnectionError(error.message);
            setSessionState('error');
            addMessage('system', `エラー: ${error.message}`, true);
          },
          onAudioStart: () => setSessionState('speaking'),
          onAudioEnd: () => setSessionState('connected'),
          onFunctionCall: handleFunctionCallResult,
        });

        realtimeClient.setConfig(config);
        setSessionState('connecting');
        await realtimeClient.connect();
      } else {
        await realtimeClient.sendMessage(text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'メッセージの送信に失敗しました';
      addMessage('system', errorMessage, true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      realtimeClient.disconnect();
    };
  }, []);

  return (
    <aside className="sticky top-8">
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" className="gap-2 text-slate-500 hover:text-slate-900" onPress={onHide}>
          <Icon icon="lucide:eye-off" />
          Hide preview
        </Button>
      </div>

      {/* Phone Frame */}
      <div className="relative mx-auto w-[380px] overflow-hidden rounded-[48px] border-8 border-slate-900 bg-slate-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)]">
        {/* Dynamic Island / Notch */}
        <div className="absolute left-1/2 top-0 z-20 h-7 w-32 -translate-x-1/2 rounded-b-2xl bg-black"></div>
        
        {/* Screen Content */}
        <div className="relative h-[780px] w-full bg-white rounded-[40px] overflow-hidden flex flex-col">
          
          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-xs font-medium text-slate-900">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Icon icon="lucide:signal" className="text-[10px]" />
              <Icon icon="lucide:wifi" className="text-[10px]" />
              <Icon icon="lucide:battery-full" className="text-[10px]" />
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md sticky top-0 z-10">
            <div className="relative">
              <motion.div
                animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Avatar
                  className="h-10 w-10 ring-2 ring-slate-50"
                  src={
                    config.avatarUrl ??
                    'https://img.heroui.chat/image/avatar?w=128&h=128&u=agent_preview'
                  }
                />
              </motion.div>
              <AnimatePresence>
                {isConnected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isSpeaking ? 'bg-green-500' : 'bg-blue-500'}`}
                  >
                    {isSpeaking && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Connection ring animation */}
              {isConnecting && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-indigo-500"
                  animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{config.name || 'Agent'}</p>
              <motion.p
                key={isConnecting ? 'connecting' : isConnected ? (isSpeaking ? 'speaking' : 'listening') : 'idle'}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`truncate text-xs ${
                  isConnected
                    ? isSpeaking
                      ? 'text-green-600'
                      : 'text-blue-600'
                    : isConnecting
                      ? 'text-indigo-600'
                      : 'text-slate-500'
                }`}
              >
                {isConnecting
                  ? 'Connecting...'
                  : isConnected
                    ? isSpeaking
                      ? '🎙 Speaking...'
                      : '👂 Listening...'
                    : 'Tap mic to start'}
              </motion.p>
            </div>
            <Button isIconOnly size="sm" variant="ghost" className="rounded-full text-slate-400 hover:bg-slate-50">
              <Icon icon="lucide:more-vertical" className="text-lg" />
            </Button>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index === messages.length - 1 ? 0 : 0,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className={`flex w-full ${
                    msg.role === 'user'
                      ? 'justify-end'
                      : msg.role === 'system'
                        ? 'justify-center'
                        : 'justify-start items-end gap-2'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                    >
                      <Avatar
                        className="h-6 w-6 shrink-0 mb-1 opacity-80"
                        src={
                          config.avatarUrl ??
                          'https://img.heroui.chat/image/avatar?w=96&h=96&u=agent_preview_bubble'
                        }
                      />
                    </motion.div>
                  )}

                  {msg.role === 'system' ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="my-2 rounded-full bg-slate-200/50 px-3 py-1 text-[10px] font-medium text-slate-500"
                    >
                      {msg.content}
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-sm'
                          : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                      }`}
                    >
                      {msg.content}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Cart Widget - Voice Agentからのツールコール結果で表示 */}
            <AnimatePresence>
              {showCart && hasCartContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-4"
                >
                  <CartWidget
                    items={cartState.items}
                    summary={cartState.summary}
                    suggestions={cartState.suggestions}
                    isLoading={cartState.isLoading}
                    lastAction={cartState.lastAction}
                    orderResult={cartState.orderResult}
                    onAction={handleCartAction}
                    className="shadow-lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input Area */}
          <div className="border-t border-slate-100 bg-white p-4 pb-8">
            {config.voiceOn ? (
              <div className="flex flex-col items-center gap-4">
                {/* エラー状態の表示 */}
                {sessionState === 'error' && connectionError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                  >
                    <Icon icon="lucide:alert-circle" className="text-sm" />
                    <span className="flex-1">{connectionError}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 min-w-0 px-2 text-xs text-red-600 hover:bg-red-100"
                      onPress={retryConnection}
                    >
                      再試行
                    </Button>
                  </motion.div>
                )}

                <div className="relative">
                  {/* Pulsing ring for speaking state */}
                  {isSpeaking && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full bg-green-400"
                        animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-green-400"
                        animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                      />
                    </>
                  )}
                  {/* Connecting animation */}
                  {isConnecting && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-indigo-400"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      style={{ borderTopColor: 'transparent' }}
                    />
                  )}
                  {/* Error state ring */}
                  {sessionState === 'error' && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-red-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      isIconOnly
                      className={`h-16 w-16 rounded-full shadow-lg transition-colors ${
                        sessionState === 'error'
                          ? 'bg-red-100 hover:bg-red-200 text-red-600'
                          : isConnected
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                      onPress={sessionState === 'error' ? retryConnection : isConnected ? stopVoiceSession : startVoiceSession}
                      isDisabled={isConnecting}
                    >
                      <motion.div
                        animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      >
                        <Icon
                          icon={sessionState === 'error' ? 'lucide:refresh-cw' : isConnected ? 'lucide:phone-off' : 'lucide:mic'}
                          className="text-2xl"
                        />
                      </motion.div>
                    </Button>
                  </motion.div>
                </div>
                <motion.span
                  key={sessionState}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs font-medium ${
                    sessionState === 'error'
                      ? 'text-red-500'
                      : isConnected
                        ? 'text-red-500'
                        : isConnecting
                          ? 'text-indigo-500'
                          : 'text-slate-500'
                  }`}
                >
                  {sessionState === 'error'
                    ? 'Tap to retry'
                    : isConnecting
                      ? 'Connecting...'
                      : isConnected
                        ? 'Tap to end session'
                        : 'Tap to start voice session'}
                </motion.span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-1.5 pl-4 transition-colors focus-within:border-slate-300 focus-within:bg-white">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button 
                  isIconOnly 
                  size="sm" 
                  className="rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800" 
                  onPress={sendTextMessage}
                >
                  <Icon icon="lucide:arrow-up" className="text-lg" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
