/**
 * WebSocket Handler for Real-time Voice Communication
 * OpenAI Realtime API Integration
 *
 * Reference: https://openai.com/index/introducing-the-realtime-api/
 */

import { WebSocket } from 'ws';
import { productStore } from '../services/store.js';
import { cartStore } from '../services/cart.js';
import { knowledgeStore } from '../services/knowledge.js';

interface AgentConfig {
  name: string;
  personality: string;
  language: 'Japanese' | 'English' | 'Korean';
  voice: string;
  voiceOn: boolean;
  speechSpeed: number;
  startMessage: string;
  endMessage: string;
}

interface VoiceSession {
  ws: WebSocket;
  openaiWs: WebSocket | null;
  sessionId: string;
  config: AgentConfig;
  cartId: string;
}

const sessions: Map<string, VoiceSession> = new Map();

// Voice mapping for OpenAI
const voiceMapping: Record<string, string> = {
  'Yuumi (Japanese Female)': 'shimmer',
  'Haru (Japanese Male)': 'echo',
  'Ava (English Female)': 'alloy',
  default: 'shimmer',
};

const defaultConfig: AgentConfig = {
  name: '彩',
  personality:
    '明るく親しみやすく、初めての来訪者にも気軽に話しかけるスタイル。要点を簡潔に伝え、相手の目的達成を最優先にします。',
  language: 'Japanese',
  voice: 'Yuumi (Japanese Female)',
  voiceOn: true,
  speechSpeed: 1.0,
  startMessage: 'こんにちは！お困りのことはありますか？',
  endMessage: 'ありがとうございました。またいつでもお声がけください！',
};

/**
 * WebSocket接続ハンドラ
 */
export function handleWebSocket(ws: WebSocket): void {
  const sessionId = Math.random().toString(36).substring(7);
  console.log(`New WebSocket connection: ${sessionId}`);

  // セッション用のカートを作成
  const cart = cartStore.create();

  const session: VoiceSession = {
    ws,
    openaiWs: null,
    sessionId,
    config: { ...defaultConfig },
    cartId: cart.id,
  };

  sessions.set(sessionId, session);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      handleMessage(session, message);
    } catch {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket closed: ${sessionId}`);
    if (session.openaiWs) {
      session.openaiWs.close();
    }
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error: ${sessionId}`, error);
  });

  // Send initial connection message
  ws.send(
    JSON.stringify({
      type: 'connected',
      sessionId,
      config: session.config,
    })
  );
}

/**
 * メッセージハンドラ
 */
function handleMessage(
  session: VoiceSession,
  message: Record<string, unknown>
): void {
  const { type } = message;

  switch (type) {
    case 'update_config':
      // エージェント設定を更新
      if (message.config && typeof message.config === 'object') {
        session.config = { ...session.config, ...(message.config as Partial<AgentConfig>) };
        session.ws.send(
          JSON.stringify({
            type: 'config_updated',
            config: session.config,
          })
        );
      }
      break;

    case 'start_voice_session':
      startVoiceSession(session);
      break;

    case 'input_audio_buffer.append':
      // 音声データをOpenAIに転送
      forwardToOpenAI(session, message);
      break;

    case 'input_audio_buffer.commit':
      // 音声入力完了を通知
      forwardToOpenAI(session, message);
      break;

    case 'response.create':
      // レスポンス生成をリクエスト
      forwardToOpenAI(session, message);
      break;

    case 'conversation.item.create':
      // テキストメッセージを追加
      forwardToOpenAI(session, message);
      break;

    case 'end_voice_session':
      endVoiceSession(session);
      break;

    case 'get_products':
      sendProducts(session);
      break;

    default:
      // その他のイベントはOpenAIに転送
      forwardToOpenAI(session, message);
  }
}

/**
 * OpenAI Realtime APIセッション開始
 */
