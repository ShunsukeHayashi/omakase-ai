/**
 * OpenAI Realtime API Client
 * Direct WebRTC implementation (not using @openai/agents SDK)
 * Based on: https://developer.mamezou-tech.com/en/blogs/2024/12/21/openai-realtime-api-webrtc/
 */

export interface AgentConfig {
  avatarUrl: string | null;
  name: string;
  personality: string;
  language: 'Japanese' | 'English' | 'Korean';
  voice: string;
  voiceOn: boolean;
  speechSpeed: number;
  startMessage: string;
  endMessage: string;
}

export interface RealtimeCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: Error) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const REALTIME_API_URL = 'https://api.openai.com/v1/realtime';
const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

/**
 * RealtimeVoiceClient - WebRTC経由でOpenAI Realtime APIに直接接続
 */
export class RealtimeVoiceClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private callbacks: RealtimeCallbacks = {};
  private config: AgentConfig | null = null;
  private connected = false;

  /**
   * エージェント設定を更新
   */
  setConfig(config: AgentConfig): void {
    this.config = config;
  }

  /**
   * コールバックを設定
   */
  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 音声セッションに接続
   */
  async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Config not set. Call setConfig() first.');
    }

    if (this.connected) {
      console.log('Already connected');
      return;
    }

    try {
      // 1. バックエンドからエフェメラルキーを取得
      const instructions = this.buildInstructions();
      const response = await fetch(`${API_BASE}/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: this.config.voice,
          instructions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get session token');
      }

      const sessionData = await response.json();
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error('No ephemeral key in response');
      }

      console.log('Got ephemeral key:', ephemeralKey.substring(0, 10) + '...');

      // 2. RTCPeerConnectionを作成
      this.peerConnection = new RTCPeerConnection();

      // 3. 音声出力用のaudio要素を作成
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;

      // 4. 受信トラックをaudio要素に接続
      this.peerConnection.ontrack = (event) => {
        console.log('Received audio track');
        if (this.audioElement) {
          this.audioElement.srcObject = event.streams[0];
        }
        this.callbacks.onAudioStart?.();
      };

      // 5. マイクからの音声を取得して追加
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      this.peerConnection.addTrack(audioTrack);
      console.log('Added microphone track');

      // 6. データチャネルを作成（イベント送受信用）
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelListeners();

      // 7. SDP Offerを作成
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('Created SDP offer');

      // 8. OpenAI APIにSDP Offerを送信してAnswerを取得
      const sdpResponse = await fetch(`${REALTIME_API_URL}?model=${MODEL}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('SDP exchange failed:', errorText);
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      console.log('Received SDP answer');

      // 9. SDP Answerを設定
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log('WebRTC connection established');
      this.connected = true;

    } catch (error) {
      console.error('Connection error:', error);
      this.cleanup();
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * データチャネルのイベントリスナーを設定
   */
  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.callbacks.onConnected?.();
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.callbacks.onDisconnected?.();
    };

    this.dataChannel.onerror = (event) => {
      console.error('Data channel error:', event);
      this.callbacks.onError?.(new Error('Data channel error'));
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeEvent(data);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };
  }

  /**
   * Realtime APIからのイベントを処理
   */
  private handleRealtimeEvent(event: { type: string; [key: string]: unknown }): void {
    console.log('Realtime event:', event.type);

    switch (event.type) {
      case 'session.created':
        console.log('Session created');
        break;

      case 'session.updated':
        console.log('Session updated');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // ユーザーの音声がテキストに変換された
        const userTranscript = (event as { transcript?: string }).transcript;
        if (userTranscript) {
          this.callbacks.onTranscript?.(userTranscript, 'user');
        }
        break;

      case 'response.audio_transcript.delta':
        // AIの応答テキスト（増分）
        break;

      case 'response.audio_transcript.done':
        // AIの応答テキスト（完了）
        const assistantTranscript = (event as { transcript?: string }).transcript;
        if (assistantTranscript) {
          this.callbacks.onTranscript?.(assistantTranscript, 'assistant');
        }
        break;

      case 'response.audio.delta':
        // 音声データ受信中
        this.callbacks.onAudioStart?.();
        break;

      case 'response.audio.done':
        // 音声再生完了
        this.callbacks.onAudioEnd?.();
        break;

      case 'response.done':
        console.log('Response complete');
        this.callbacks.onAudioEnd?.();
        break;

      case 'error':
        console.error('API error:', event);
        this.callbacks.onError?.(new Error(JSON.stringify(event)));
        break;

      default:
        // その他のイベントはログのみ
        break;
    }
  }

  /**
   * システムプロンプトを構築
   * OpenAI Realtime API向けに最適化
   */
  private buildInstructions(): string {
    if (!this.config) return 'You are a helpful voice assistant. Speak naturally and concisely.';

    const languageConfig = {
      Japanese: {
        instruction: '必ず日本語で応答してください。',
        fillers: '「えーと」「そうですね」などの自然な相槌を適度に入れてください。',
        style: '丁寧語を基本としつつ、親しみやすい話し方を心がけてください。',
      },
      English: {
        instruction: 'Always respond in English.',
        fillers: 'Use natural fillers like "well", "you know", "let me see" occasionally.',
        style: 'Be friendly and professional in your tone.',
      },
      Korean: {
        instruction: '반드시 한국어로 응답해 주세요.',
        fillers: '"음", "그러니까" 등의 자연스러운 추임새를 적절히 사용해 주세요.',
        style: '존댓말을 기본으로 하되, 친근한 말투를 사용해 주세요.',
      },
    };

    const lang = languageConfig[this.config.language];

    return `# Identity
あなたは「${this.config.name}」です。音声でお客様と会話するAIショッピングアシスタントです。

# Voice Characteristics
- 声のトーン: 明るく、親しみやすく、信頼感のある声
- 話すスピード: ゆっくりめ、聞き取りやすいペース
- ${lang.fillers}

# Personality
${this.config.personality}

# Communication Style
1. **簡潔に話す**: 1文は短く、20文字程度を目安に
2. **自然な会話**: 読み上げではなく、会話として話す
3. **確認を入れる**: 「〜でよろしいですか？」「〜ということですね」
4. **ポジティブに**: 否定より肯定の表現を使う
5. ${lang.style}

# Response Format
- 長い説明は避け、要点を絞って伝える
- 質問には直接答え、その後に補足を加える
- 一度に多くの情報を伝えない（2-3項目まで）

# Behavior Guidelines
1. 最初は挨拶と簡単な自己紹介から
2. お客様の要望を丁寧にヒアリング
3. 商品の魅力を分かりやすく紹介
4. 押し売りせず、お客様のペースに合わせる
5. わからないことは正直に「確認いたします」と伝える

# Language
${lang.instruction}

# Opening Message
会話開始時は、以下のメッセージを使って挨拶してください：
「${this.config.startMessage}」

# Important Notes
- 相手の話を遮らない
- 長い沈黙を避ける（2秒以上空いたら確認を入れる）
- 技術的な問題があれば素直に謝罪
- 終話時は「${this.config.endMessage}」で締める`;
  }

  /**
   * テキストメッセージを送信
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Not connected');
    }

    // conversation.item.createイベントを送信
    this.dataChannel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    }));

    // response.createイベントを送信して応答を要求
    this.dataChannel.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  /**
   * リソースをクリーンアップ
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    this.connected = false;
  }

  /**
   * 接続を切断
   */
  disconnect(): void {
    console.log('Disconnecting...');
    this.cleanup();
    this.callbacks.onDisconnected?.();
  }

  /**
   * 接続状態を確認
   */
  isConnected(): boolean {
    return this.connected && this.dataChannel?.readyState === 'open';
  }
}

// シングルトンインスタンス
export const realtimeClient = new RealtimeVoiceClient();
