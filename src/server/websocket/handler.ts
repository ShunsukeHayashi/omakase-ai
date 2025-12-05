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
import { orderStore } from '../services/order.js';

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

  ws.on('message', (rawData) => {
    try {
      const dataStr = typeof rawData === 'string' ? rawData : Buffer.isBuffer(rawData) ? rawData.toString('utf-8') : String(rawData);
      const message = JSON.parse(dataStr) as Record<string, unknown>;
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

  // デバッグログ
  if (type !== 'input_audio_buffer.append') {
    console.log('[Client →]', type);
  }

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
                description: '商品の在庫状況を確認します。在庫数、在庫切れ、残りわずかなどの情報を返します。',
                parameters: {
                  type: 'object',
                  properties: {
                    product_id: {
                      type: 'string',
                      description: '在庫を確認したい商品のID',
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
              {
                type: 'function',
                name: 'place_order',
                description: 'カートの内容で注文を確定します。お客様の名前やメールアドレスなどの情報を任意で受け取ります。',
                parameters: {
                  type: 'object',
                  properties: {
                    customer_name: {
                      type: 'string',
                      description: 'お客様のお名前',
                    },
                    customer_email: {
                      type: 'string',
                      description: 'メールアドレス',
                    },
                    customer_phone: {
                      type: 'string',
                      description: '電話番号',
                    },
                    notes: {
                      type: 'string',
                      description: '配送に関する備考やメッセージ',
                    },
                  },
                },
              },
              {
                type: 'function',
                name: 'get_order_status',
                description: '注文の状態を確認します。',
                parameters: {
                  type: 'object',
                  properties: {
                    order_id: {
                      type: 'string',
                      description: '注文番号',
                    },
                  },
                  required: ['order_id'],
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

    openaiWs.on('message', (rawData) => {
      // OpenAIからのメッセージをクライアントに転送
      try {
        const dataStr = typeof rawData === 'string' ? rawData : Buffer.isBuffer(rawData) ? rawData.toString('utf-8') : String(rawData);
        const message = JSON.parse(dataStr) as Record<string, unknown>;

        // デバッグログ
        console.log('[OpenAI →]', message.type);

        // エラーの場合は詳細を出力
        if (message.type === 'error') {
          console.error('[OpenAI Error]', JSON.stringify(message, null, 2));
        }

        // Function callの処理
        if (message.type === 'response.function_call_arguments.done') {
          console.log('[Function Call]', message.name);
          handleFunctionCall(session, message);
        }

        session.ws.send(JSON.stringify(message));
      } catch {
        // Binary audio data
        session.ws.send(rawData);
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

// Defined for future use when recommendations needs product/category filtering
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _RecommendationsArgs {
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
      const args = parsedArgs as SearchProductsArgs;
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
      const args = parsedArgs as ProductIdArgs;
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
      const args = parsedArgs as AddToCartArgs;
      const item = cartStore.addItem(
        session.cartId,
        args.product_id,
        args.quantity ?? 1
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
      const args = parsedArgs as SearchFaqArgs;
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
      const args = parsedArgs as ProductIdArgs;
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
      const args = parsedArgs as UpdateCartArgs;
      const updated = cartStore.updateQuantity(
        session.cartId,
        args.product_id,
        args.quantity
      );
      if (updated) {
        const { subtotal, itemCount } = cartStore.getTotal(session.cartId);
        result = {
          success: true,
          message: `数量を${String(args.quantity)}個に変更しました`,
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
      const args = parsedArgs as ProductIdArgs;
      const product = productStore.get(args.product_id);
      if (product) {
        const stockStatus = productStore.getStockStatus(args.product_id);
        result = {
          productId: product.id,
          productName: product.name,
          inStock: stockStatus?.inStock ?? true,
          quantity: stockStatus?.quantity,
          isLowStock: stockStatus?.isLowStock ?? false,
          stockLevel: stockStatus?.inStock ? (stockStatus.isLowStock ? 'low' : 'available') : 'out_of_stock',
          message: stockStatus?.message ?? '在庫情報がありません',
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

    case 'place_order': {
      const args = parsedArgs as {
        customer_name?: string;
        customer_email?: string;
        customer_phone?: string;
        notes?: string;
      };

      // カートの内容を取得
      const cartItems = cartStore.getItems(session.cartId);
      if (cartItems.length === 0) {
        result = {
          success: false,
          error: 'カートが空です。商品を追加してから注文してください。',
        };
        break;
      }

      // 注文アイテムを構築
      const orderItems = cartItems
        .map((item: { productId: string; quantity: number }) => {
          const product = productStore.get(item.productId);
          if (!product) return null;
          return { product, quantity: item.quantity };
        })
        .filter((item: { product: typeof productStore extends { get: (id: string) => infer R } ? R : never; quantity: number } | null): item is { product: NonNullable<ReturnType<typeof productStore.get>>; quantity: number } => item !== null);

      if (orderItems.length === 0) {
        result = {
          success: false,
          error: '商品情報の取得に失敗しました。',
        };
        break;
      }

      // 在庫チェック
      for (const item of orderItems) {
        const stockResult = productStore.decrementStock(item.product.id, item.quantity);
        if (!stockResult.success) {
          result = {
            success: false,
            error: `「${item.product.name}」の${stockResult.error || '在庫が不足しています'}`,
          };
          break;
        }
      }

      // 注文作成
      const order = orderStore.create({
        cartId: session.cartId,
        sessionId: session.sessionId,
        items: orderItems,
        customerInfo: {
          name: args.customer_name,
          email: args.customer_email,
          phone: args.customer_phone,
        },
        notes: args.notes,
      });

      // 注文確定
      orderStore.confirm(order.id);

      // カートをクリア
      cartStore.clear(session.cartId);

      result = {
        success: true,
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        itemCount: order.items.length,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        formattedTotal: `¥${order.total.toLocaleString()}`,
        message: orderStore.formatOrderForVoice(order),
        status: order.status,
      };
      break;
    }

    case 'get_order_status': {
      const args = parsedArgs as { order_id: string };
      const order = orderStore.get(args.order_id);

      if (!order) {
        // 短縮IDでも検索
        const allOrders = orderStore.getAll();
        const found = allOrders.find((o) => o.id.startsWith(args.order_id));
        if (found) {
          const statusMessages: Record<string, string> = {
            pending: '注文を受け付けました。確認中です。',
            confirmed: '注文が確定しました。準備を開始します。',
            processing: '注文を準備中です。',
            shipped: '発送完了しました。お届けまでしばらくお待ちください。',
            delivered: '配達完了しました。',
            cancelled: 'この注文はキャンセルされました。',
          };

          result = {
            orderId: found.id,
            orderNumber: found.id.slice(0, 8).toUpperCase(),
            status: found.status,
            statusMessage: statusMessages[found.status],
            itemCount: found.items.length,
            total: found.total,
            formattedTotal: `¥${found.total.toLocaleString()}`,
            createdAt: found.createdAt.toISOString(),
          };
        } else {
          result = { error: '注文が見つかりませんでした。注文番号をご確認ください。' };
        }
      } else {
        const statusMessages: Record<string, string> = {
          pending: '注文を受け付けました。確認中です。',
          confirmed: '注文が確定しました。準備を開始します。',
          processing: '注文を準備中です。',
          shipped: '発送完了しました。お届けまでしばらくお待ちください。',
          delivered: '配達完了しました。',
          cancelled: 'この注文はキャンセルされました。',
        };

        result = {
          orderId: order.id,
          orderNumber: order.id.slice(0, 8).toUpperCase(),
          status: order.status,
          statusMessage: statusMessages[order.status],
          itemCount: order.items.length,
          total: order.total,
          formattedTotal: `¥${order.total.toLocaleString()}`,
          createdAt: order.createdAt.toISOString(),
        };
      }
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

  // Function結果をクライアントにも送信（UIウィジェット更新用）
  session.ws.send(
    JSON.stringify({
      type: 'function_call_result',
      name,
      call_id: message.call_id,
      result,
    })
  );
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
