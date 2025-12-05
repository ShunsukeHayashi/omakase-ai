/**
 * Voice Router - 音声エンドポイント
 * OpenAI Realtime API (WebRTC) 対応
 */

import { Router } from 'express';
import {
  type AgentType,
  type Language,
  buildPromptForAgent,
  defaultAgentConfigs,
} from '../../agents/index.js';
import {
  generateDynamicPrompt,
  type DynamicPromptConfig,
  type StoreContext,
  type EnabledFeatures,
} from '../services/prompt-generator.js';

export const voiceRouter = Router();

// Voice mapping (UI display name -> OpenAI voice ID)
const voiceMapping: Record<string, string> = {
  'Yuumi (Japanese Female)': 'shimmer',
  'Haru (Japanese Male)': 'echo',
  'Ava (English Female)': 'alloy',
  'Lily (English Female)': 'nova',
  'Ken (Japanese Male)': 'onyx',
};

// Request body types
interface VoiceSessionInput {
  voice?: string;
  instructions?: string;
  agentType?: string;
  name?: string;
  personality?: string;
  language?: 'Japanese' | 'English' | 'Korean';
  startMessage?: string;
  endMessage?: string;
  useDynamicPrompt?: boolean;
  storeContext?: StoreContext;
  customRules?: string[];
  enabledFeatures?: EnabledFeatures;
}

// POST /api/voice/session - WebRTC用エフェメラルトークン生成
voiceRouter.post('/session', async (req, res): Promise<void> => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    // クライアントからの設定を受け取る
    const body = (req.body || {}) as VoiceSessionInput;
    const {
      voice = 'shimmer',
      instructions,
      agentType = 'shopping-guide',
      name,
      personality,
      language = 'Japanese',
      startMessage,
      endMessage,
      useDynamicPrompt = true,
      storeContext,
      customRules,
      enabledFeatures,
    } = body;

    const openaiVoice = voiceMapping[voice] ?? voice;

    // エージェントプロンプトを生成
    let finalInstructions = instructions;
    if (!instructions && agentType) {
      if (useDynamicPrompt) {
        // 動的プロンプト生成（商品情報・ストアコンテキスト含む）
        const dynamicConfig: DynamicPromptConfig = {
          agentType: agentType as string,
          agentName: name || defaultAgentConfigs[agentType as AgentType]?.name || 'アヤ',
          personality: personality || defaultAgentConfigs[agentType as AgentType]?.personality || '明るく親しみやすい。',
          language: (language as 'Japanese' | 'English' | 'Korean') || 'Japanese',
          startMessage: startMessage || defaultAgentConfigs[agentType as AgentType]?.startMessage || 'こんにちは！',
          endMessage: endMessage || defaultAgentConfigs[agentType as AgentType]?.endMessage || 'ありがとうございました！',
          storeContext,
          customRules,
          enabledFeatures: enabledFeatures || {
            productSearch: true,
            recommendations: true,
            priceComparison: false,
            inventoryCheck: false,
          },
        };
        finalInstructions = generateDynamicPrompt(dynamicConfig);
      } else {
        // 静的プロンプト生成（従来方式）
        const defaultConfig = defaultAgentConfigs[agentType as AgentType] || {};
        finalInstructions = buildPromptForAgent(agentType as AgentType, {
          name: name || defaultConfig.name || 'アヤ',
          personality: personality || defaultConfig.personality || '',
          language: (language as Language) || 'Japanese',
          startMessage: startMessage || defaultConfig.startMessage || 'こんにちは！',
          endMessage: endMessage || defaultConfig.endMessage || 'ありがとうございました！',
        });
      }
    }

    // OpenAI Realtime API用のエフェメラルトークン取得
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: openaiVoice,
          instructions: finalInstructions || 'You are a helpful assistant.',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI session error:', error);
      res.status(response.status).json({ error: 'Failed to create session', details: error });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Voice session error:', error);
    res.status(500).json({
      error: 'Failed to create voice session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/voice/config - 音声設定取得
voiceRouter.get('/config', (_req, res) => {
  res.json({
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    defaultVoice: 'shimmer',
    model: 'gpt-4o-realtime-preview-2024-12-17',
    turnDetection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  });
});
