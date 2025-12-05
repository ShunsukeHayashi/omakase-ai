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
import { storeContextStore } from '../services/store-context.js';

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

    const resolvedStoreContext = storeContext || storeContextStore.get() || undefined;

    const openaiVoice = voiceMapping[voice] ?? voice;

    // エージェントプロンプトを生成
    let finalInstructions = instructions;
    if (!instructions && agentType) {
      // 営業部長AIは専用プロンプトを使用（商品情報不要）
      if (agentType === 'sales-manager') {
        const defaultConfig = defaultAgentConfigs[agentType as AgentType] || {};
        finalInstructions = buildPromptForAgent(agentType as AgentType, {
          name: name || defaultConfig.name || '鬼塚部長',
          personality: personality || defaultConfig.personality || '',
          language: (language as Language) || 'Japanese',
          startMessage: startMessage || defaultConfig.startMessage || 'オイ！今日もお疲れだな。で、どうだったよ？',
          endMessage: endMessage || defaultConfig.endMessage || 'よし、じゃあ明日は倍動けよ。分かったな？お疲れ！',
        });
      } else if (useDynamicPrompt) {
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
    // ツール説明は具体的なトリガーフレーズを含めてAIが発火タイミングを判断しやすくする
    const voiceTools = [
      {
        type: 'function',
        name: 'search_products',
        description: `商品を検索します。以下のような発話で呼び出してください：
- 「〇〇ありますか」「〇〇探してます」「〇〇見せて」
- 「チョコレート系は？」「おすすめは？」
- 商品名、カテゴリ名、特徴でキーワード検索`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索キーワード（商品名、カテゴリ、特徴など）'
            },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'get_product_details',
        description: `商品の詳細情報を取得します。以下のような発話で呼び出してください：
- 「それ詳しく教えて」「もっと知りたい」
- 「〇〇の詳細は？」「成分は？」「アレルギー情報は？」`,
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID（検索結果から取得）' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'add_to_cart',
        description: `【重要】お客様が商品を購入したい・カートに入れたいと言ったら必ず呼び出してください。
トリガーフレーズ例：
- 「〇〇を3個ください」「〇〇3つお願い」→ product_id + quantity:3
- 「それください」「買います」「カートに入れて」→ 直前の商品を追加
- 「ポジショコラ3個」→ search_productsで検索後、add_to_cartを呼ぶ
- 「もう1個追加して」→ quantity:1で追加
数量の言い方: 「3個」「3つ」「3」「三つ」→ quantity: 3`,
        parameters: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: '追加する商品のID。商品名で指定された場合は先にsearch_productsで検索してIDを取得'
            },
            quantity: {
              type: 'number',
              description: '数量。「3個」「3つ」などの指定があれば数値に変換。デフォルト: 1'
            },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'get_cart',
        description: `カートの中身を確認します。以下のような発話で呼び出してください：
- 「カートの中身は？」「今何入ってる？」「確認して」
- 「合計いくら？」「全部でいくら？」
- 注文前の確認時にも呼び出す`,
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'remove_from_cart',
        description: `カートから商品を削除します。以下のような発話で呼び出してください：
- 「〇〇やっぱりいらない」「〇〇削除して」「〇〇キャンセル」
- 「それ取り消して」「間違えた」`,
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '削除する商品ID' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'get_recommendations',
        description: `おすすめ商品を提案します。以下のような発話で呼び出してください：
- 「おすすめは？」「何がいい？」「人気は？」
- 「〇〇に合うものは？」「ギフトにいいのは？」
- カテゴリ指定: 「チョコレートのおすすめ」`,
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'カテゴリ（任意）。例: チョコレート、焼き菓子、ギフト'
            },
          },
        },
      },
      {
        type: 'function',
        name: 'check_stock',
        description: `在庫状況を確認します。以下のような発話で呼び出してください：
- 「在庫ある？」「今買える？」「品切れじゃない？」
- 「〇〇個買えますか？」（大量購入時）`,
        parameters: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '確認する商品ID' },
          },
          required: ['product_id'],
        },
      },
      {
        type: 'function',
        name: 'place_order',
        description: `注文を確定します。以下のような発話で呼び出してください：
- 「注文する」「買います」「決済して」「これで注文」
- 「それでお願い」「確定で」
※必ずget_cartでカート内容を確認してから呼び出すこと`,
        parameters: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'お客様名（任意）。「〇〇です」と名乗った場合に設定'
            },
            customer_email: {
              type: 'string',
              description: 'メールアドレス（任意）。メールを聞いた場合に設定'
            },
          },
        },
      },
      {
        type: 'function',
        name: 'clear_cart',
        description: `カートを空にします。以下のような発話で呼び出してください：
- 「全部キャンセル」「やっぱりやめる」「カート空にして」
- 「最初からやり直し」`,
        parameters: { type: 'object', properties: {} },
      },
    ];

    // 営業部長AIの場合はツールなし（純粋な会話エージェント）
    const toolsToUse = agentType === 'sales-manager' ? [] : voiceTools;

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
          tools: toolsToUse,
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