function startVoiceSession(session: VoiceSession): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    session.ws.send(
      JSON.stringify({
        type: 'error',
        message: 'OpenAI API key not configured',
      })
    );
    return;
  }

  try {
    // OpenAI Realtime API WebSocket接続
    // Reference: https://www.latent.space/p/realtime-api
    const openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      }
    );

    session.openaiWs = openaiWs;

    openaiWs.on('open', () => {
      console.log('Connected to OpenAI Realtime API');

      // セッション設定を送信
      const productContext = productStore.getProductContext();
      const openaiVoice = voiceMapping[session.config.voice] || voiceMapping.default;

      openaiWs.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: getSystemPrompt(session.config, productContext),
            voice: openaiVoice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500, // 500ms of silence triggers response
            },
            tools: [
              {
                type: 'function',
                name: 'search_products',
                description: '商品を検索します。キーワードで商品を探すときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: '検索キーワード',
                    },
                  },
                  required: ['query'],
                },
              },
              {
                type: 'function',
                name: 'get_product_details',
                description: '商品の詳細情報を取得します。特定の商品について詳しく知りたいときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '商品ID',
                    },
                  },
                  required: ['product_id'],
                },
              },
              {
                type: 'function',
                name: 'add_to_cart',
                description: 'カートに商品を追加します。お客様が商品を購入したいと言ったときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '追加する商品のID',
                    },
                    quantity: {
                      type: 'number',
                      description: '数量（デフォルト: 1）',
                    },
                  },
                  required: ['product_id'],
                },
              },
              {
                type: 'function',
                name: 'get_cart',
                description: '現在のカート内容を取得します。お客様がカートの中身を確認したいときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                type: 'function',
                name: 'search_faq',
                description: 'FAQを検索します。よくある質問への回答を探すときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: '検索キーワード（例: 送料、返品、支払い方法）',
                    },
                  },
                  required: ['query'],
                },
              },
              {
                type: 'function',
                name: 'get_store_info',
                description: 'ストア情報（営業時間、配送ポリシー、支払い方法など）を取得します。',
                parameters: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                type: 'function',
                name: 'get_recommendations',
                description: '関連商品やおすすめ商品を取得します。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '基準となる商品ID（オプション）',
                    },
                    category: {
                      type: 'string',
                      description: 'カテゴリ（オプション）',
                    },
                  },
                },
              },
              {
                type: 'function',
                name: 'remove_from_cart',
                description: 'カートから商品を削除します。お客様が商品を削除したいと言ったときに使用してください。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '削除する商品のID',
                    },
                  },
                  required: ['product_id'],
                },
              },
              {
                type: 'function',
                name: 'update_cart_quantity',
                description: 'カート内の商品数量を変更します。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '商品ID',
                    },
                    quantity: {
                      type: 'number',
                      description: '新しい数量',
                    },
                  },
                  required: ['product_id', 'quantity'],
                },
              },
              {
                type: 'function',
                name: 'check_stock',
                description: '商品の在庫状況を確認します。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '商品ID',
                    },
                  },
                  required: ['product_id'],
                },
              },
              {
                type: 'function',
                name: 'clear_cart',
                description: 'カートを空にします。',
                parameters: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        })
      );

      session.ws.send(
        JSON.stringify({
          type: 'voice_session_started',
          voice: openaiVoice,
        })
      );
    });

    openaiWs.on('message', (data) => {
      // OpenAIからのメッセージをクライアントに転送
      try {
        const message = JSON.parse(data.toString());

        // Function callの処理
        if (message.type === 'response.function_call_arguments.done') {
          handleFunctionCall(session, message);
        }

        session.ws.send(JSON.stringify(message));
      } catch {
        // Binary audio data
        session.ws.send(data);
      }
    });

    openaiWs.on('close', () => {
      console.log('OpenAI WebSocket closed');
      session.ws.send(
        JSON.stringify({
          type: 'voice_session_ended',
        })
      );
    });

    openaiWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
      session.ws.send(
        JSON.stringify({
          type: 'error',
          message: 'OpenAI connection error',
        })
      );
    });
  } catch (error) {
    console.error('Failed to start voice session:', error);
    session.ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to start voice session',
      })
    );
  }
}

// Function call argument types
interface SearchProductsArgs {
  query: string;
}

interface ProductIdArgs {
  product_id: string;
}

interface AddToCartArgs {
  product_id: string;
  quantity?: number;
}

interface UpdateCartArgs {
  product_id: string;
  quantity: number;
}

interface SearchFaqArgs {
  query: string;
}

interface RecommendationsArgs {
  product_id?: string;
  category?: string;
}

/**
 * Function call処理
 */
