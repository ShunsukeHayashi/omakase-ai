import React from 'react';
import { Avatar, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
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

export const PreviewPhone = ({
  config,
  onHide,
}: {
  config: AgentConfig;
  onHide: () => void;
}) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [inputText, setInputText] = React.useState('');
  const [showCart, setShowCart] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

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
    const cartTools = ['add_to_cart', 'get_cart', 'remove_from_cart', 'place_order', 'search_products', 'get_recommendations'];
    if (cartTools.includes(result.name)) {
      setShowCart(true);
    }
  }, [handleToolCall]);

  // カートアクションのハンドラ（将来の拡張用）
  const handleCartAction = React.useCallback((action: CartAction) => {
    console.log('[UI] Cart action:', action);
    // 現在は音声経由でのみ操作、将来的にUIからの操作も追加可能
  }, []);

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

  // 音声セッションを開始
  const startVoiceSession = async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);

    try {
      // コールバックを設定
      realtimeClient.setCallbacks({
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
          addMessage('system', '音声セッションを開始しました');
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsSpeaking(false);
          addMessage('system', '音声セッションを終了しました');
        },
        onTranscript: (text, role) => {
          addMessage(role, text);
        },
        onError: (error) => {
          console.error('Voice error:', error);
          addMessage('system', error.message, true);
          setIsConnecting(false);
        },
        onAudioStart: () => {
          setIsSpeaking(true);
        },
        onAudioEnd: () => {
          setIsSpeaking(false);
        },
        onFunctionCall: handleFunctionCallResult,
      });

      // 設定を適用
      realtimeClient.setConfig(config);

      // 接続
      await realtimeClient.connect();
    } catch (error) {
      console.error('Failed to start voice session:', error);
      setIsConnecting(false);
    }
  };

  // 音声セッションを終了
  const stopVoiceSession = () => {
    realtimeClient.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
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
        realtimeClient.setCallbacks({
          onConnected: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            await realtimeClient.sendMessage(text);
          },
          onDisconnected: () => {
            setIsConnected(false);
            setIsSpeaking(false);
          },
          onTranscript: (transcript, role) => {
            addMessage(role, transcript);
          },
          onError: (error) => {
            console.error('Voice error:', error);
            addMessage('system', error.message, true);
          },
          onAudioStart: () => setIsSpeaking(true),
          onAudioEnd: () => setIsSpeaking(false),
          onFunctionCall: handleFunctionCallResult,
        });
        realtimeClient.setConfig(config);
        setIsConnecting(true);
        await realtimeClient.connect();
      } else {
        await realtimeClient.sendMessage(text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage('system', 'メッセージの送信に失敗しました', true);
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
              <Avatar
                className="h-10 w-10 ring-2 ring-slate-50"
                src={
                  config.avatarUrl ??
                  'https://img.heroui.chat/image/avatar?w=128&h=128&u=agent_preview'
                }
              />
              {isConnected && (
                <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{config.name || 'Agent'}</p>
              <p className="truncate text-xs text-slate-500">
                {isConnecting
                  ? 'Connecting...'
                  : isConnected
                    ? isSpeaking
                      ? 'Speaking...'
                      : 'Listening...'
                    : 'Tap mic to start'}
              </p>
            </div>
            <Button isIconOnly size="sm" variant="ghost" className="rounded-full text-slate-400 hover:bg-slate-50">
              <Icon icon="lucide:more-vertical" className="text-lg" />
            </Button>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${
                  msg.role === 'user'
                    ? 'justify-end'
                    : msg.role === 'system'
                      ? 'justify-center'
                      : 'justify-start items-end gap-2'
                }`}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    className="h-6 w-6 shrink-0 mb-1 opacity-80"
                    src={
                      config.avatarUrl ??
                      'https://img.heroui.chat/image/avatar?w=96&h=96&u=agent_preview_bubble'
                    }
                  />
                )}

                {msg.role === 'system' ? (
                  <div className="my-2 rounded-full bg-slate-200/50 px-3 py-1 text-[10px] font-medium text-slate-500">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-sm'
                        : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Cart Widget - Voice Agentからのツールコール結果で表示 */}
            {showCart && (cartState.items.length > 0 || cartState.suggestions.length > 0 || cartState.orderResult) && (
              <div className="mt-4">
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
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input Area */}
          <div className="border-t border-slate-100 bg-white p-4 pb-8">
            {config.voiceOn ? (
              <div className="flex flex-col items-center gap-4">
                <Button
                  isIconOnly
                  className={`h-16 w-16 rounded-full shadow-lg transition-all duration-300 ${
                    isConnected 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105'
                  } ${isConnecting ? 'animate-pulse' : ''} ${isSpeaking ? 'ring-4 ring-slate-200 ring-offset-2' : ''}`}
                  onPress={isConnected ? stopVoiceSession : startVoiceSession}
                  isDisabled={isConnecting}
                >
                  <Icon
                    icon={isConnected ? 'lucide:phone-off' : 'lucide:mic'}
                    className="text-2xl"
                  />
                </Button>
                <span className="text-xs font-medium text-slate-500">
                  {isConnecting
                    ? 'Connecting...'
                    : isConnected
                      ? 'Tap to end session'
                      : 'Tap to start voice session'}
                </span>
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
