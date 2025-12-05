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
  agentType?: string;
}

export interface FunctionCallResult {
  name: string;
  call_id: string;
  result: unknown;
}

export interface RealtimeCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: Error) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onFunctionCall?: (result: FunctionCallResult) => void;
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
      // Note: instructionsはバックエンドで動的生成（商品情報含む）するため送信しない
      const response = await fetch(`${API_BASE}/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: this.config.voice,
          // バックエンドのdynamicPrompt機能を使用
          useDynamicPrompt: true,
          agentType: this.config.agentType || 'shopping-guide',
          name: this.config.name,
          personality: this.config.personality,
          language: this.config.language,
          startMessage: this.config.startMessage,
          endMessage: this.config.endMessage,
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

      case 'function_call_result':
        // サーバーからのFunction call結果（カートUI更新用）
        const funcResult = event as unknown as FunctionCallResult;
        console.log('[Function Result]', funcResult.name);
        this.callbacks.onFunctionCall?.(funcResult);
        break;

      default:
        // その他のイベントはログのみ
        break;
    }
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