function handleFunctionCall(
  session: VoiceSession,
  message: Record<string, unknown>
): void {
  const name = message.name as string;
  const argsStr = (message.arguments as string) || '{}';
  const parsedArgs: unknown = JSON.parse(argsStr);

  let result: unknown;

  switch (name) {
    case 'search_products': {
      const products = productStore.search(args.query);
      result = {
        count: products.length,
        products: products.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description?.slice(0, 100),
        })),
      };
      break;
    }

    case 'get_product_details': {
      const product = productStore.get(args.product_id);
      if (product) {
        result = {
          ...product,
          available: true,
        };
      } else {
        result = { error: '商品が見つかりませんでした' };
      }
      break;
    }

    case 'add_to_cart': {
      const item = cartStore.addItem(
        session.cartId,
        args.product_id,
        args.quantity || 1
      );
      if (item) {
        const { subtotal, itemCount } = cartStore.getTotal(session.cartId);
        result = {
          success: true,
          message: `${item.product.name}をカートに追加しました`,
          cartSummary: {
            itemCount,
            subtotal,
          },
        };
      } else {
        result = { success: false, error: '商品が見つかりませんでした' };
      }
      break;
    }

    case 'get_cart': {
      const { subtotal, itemCount, items } = cartStore.getTotal(session.cartId);
      result = {
        itemCount,
        subtotal,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: item.product.price * item.quantity,
        })),
        formattedTotal: `¥${subtotal.toLocaleString()}`,
      };
      break;
    }

    case 'search_faq': {
      const faqs = knowledgeStore.searchFAQ(args.query);
      result = {
        count: faqs.length,
        results: faqs.map((f) => ({
          question: f.question,
          answer: f.answer,
          category: f.category,
        })),
      };
      break;
    }

    case 'get_store_info': {
      const info = knowledgeStore.getStoreInfo();
      result = info;
      break;
    }

    case 'get_recommendations': {
      // 簡易的なレコメンド（全商品からランダムに3つ）
      const allProducts = productStore.getAll().filter((p) => p.isActive);
      const shuffled = allProducts.sort(() => 0.5 - Math.random());
      result = {
        recommendations: shuffled.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description?.slice(0, 100),
        })),
      };
      break;
    }

    case 'remove_from_cart': {
      const removed = cartStore.removeItem(session.cartId, args.product_id);
      if (removed) {
        const { subtotal, itemCount } = cartStore.getTotal(session.cartId);
        result = {
          success: true,
          message: '商品をカートから削除しました',
          cartSummary: {
            itemCount,
            subtotal,
          },
        };
      } else {
        result = { success: false, error: 'カートに該当商品がありませんでした' };
      }
      break;
    }

    case 'update_cart_quantity': {
      const updated = cartStore.updateQuantity(
        session.cartId,
        args.product_id,
        args.quantity
      );
      if (updated) {
        const { subtotal, itemCount } = cartStore.getTotal(session.cartId);
        result = {
          success: true,
          message: `数量を${args.quantity}個に変更しました`,
          cartSummary: {
            itemCount,
            subtotal,
          },
        };
      } else if (args.quantity <= 0) {
        result = {
          success: true,
          message: '数量が0以下のため商品を削除しました',
        };
      } else {
        result = { success: false, error: 'カートに該当商品がありませんでした' };
      }
      break;
    }

    case 'check_stock': {
      const product = productStore.get(args.product_id);
      if (product) {
        // 簡易的な在庫チェック（実際はDB連携が必要）
        const inStock = product.isActive;
        result = {
          productId: product.id,
          productName: product.name,
          inStock,
          stockLevel: inStock ? 'available' : 'out_of_stock',
          message: inStock
            ? '在庫がございます'
            : '申し訳ございません、現在在庫切れです',
        };
      } else {
        result = { error: '商品が見つかりませんでした' };
      }
      break;
    }

    case 'clear_cart': {
      cartStore.clear(session.cartId);
      result = {
        success: true,
        message: 'カートを空にしました',
      };
      break;
    }

    default:
      result = { error: 'Unknown function' };
  }

  // Function結果をOpenAIに返す
  if (session.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
    session.openaiWs.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: message.call_id,
          output: JSON.stringify(result),
        },
      })
    );

    // レスポンス生成を継続
    session.openaiWs.send(
      JSON.stringify({
        type: 'response.create',
      })
    );
  }
}

/**
 * OpenAIへメッセージ転送
 */
function forwardToOpenAI(
  session: VoiceSession,
  message: Record<string, unknown>
): void {
  if (session.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
    session.openaiWs.send(JSON.stringify(message));
  }
}

/**
 * 音声セッション終了
 */
function endVoiceSession(session: VoiceSession): void {
  if (session.openaiWs) {
    session.openaiWs.close();
    session.openaiWs = null;
  }

  session.ws.send(
    JSON.stringify({
      type: 'voice_session_ended',
    })
  );
}

/**
 * 商品情報送信
 */
function sendProducts(session: VoiceSession): void {
  const products = productStore.getAll();
  session.ws.send(
    JSON.stringify({
      type: 'products',
      products,
    })
  );
}

/**
 * システムプロンプト生成
 */
function getSystemPrompt(config: AgentConfig, productContext: string): string {
  const languageInstructions = {
    Japanese: '日本語で応答してください。',
    English: 'Please respond in English.',
    Korean: '한국어로 응답해 주세요.',
  };

  return `あなたは「${config.name}」という名前のAIショッピングアシスタントです。

## パーソナリティ
${config.personality}

## 役割
実店舗の優秀な販売員のように、お客様に寄り添った接客を行います。

## 行動指針
1. 最初は明るく親しみやすい挨拶から始める
2. お客様のニーズを丁寧にヒアリングする
3. 商品の特徴や魅力をセールストーク風に紹介する
4. 生産地、素材、こだわりポイントなど付加情報も伝える
5. お客様の予算や好みに合わせた提案を行う

## 会話スタイル
- 自然な言葉で話す
- 短めの文で、聞き取りやすく
- 柔らかい語尾で親しみやすく
- 適度な相槌や確認を入れる

## 言語
${languageInstructions[config.language]}

## 利用可能な商品情報
${productContext}

## 商品検索機能
search_products関数を使用して商品を検索できます。
get_product_details関数を使用して商品の詳細を取得できます。

## 注意事項
- 商品情報にない商品は提案しない
- 価格は正確に伝える
- わからないことは正直に伝える
- 押し売りはしない

## 通話開始メッセージ
${config.startMessage}

## 通話終了メッセージ
${config.endMessage}`;
}
