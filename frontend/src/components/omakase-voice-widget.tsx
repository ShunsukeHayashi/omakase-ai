import React, { useState, useRef, useEffect } from 'react';
import { Button, Avatar, Card, Input, ScrollShadow, Badge, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { clsx } from 'clsx';

// --- Types ---

export interface AgentConfig {
  name: string;
  avatarUrl?: string | null;
  personality?: string;
  language: 'Japanese' | 'English' | 'Korean';
  voice: string;
  voiceOn: boolean;
  speechSpeed: number;
  startMessage: string;
  endMessage: string;
}

export interface OmakaseVoiceWidgetProps {
  config: AgentConfig;
  isConnected: boolean;
  isConnecting?: boolean;
  isSpeaking?: boolean;
  onClose?: () => void;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  onSendMessage?: (text: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// --- Helper Components ---

/**
 * Waveform visualization component
 */
const AudioWaveform = ({ isActive, color = 'primary' }: { isActive: boolean; color?: string }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-1 rounded-full transition-all duration-300',
            color === 'primary' ? 'bg-primary' : 'bg-danger',
            isActive ? 'animate-waveform' : 'h-1 opacity-50'
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

// --- Main Component ---

export const OmakaseVoiceWidget: React.FC<OmakaseVoiceWidgetProps> = ({
  config,
  isConnected,
  isConnecting = false,
  isSpeaking = false,
  onClose,
  onStartVoice,
  onStopVoice,
  onSendMessage,
}) => {
  const [mode, setMode] = useState<'voice' | 'text'>(config.voiceOn ? 'voice' : 'text');
  const [isRecording, setIsRecording] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with start message
  useEffect(() => {
    if (config.startMessage) {
      setMessages([
        {
          id: 'initial',
          role: 'assistant',
          content: config.startMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [config.startMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    onSendMessage?.(inputValue);
    setInputValue('');
  };

  const handleVoiceToggle = () => {
    if (isRecording || isConnected) {
      setIsRecording(false);
      onStopVoice?.();
    } else {
      setIsRecording(true);
      onStartVoice?.();
    }
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) {
      if (isSpeaking) return 'Speaking...';
      if (isRecording) return 'Listening...';
      return 'Connected';
    }
    return 'Tap to start';
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-default-200/50 bg-content1/80 shadow-xl backdrop-blur-xl">
      {/* Header with Glassmorphism */}
      <div className="flex items-center justify-between border-b border-default-200/50 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
        <div className="flex items-center gap-3">
          <Badge
            content=""
            color={isConnected ? 'success' : isConnecting ? 'warning' : 'default'}
            shape="circle"
            placement="bottom-right"
            className="border-2 border-content1"
          >
            <Avatar
              src={config.avatarUrl || 'https://img.heroui.chat/image/avatar?w=128&h=128&u=omakase'}
              className="h-11 w-11 ring-2 ring-primary/20"
              isBordered
            />
          </Badge>
          <div>
            <h3 className="text-sm font-bold">{config.name || 'Omakase AI'}</h3>
            <p className="text-xs text-foreground-500">{getStatusText()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => setMode(mode === 'voice' ? 'text' : 'voice')}
          >
            <Icon icon={mode === 'voice' ? 'lucide:keyboard' : 'lucide:mic'} className="text-lg" />
          </Button>
          {onClose && (
            <Button isIconOnly variant="light" size="sm" onPress={onClose}>
              <Icon icon="lucide:x" className="text-lg" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollShadow className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex max-w-[85%] flex-col gap-1',
                msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
              )}
            >
              {msg.role === 'assistant' && (
                <Avatar
                  src={config.avatarUrl || 'https://img.heroui.chat/image/avatar?w=64&h=64&u=omakase_sm'}
                  className="h-6 w-6"
                />
              )}
              <div
                className={clsx(
                  'rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  msg.role === 'user'
                    ? 'bg-gradient-to-tr from-primary to-secondary text-primary-foreground rounded-tr-sm'
                    : msg.role === 'system'
                      ? 'bg-warning-100 text-warning-700 text-xs'
                      : 'bg-default-100 rounded-tl-sm'
                )}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-foreground-400">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="self-start rounded-2xl rounded-tl-sm bg-default-100 px-4 py-3">
              <AudioWaveform isActive={true} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollShadow>

      {/* Footer Controls */}
      <div className="border-t border-default-200/50 bg-content2/50 p-4 backdrop-blur-md">
        {mode === 'text' ? (
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              classNames={{
                inputWrapper: 'bg-default-100/80 hover:bg-default-200/80',
              }}
            />
            <Button
              isIconOnly
              color="primary"
              variant="shadow"
              onPress={handleSendMessage}
              className="bg-gradient-to-tr from-primary to-secondary"
            >
              <Icon icon="lucide:send" className="text-lg" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat" color={isConnected ? 'success' : 'default'}>
                  {config.language}
                </Chip>
                <span className="text-xs text-foreground-400">{config.speechSpeed}x</span>
              </div>
              {(isRecording || isSpeaking) && (
                <AudioWaveform isActive={true} color={isSpeaking ? 'primary' : 'danger'} />
              )}
            </div>

            <div className="relative">
              {/* Pulse Animation Ring */}
              {isRecording && (
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-danger opacity-20" />
              )}

              <Button
                isIconOnly
                size="lg"
                className={clsx(
                  'h-16 w-16 rounded-full shadow-lg transition-all',
                  isRecording || isConnected
                    ? 'bg-danger text-white hover:bg-danger-600'
                    : 'bg-gradient-to-tr from-primary to-secondary text-white'
                )}
                onPress={handleVoiceToggle}
                isDisabled={isConnecting}
              >
                {isConnecting ? (
                  <Icon icon="lucide:loader-2" className="animate-spin text-2xl" />
                ) : isRecording || isConnected ? (
                  <Icon icon="lucide:phone-off" className="text-2xl" />
                ) : (
                  <Icon icon="lucide:mic" className="text-2xl" />
                )}
              </Button>
            </div>

            <p className="text-xs text-foreground-500">
              {isConnecting
                ? 'Connecting to voice...'
                : isConnected
                  ? 'Tap to end call'
                  : 'Tap to start voice chat'}
            </p>
          </div>
        )}
      </div>

      {/* Waveform Animation Styles */}
      <style>{`
        @keyframes waveform {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        .animate-waveform {
          animation: waveform 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OmakaseVoiceWidget;
