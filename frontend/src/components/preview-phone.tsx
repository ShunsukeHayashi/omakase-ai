import React from 'react';
import { Avatar, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { realtimeClient, type AgentConfig } from '../lib/realtime';

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

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 初期メッセージを表示
  React.useEffect(() => {
    if (config.startMessage) {
      setMessages([{
        id: 'initial',
        role: 'assistant',
        content: config.startMessage,
        timestamp: new Date(),
      }]);
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
        <Button variant="ghost" className="gap-2" onPress={onHide}>
          <Icon icon="lucide:eye-off" />
          Hide preview
        </Button>
      </div>

      <div className="relative mx-auto w-[380px] rounded-[24px] border border-default-200 bg-content1 p-4 shadow-sm">
        {/* Phone status bar mock */}
        <div className="mb-3 flex items-center justify-between text-tiny text-foreground-500">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-success-500' : isConnecting ? 'bg-warning-500 animate-pulse' : 'bg-default-300'
              }`}
            />
            <Icon icon="lucide:wifi" />
            <Icon icon="lucide:signal" />
            <Icon icon="lucide:battery" />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-content2 p-3">
          <div className="relative">
            <Avatar
              className="h-9 w-9"
              src={
                config.avatarUrl ??
                'https://img.heroui.chat/image/avatar?w=128&h=128&u=agent_preview'
              }
            />
            {isConnected && (
              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-content2 ${isSpeaking ? 'bg-success-500 animate-pulse' : 'bg-primary-500'}`} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-small font-medium">{config.name || 'Agent'}</p>
            <p className="text-tiny text-foreground-500">
              {isConnecting
                ? 'Connecting...'
                : isConnected
                  ? isSpeaking
                    ? 'Speaking...'
                    : 'Listening...'
                  : 'Tap mic to start'}
            </p>
          </div>
          <Button isIconOnly size="sm" variant="light" className="rounded-full">
            <Icon icon="lucide:x" className="text-[18px]" />
          </Button>
        </div>

        {/* Chat body */}
        <div className="mt-4 h-[500px] overflow-hidden rounded-medium border border-default-200 bg-content1">
          <div className="h-full overflow-y-auto p-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${
                  msg.role === 'user'
                    ? 'justify-end'
                    : msg.role === 'system'
                      ? 'justify-center'
                      : 'items-start gap-2'
                }`}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    className="h-6 w-6 shrink-0"
                    src={
                      config.avatarUrl ??
                      'https://img.heroui.chat/image/avatar?w=96&h=96&u=agent_preview_bubble'
                    }
                  />
                )}
                {/* Ive-approved: System messages are subtle gray, errors get quiet icon */}
                {msg.role === 'system' ? (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                      msg.isError
                        ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                        : 'bg-gray-50 dark:bg-gray-900/30 text-gray-500 dark:text-gray-500'
                    }`}
                  >
                    {msg.isError && (
                      <Icon icon="lucide:alert-circle" className="text-gray-400 text-sm shrink-0" />
                    )}
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-large px-3 py-2 text-small ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-default-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 rounded-medium border border-default-200 bg-content2 p-2">
          {config.voiceOn ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-small">
                <Button
                  isIconOnly
                  size="lg"
                  color={isConnected ? 'danger' : 'primary'}
                  className={`rounded-full ${isConnecting ? 'animate-pulse' : ''} ${isSpeaking ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onPress={isConnected ? stopVoiceSession : startVoiceSession}
                  isDisabled={isConnecting}
                >
                  <Icon
                    icon={isConnected ? 'lucide:phone-off' : 'lucide:mic'}
                    className="text-xl"
                  />
                </Button>
                <span className="text-foreground-500">
                  {isConnecting
                    ? 'Connecting...'
                    : isConnected
                      ? 'Tap to end call'
                      : 'Tap to start call'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tiny text-foreground-500">{config.speechSpeed.toFixed(1)}x</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-medium border border-default-200 bg-content1 px-3 py-2 text-small outline-none focus:border-primary"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button isIconOnly color="primary" className="rounded-full" onPress={sendTextMessage}>
                <Icon icon="lucide:send" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
