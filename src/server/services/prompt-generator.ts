/**
 * Dynamic Prompt Generator Service
 * Store URLから抽出した商品情報を元にプロンプトを動的に生成
 */

import { productStore } from './store.js';
import type { Product } from '../../types/index.js';

export interface StoreContext {
  storeName: string;
  storeDescription?: string;
  storeUrl?: string;
  categories?: string[];
  brandVoice?: {
    tone: string;
    keywords: string[];
    avoidWords: string[];
  };
  policies?: {
    shipping?: string;
    returns?: string;
    payment?: string;
  };
}

export interface EnabledFeatures {
  productSearch: boolean;
  priceComparison: boolean;
  recommendations: boolean;
  inventoryCheck: boolean;
}

export interface DynamicPromptConfig {
  agentType: string;
  agentName: string;
  personality: string;
  language: 'Japanese' | 'English' | 'Korean';
  startMessage: string;
  endMessage: string;
  storeContext?: StoreContext;
  customRules?: string[];
  enabledFeatures?: EnabledFeatures;
}

/**
 * 商品情報をLLM用のコンテキストに変換
 */
function buildProductContext(products: Product[]): string {
  if (products.length === 0) {
    return '現在、商品情報が登録されていません。お客様の質問に一般的にお答えください。';
  }

  const activeProducts = products.filter((p) => p.isActive);

  // カテゴリ別にグループ化
  const grouped = activeProducts.reduce((acc, product) => {
    const category = (product as Product & { category?: string }).category || '一般';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  let context = `## 取り扱い商品（${activeProducts.length}点）\n\n`;

  for (const [category, items] of Object.entries(grouped)) {
    context += `### ${category}\n`;
    for (const product of items) {
      context += `- **${product.name}**`;
      if (product.price > 0) {
        context += ` - ¥${product.price.toLocaleString()}`;
      }
      context += '\n';
      if (product.description) {
        context += `  ${product.description.slice(0, 100)}${product.description.length > 100 ? '...' : ''}\n`;
      }
    }
    context += '\n';
  }

  return context;
}

/**
 * ストア情報をコンテキストに変換
 */
function buildStoreContext(store: StoreContext): string {
  let context = `## ストア情報\n\n`;
  context += `**店舗名**: ${store.storeName}\n`;

  if (store.storeDescription) {
    context += `**概要**: ${store.storeDescription}\n`;
  }

  if (store.categories && store.categories.length > 0) {
    context += `**取り扱いカテゴリ**: ${store.categories.join('、')}\n`;
  }

  if (store.brandVoice) {
    context += `\n### ブランドボイス\n`;
    context += `- トーン: ${store.brandVoice.tone}\n`;
    if (store.brandVoice.keywords.length > 0) {
      context += `- 使用推奨キーワード: ${store.brandVoice.keywords.join('、')}\n`;
    }
    if (store.brandVoice.avoidWords.length > 0) {
      context += `- 使用禁止ワード: ${store.brandVoice.avoidWords.join('、')}\n`;
    }
  }

  if (store.policies) {
    context += `\n### ストアポリシー\n`;
    if (store.policies.shipping) {
      context += `- 配送: ${store.policies.shipping}\n`;
    }
    if (store.policies.returns) {
      context += `- 返品: ${store.policies.returns}\n`;
    }
    if (store.policies.payment) {
      context += `- 支払い: ${store.policies.payment}\n`;
    }
  }

  return context;
}

/**
 * エージェントタイプ別のロールセクションを生成
 */
function buildRoleSection(agentType: string): string {
  const roles: Record<string, string> = {
    'shopping-guide': `# Role: ショッピングガイド
お客様を温かくお迎えし、商品カタログをご案内するガイドです。

## 主な責務
1. ブランドセーフな挨拶と歓迎
2. お客様のニーズのヒアリング
3. 商品カタログからの最適な提案
4. 購入までのスムーズな案内

## 会話フロー
1. 歓迎の挨拶 → 2. ニーズ把握 → 3. 商品提案 → 4. 詳細説明 → 5. 購入サポート`,

    'product-sales': `# Role: 商品販売スペシャリスト
商品の詳細情報を熟知し、購入を促進するスペシャリストです。

## 主な責務
1. 商品スペックの詳細説明
2. 在庫状況の確認
3. レビュー・評判の紹介
4. アップセル・クロスセルの提案

## セールステクニック
- 「こちらは○○で人気があります」
- 「△△と組み合わせると便利です」
- 「お客様の用途には、このモデルがおすすめです」`,

    'faq-support': `# Role: FAQサポート
よくある質問に即座にお答えするサポートエージェントです。

## 主な責務
1. ナレッジベースからのFAQ回答
2. 関連記事・リンクの案内
3. 解決できない問題のエスカレーション

## 回答ガイドライン
- 質問への感謝から始める
- 3ステップ以内で回答
- 追加質問の有無を確認`,

    'omotenashi-advisor': `# Role: おもてなしアドバイザー
お客様の潜在ニーズを引き出し、素敵な出会いを提案するアドバイザーです。

## 主な責務
1. 潜在的なニーズの発掘
2. ストーリー性のある商品提案
3. 迷いの払拭と購入サポート

## おもてなしの心得
- 「売りつける」ではなく「素敵な出会いを提案」
- スペックよりベネフィットを優先
- 共感から始め、押し売りはしない
- お客様の物語に寄り添う提案`,
  };

  return roles[agentType] || roles['shopping-guide'];
}

/**
 * 動的にシステムプロンプトを生成
 */
export function generateDynamicPrompt(config: DynamicPromptConfig): string {
  const products = productStore.getAll();
  const productContext = buildProductContext(products);
  const storeContext = config.storeContext ? buildStoreContext(config.storeContext) : '';
  const roleSection = buildRoleSection(config.agentType);

  const languageConfig = {
    Japanese: {
      instruction: '必ず日本語で応答してください。',
      fillers: '「えーと」「そうですね」「なるほど」などの自然な相槌を適度に入れてください。',
      style: '丁寧語を基本としつつ、親しみやすい話し方を心がけてください。',
    },
    English: {
      instruction: 'Always respond in English.',
      fillers: 'Use natural fillers like "well", "you know", "I see" occasionally.',
      style: 'Be friendly and professional in your tone.',
    },
    Korean: {
      instruction: '반드시 한국어로 응답해 주세요.',
      fillers: '"음", "그렇군요", "네" 등의 자연스러운 추임새를 적절히 사용해 주세요.',
      style: '존댓말을 기본으로 하되, 친근한 말투를 사용해 주세요.',
    },
  };

  const lang = languageConfig[config.language];

  // 有効な機能のリスト
  const enabledFeatures = config.enabledFeatures || {
    productSearch: true,
    recommendations: true,
    priceComparison: false,
    inventoryCheck: false,
  };

  // ツール使用のガイドライン（重要）
  const toolUsageGuide = `## ツール使用ガイドライン（必ず守ること）

### 購入インテント検出時の即座アクション
お客様が以下のような発話をしたら、**必ず対応するツールを呼び出してください**：

1. **「〇〇を△個ください」「〇〇△つお願い」** →
   - まずsearch_productsで商品を検索
   - 見つかったらadd_to_cartを quantity: △ で呼び出す
   - 例: 「ポジショコラ3個」→ search_products("ポジショコラ") → add_to_cart(id, 3)

2. **「それください」「買います」「カートに入れて」** →
   - 直前に紹介した商品のIDでadd_to_cartを呼び出す

3. **「カート見せて」「今何入ってる」** →
   - get_cartを呼び出す

4. **「注文します」「お会計お願い」** →
   - get_cartで確認後、place_orderを呼び出す

### 重要な注意点
- 商品名で指定された場合は、**必ず先にsearch_products**で検索してからadd_to_cart
- 数量は「3個」「三つ」「3」すべて数値3として扱う
- ツール呼び出し後、結果をお客様に伝える
- 連続したツール呼び出し（検索→カート追加）は順番に実行`;

  const featuresSection = `## 利用可能な機能
${enabledFeatures.productSearch ? '- 商品検索: search_products関数で商品を検索できます\n' : ''}${enabledFeatures.recommendations ? '- 商品レコメンド: お客様のニーズに合った商品を提案できます\n' : ''}${enabledFeatures.priceComparison ? '- 価格比較: 類似商品との価格比較ができます\n' : ''}${enabledFeatures.inventoryCheck ? '- 在庫確認: リアルタイムの在庫状況を確認できます\n' : ''}

${toolUsageGuide}`;

  // カスタムルールのセクション
  const customRulesSection = config.customRules && config.customRules.length > 0
    ? `## カスタムルール\n${config.customRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}\n`
    : '';

  return `# Identity
あなたは「${config.agentName}」です。音声でお客様と会話するAIアシスタントです。

# Voice Characteristics
- 声のトーン: 明るく、親しみやすく、信頼感のある声
- 話すスピード: ゆっくりめ、聞き取りやすいペース
- ${lang.fillers}

# Personality
${config.personality}

${roleSection}

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

# Language
${lang.instruction}

${storeContext}

${productContext}

${featuresSection}

${customRulesSection}

# Opening Message
会話開始時は、以下のメッセージを使って挨拶してください：
「${config.startMessage}」

# Closing Message
会話終了時は、以下のメッセージで締めてください：
「${config.endMessage}」

# Important Notes
- 相手の話を遮らない
- 長い沈黙を避ける（2秒以上空いたら確認を入れる）
- 技術的な問題があれば素直に謝罪
- 商品情報にない商品は提案しない
- 価格は正確に伝える
- わからないことは正直に「確認いたします」と伝える
- 押し売りはしない`;
}

/**
 * URLからストアコンテキストを自動生成
 */
export function generateStoreContextFromUrl(url: string): StoreContext {
  // URLからドメイン名を抽出してストア名として使用
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  const storeName = domain.split('.')[0];

  // 基本的なストアコンテキストを生成
  return {
    storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
    storeUrl: url,
    brandVoice: {
      tone: 'フレンドリーでプロフェッショナル',
      keywords: [],
      avoidWords: [],
    },
  };
}

/**
 * プロンプトのプレビュー生成（デバッグ用）
 */
export function previewPrompt(config: DynamicPromptConfig): {
  prompt: string;
  stats: {
    totalLength: number;
    productCount: number;
    hasStoreContext: boolean;
    enabledFeatures: string[];
  };
} {
  const prompt = generateDynamicPrompt(config);
  const products = productStore.getAll();

  const enabledFeatures: string[] = [];
  if (config.enabledFeatures?.productSearch) enabledFeatures.push('productSearch');
  if (config.enabledFeatures?.recommendations) enabledFeatures.push('recommendations');
  if (config.enabledFeatures?.priceComparison) enabledFeatures.push('priceComparison');
  if (config.enabledFeatures?.inventoryCheck) enabledFeatures.push('inventoryCheck');

  return {
    prompt,
    stats: {
      totalLength: prompt.length,
      productCount: products.filter((p) => p.isActive).length,
      hasStoreContext: !!config.storeContext,
      enabledFeatures,
    },
  };
}
