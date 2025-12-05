import React from 'react';
import { Avatar, Button, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceWs, type AgentConfig } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface VoiceWidgetProps {
  config: AgentConfig;
  onClose?: () => void;
}

// Waveform animation component
const WaveformAnimation = ({ isActive }: { isActive: boolean }) => {
  const barCount = 5;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-white/80"
          animate={
            isActive
              ? {
                  height: [8, 24, 12, 28, 8],
                  opacity: [0.6, 1, 0.8, 1, 0.6],
                }
              : { height: 8, opacity: 0.4 }
          }
          transition={
            isActive
              ? {
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
};

// Pulsing ring animation for recording state
const PulsingRing = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;

  return (
    <>
      <motion.div
        className="absolute inset-0 rounded-full bg-danger-500/30"
        animate={{
          scale: [1, 1.5, 1.8],
          opacity: [0.6, 0.3, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-danger-500/20"
        animate={{
          scale: [1, 1.3, 1.5],
          opacity: [0.4, 0.2, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 0.3,
        }}
      />
    </>
  );
};

// Message bubble component with animations
const MessageBubble = ({
  message,
  avatarUrl,
}: {
  message: Message;
  avatarUrl?: string;
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}
    >
      {!isUser && !isSystem && (
        <Avatar
          className="mr-2 h-7 w-7 shrink-0 ring-2 ring-white/20"
          src={avatarUrl ?? 'https://img.heroui.chat/image/avatar?w=96&h=96&u=agent_small'}
        />
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
            : isSystem
              ? 'rounded-xl bg-white/10 backdrop-blur-sm text-foreground-500 text-xs border border-white/10'
              : 'rounded-2xl rounded-bl-md bg-white/10 backdrop-blur-md text-foreground border border-white/10 shadow-lg'
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
};

export const VoiceWidget = ({ config, onClose }: VoiceWidgetProps) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isVoiceSessionActive, setIsVoiceSessionActive] = React.useState(false);
  const [inputText, setInputText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const processorRef = React.useRef<ScriptProcessorNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Connect to WebSocket on mount
  React.useEffect(() => {
    const connect = async () => {
      try {
        await voiceWs.connect();
        setIsConnected(true);

        // Update config
        voiceWs.updateConfig(config);

        // Set up event handlers
        voiceWs.on('voice_session_started', () => {
          setIsVoiceSessionActive(true);
          addMessage('system', '音声セッションを開始しました');
        });

        voiceWs.on('voice_session_ended', () => {
          setIsVoiceSessionActive(false);
          setIsRecording(false);
          addMessage('system', '音声セッションを終了しました');
        });

        voiceWs.on('response.audio_transcript.done', (data: { transcript?: string }) => {
          setIsTyping(false);
          if (data.transcript) {
            addMessage('assistant', data.transcript);
          }
        });

        voiceWs.on('response.created', () => {
          setIsTyping(true);
        });

        voiceWs.on('conversation.item.input_audio_transcription.completed', (data: { transcript?: string }) => {
          if (data.transcript) {
            addMessage('user', data.transcript);
          }
        });

        voiceWs.on('error', (data: { message?: string }) => {
          setIsTyping(false);
          addMessage('system', `エラー: ${data.message || 'Unknown error'}`);
        });

        // Add initial message
        if (config.startMessage) {
          addMessage('assistant', config.startMessage);
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    connect();

    return () => {
      voiceWs.close();
      stopRecording();
    };
  }, []);

  // Update config when it changes
  React.useEffect(() => {
    if (isConnected) {
      voiceWs.updateConfig(config);
    }
  }, [config, isConnected]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addMessage = (role: Message['role'], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const startRecording = async () => {
    if (!isVoiceSessionActive) {
      voiceWs.startVoiceSession();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (!isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
        voiceWs.sendAudio(base64);
      };

      setIsRecording(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
      addMessage('system', 'マイクへのアクセスが拒否されました');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    voiceWs.commitAudio();
    voiceWs.createResponse();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendTextMessage = () => {
    if (!inputText.trim()) return;

    addMessage('user', inputText);
    voiceWs.sendTextMessage(inputText);
    setInputText('');
    setIsTyping(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Connection status indicator
  const StatusIndicator = () => (
    <div className="flex items-center gap-2">
      <motion.div
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success-400' : 'bg-danger-400'}`}
        animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="text-xs text-foreground-400">
        {isConnected
          ? isVoiceSessionActive
            ? 'Voice Active'
            : 'Connected'
          : 'Connecting...'}
      </span>
    </div>
  );

  // Typing indicator
  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2"
    >
      <Avatar
        className="h-7 w-7 shrink-0 ring-2 ring-white/20"
        src={config.avatarUrl ?? 'https://img.heroui.chat/image/avatar?w=96&h=96&u=agent_small'}
      />
      <div className="rounded-2xl rounded-bl-md bg-white/10 backdrop-blur-md px-4 py-3 border border-white/10">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-foreground-400"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-content1/80 via-content1/60 to-content2/80 shadow-2xl backdrop-blur-xl">
      {/* Header - Glassmorphism */}
      <div className="relative border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3 p-4">
          <div className="relative">
            <Avatar
              className="h-11 w-11 ring-2 ring-white/20 shadow-lg"
              src={config.avatarUrl ?? 'https://img.heroui.chat/image/avatar?w=128&h=128&u=agent'}
            />
            <motion.div
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-content1 ${isConnected ? 'bg-success-400' : 'bg-default-400'}`}
              animate={isConnected ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{config.name || 'AI Assistant'}</p>
            <StatusIndicator />
          </div>
          <div className="flex items-center gap-1">
            {onClose && (
              <Tooltip content="Close" placement="bottom">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="text-foreground-400 hover:text-foreground hover:bg-white/10"
                  onPress={onClose}
                >
                  <Icon icon="lucide:x" className="text-lg" />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Glassmorphism scroll area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} avatarUrl={config.avatarUrl} />
          ))}
          <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Glassmorphism */}
      <div className="border-t border-white/10 bg-white/5 backdrop-blur-md p-4">
        {config.voiceOn ? (
          <div className="flex flex-col items-center gap-3">
            {/* Voice mode UI */}
            <div className="relative">
              <PulsingRing isActive={isRecording} />
              <motion.button
                className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all ${
                  isRecording
                    ? 'bg-gradient-to-br from-danger-400 to-danger-600 shadow-danger-500/40'
                    : 'bg-gradient-to-br from-primary-400 to-primary-600 shadow-primary-500/40 hover:shadow-primary-500/60'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <WaveformAnimation isActive={isRecording} />
                ) : (
                  <Icon icon="lucide:mic" className="text-2xl text-white" />
                )}
              </motion.button>
            </div>
            <motion.p
              className="text-sm text-foreground-400"
              animate={{ opacity: isRecording ? [0.5, 1, 0.5] : 1 }}
              transition={isRecording ? { duration: 1.5, repeat: Infinity } : {}}
            >
              {isRecording ? 'Listening...' : 'Tap to speak'}
            </motion.p>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-foreground placeholder-foreground-400 outline-none backdrop-blur-sm transition-all focus:border-primary-400/50 focus:bg-white/10 focus:ring-2 focus:ring-primary-400/20"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Tooltip content="Send" placement="top">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  isIconOnly
                  color="primary"
                  className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30"
                  onPress={sendTextMessage}
                  isDisabled={!inputText.trim()}
                >
                  <Icon icon="lucide:send" className="text-lg" />
                </Button>
              </motion.div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
