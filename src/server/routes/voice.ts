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
          agentType,
          agentName: name ?? defaultAgentConfigs[agentType as AgentType]?.name ?? 'アヤ',
          personality: personality ?? defaultAgentConfigs[agentType as AgentType]?.personality ?? '明るく親しみやすい。',
          language: language ?? 'Japanese',
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

    // Function tools for Voice Agent
    const voiceTools = [
      {
        type: 'function',
        name: 'search_products',
        description: '商品を検索します。キーワードで商品を探すときに使用してください。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '検索キーワード' },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'get_product_details',
        description: '商品の詳細情報を取得します。',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'add_to_cart',
        description: 'カートに商品を追加します。',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID' },
            quantity: { type: 'number', description: '数量（デフォルト: 1）' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'get_cart',
        description: '現在のカート内容を取得します。',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'remove_from_cart',
        description: 'カートから商品を削除します。',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'get_recommendations',
        description: 'おすすめ商品を取得します。',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'カテゴリ' },
          },
        },
      },
      {
        type: 'function',
        name: 'check_stock',
        description: '商品の在庫状況を確認します。',
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'place_order',
        description: 'カートの内容で注文を確定します。',
        parameters: {
          type: 'object',
          properties: {
            customer_name: { type: 'string', description: 'お客様名' },
            customer_email: { type: 'string', description: 'メールアドレス' },
          },
        },
      },
    ];

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
          tools: voiceTools,
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
