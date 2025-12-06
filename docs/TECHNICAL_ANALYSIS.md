# omakase.ai 技術分析ドキュメント

## 目次

1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [外部サービス依存関係](#外部サービス依存関係)
4. [独自開発部分](#独自開発部分)
5. [プロトコル詳細](#プロトコル詳細)
6. [競合分析](#競合分析)
7. [技術的課題と改善案](#技術的課題と改善案)

---

## 概要

omakase.aiはEC（電子商取引）サイト向けの音声AIショッピングアシスタントプラットフォームです。

### ビジネスモデル

```
ECサイト運営者 → omakase.ai Widget埋め込み → 音声で商品案内・カート操作
```

### 主要機能

| 機能 | 説明 |
|-----|------|
| 音声対話 | 自然言語で商品検索・質問応答 |
| 商品案内 | 商品詳細説明・レコメンデーション |
| カート操作 | 音声でカート追加・削除・数量変更 |
| 注文処理 | 音声での注文確定サポート |
| FAQ対応 | よくある質問への自動応答 |

---

## システムアーキテクチャ

### 全体構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ブラウザ (User)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    omakase.ai Widget                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐  │   │
│  │  │ マイク入力 │  │ スピーカー │  │ 商品UI / カートUI      │  │   │
│  │  └─────┬─────┘  └─────▲─────┘  └────────────────────────┘  │   │
│  │        │              │                                      │   │
│  │        ▼              │                                      │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              Daily.co WebRTC Client                  │    │   │
│  │  │  - daily-js SDK v0.85.0                              │    │   │
│  │  │  - Audio Track (Opus 48kHz)                          │    │   │
│  │  └───────────────────────┬─────────────────────────────┘    │   │
│  └──────────────────────────┼──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ WebSocket + WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Daily.co SFU                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  - WebSocket Signaling (wss://ip-xxx.wss.daily.co)           │  │
│  │  - ICE/TURN (Cloudflare STUN, Twilio TURN)                   │  │
│  │  - mediasoup SFU                                              │  │
│  │  - 3参加者: User, Vapi Speaker, Vapi Listener                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ 音声ストリーム
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          VAPI Platform                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │  Vapi Listener │  │  Vapi Speaker  │  │   AI Pipeline      │   │
│  │  (STT処理)     │  │  (TTS出力)     │  │  - LLM (GPT/Claude)│   │
│  └───────┬────────┘  └───────▲────────┘  │  - Function Tools  │   │
│          │                   │           └─────────┬──────────┘   │
│          └───────────────────┴─────────────────────┘              │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Function Calls
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      omakase.ai Backend                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Express.js Server                        │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  Products API  │  Cart API  │  Knowledge API  │  Voice API │    │
│  └────────────────┴────────────┴────────────────┴─────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              In-Memory Store (商品/カート/FAQ)              │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### レイヤー構成

| レイヤー | 技術 | 役割 |
|---------|------|------|
| Presentation | React + TypeScript | Widget UI |
| Transport | Daily.co WebRTC | リアルタイム音声 |
| AI Platform | VAPI | 音声AI処理 |
| Application | Express.js | ビジネスロジック |
| Data | In-Memory Store | 商品/カート管理 |

---

## 外部サービス依存関係

### 1. VAPI (Voice AI Platform)

**役割**: 音声AI基盤

```
POST https://api.vapi.ai/call/web
{
  "assistantId": "91eb9aaa-17dc-4aa0-862b-e28fa21c0df4",
  "assistantOverrides": {
    "variableValues": {
      "page_context": { ... }
    }
  }
}
```

**提供機能**:
- 音声認識 (STT): Deepgram, OpenAI Whisper等
- 音声合成 (TTS): ElevenLabs, Google等
- LLM統合: OpenAI GPT, Anthropic Claude
- Function Calling: カスタムツール実行
- 会話管理: ターン制御、割り込み処理

**料金体系** (推定):
- 通話時間ベースの従量課金
- 月間150M+通話処理実績

### 2. Daily.co (WebRTC Infrastructure)

**役割**: リアルタイム通信基盤

```
WebSocket: wss://ip-129-154-201-67s-ap-seoul-1.wss.daily.co
Room: vapi/N9APRYpy...
```

**提供機能**:
- SFU (Selective Forwarding Unit)
- ICE/TURN サーバー
- グローバル75+拠点
- 13ms中央値レイテンシ

**特徴**:
- VAPIの内部で使用
- ユーザーから直接見えない

### 3. Clerk (Authentication)

**役割**: ユーザー認証

```
POST https://clerk.omakase.ai/v1/client/sessions/{id}/touch
POST https://clerk.omakase.ai/v1/client/sessions/{id}/tokens
```

**提供機能**:
- セッション管理
- JWT発行・検証
- 45秒ごとのトークン更新

### 4. Microsoft Clarity (Analytics)

**役割**: ユーザー行動分析

**提供機能**:
- セッション録画
- ヒートマップ
- 行動分析

---

## 独自開発部分

### 価値提供マトリクス

```
                    独自性 高
                        ▲
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │  ③ Widget UI    │  ① プロンプト設計 │
     │  カスタムUI      │  EC販売シナリオ   │
     │                  │                  │
─────┼──────────────────┼──────────────────┼────▶ 差別化 高
     │                  │                  │
     │  ④ 認証/分析    │  ② バックエンド   │
     │  (Clerk/Clarity) │  商品・カートAPI  │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                    独自性 低
```

### 1. プロンプト設計・会話シナリオ (差別化 高・独自性 高)

**EC販売特化の会話設計**:

```javascript
// VAPI Assistant Override
{
  "variableValues": {
    "store_name": "Sample Store",
    "page_context": {
      "current_product": "商品名",
      "price": 2500,
      "stock": "在庫あり"
    }
  }
}
```

**独自価値**:
- 販売心理を考慮した会話フロー
- 商品コンテキストの動的注入
- クロスセル・アップセル対応
- 日本語特化の自然な応答

### 2. バックエンド API (差別化 高・独自性 中)

**Function Tools定義**:

| Tool | 機能 | 独自性 |
|------|------|--------|
| `search_products` | 商品検索 | ★★☆ |
| `add_to_cart` | カート追加 | ★★★ |
| `get_recommendations` | レコメンド | ★★★ |
| `check_stock` | 在庫確認 | ★★☆ |
| `place_order` | 注文確定 | ★★★ |

### 3. Widget UI (差別化 中・独自性 高)

**独自開発コンポーネント**:

```
frontend/src/
├── components/
│   ├── preview-phone.tsx      # プレビュー表示
│   ├── agent-selector.tsx     # エージェント選択
│   ├── config-panel.tsx       # 設定パネル
│   ├── ec-context-form.tsx    # EC連携設定
│   └── navigation-sidebar.tsx # ナビゲーション
├── lib/
│   ├── api.ts                 # APIクライアント
│   └── realtime.ts            # WebSocket処理
└── App.tsx                    # メインアプリ
```

### 4. 技術インテグレーション (差別化 低)

外部サービスの組み合わせ:
- VAPI + Daily.co + Clerk

---

## プロトコル詳細

### 通話開始シーケンス

```
1. 認証フェーズ (Clerk)
   User → Widget: Click Start Call
   Widget → Clerk: POST /sessions/{id}/touch
   Clerk → Widget: 200 OK

2. VAPI初期化
   Widget → VAPI: POST /call/web
   VAPI → Widget: 201 {webCallUrl, monitor}

3. Daily.co接続
   Widget → DailyGS: POST /rooms/check/vapi/{roomId}
   DailyGS → Widget: {sigAuthz, iceConfig, worker}

4. WebSocket確立
   Widget → DailySFU: WSS Connect
   Widget → DailySFU: join-for-sig
   DailySFU → Widget: sig-ack {topology: "sfu"}

5. WebRTCトランスポート
   Widget → DailySFU: create-transport {direction: "send"}
   Widget → DailySFU: create-transport {direction: "recv"}
   Widget → DailySFU: connect-transport
   Widget → DailySFU: send-track {kind: "audio"}

6. Vapiエージェント参加
   DailySFU → Widget: sig-presence "Vapi Speaker"
   DailySFU → Widget: sig-presence "Vapi Listener"

7. 音声会話開始
   VapiSpeaker → DailySFU: sig-msg {type: "speech-update"}
```

### メッセージフォーマット

**join-for-sig**:
```json
{
  "mtgStr": "vapi/N9APRYpy...",
  "sessionId": "1f10d149-...",
  "sigAuthz": "eyJhbG...",
  "presence": {
    "callState": "passive",
    "browser": {"name": "Chrome", "version": 142}
  }
}
```

**send-track**:
```json
{
  "transportId": "42701608-...",
  "kind": "audio",
  "rtpParameters": {
    "codecs": [{"mimeType": "audio/opus", "clockRate": 48000}],
    "encodings": [{"ssrc": 2196480919}]
  },
  "appData": {"mediaTag": "cam-audio"}
}
```

---

## 競合分析

### 主要競合

| サービス | 特徴 | 料金モデル |
|---------|------|-----------|
| **VAPI** | 汎用音声AI API | 従量課金 |
| **Pipecat** | OSS音声AIフレームワーク | 無料 (インフラ別) |
| **Retell AI** | 電話特化 | 従量課金 |
| **Bland AI** | 電話自動化 | 従量課金 |

### omakase.aiのポジショニング

```
                    汎用性 高
                        ▲
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │    VAPI         │   Pipecat        │
     │                  │   (OSS)          │
     │                  │                  │
─────┼──────────────────┼──────────────────┼────▶ カスタマイズ性 高
     │                  │                  │
     │  Retell AI      │  omakase.ai      │
     │  Bland AI       │  (EC特化)         │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                    汎用性 低 (垂直特化)
```

### 差別化要因

1. **EC特化**: 商品・カート・注文に最適化
2. **日本市場**: 日本語対応、日本EC習慣理解
3. **簡単導入**: ウィジェット埋め込みのみ
4. **カスタマイズ**: ブランド・声・シナリオ

---

## 技術的課題と改善案

### 現状の課題

| 課題 | 重要度 | 説明 |
|-----|--------|------|
| VAPI依存 | 高 | 音声AI基盤が完全外部依存 |
| コスト構造 | 中 | VAPI従量課金がスケール時ボトルネック |
| レイテンシ | 中 | 複数サービス経由で遅延蓄積 |
| データ永続化 | 高 | 現状In-Memoryのみ |

### 改善案

#### 1. Pipecat移行によるコスト最適化

```
現状: omakase.ai → VAPI → Daily.co
改善: omakase.ai → Pipecat → Daily.co (直接)
```

**メリット**:
- VAPI料金削減
- カスタマイズ自由度向上
- STT/TTS/LLM選択の柔軟性

**Pipecat構成例**:
```python
from pipecat.frames.frames import LLMMessagesFrame
from pipecat.processors.aggregators.llm_response import LLMAssistantResponseAggregator
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.services.anthropic import AnthropicLLMService
from pipecat.transports.services.daily import DailyTransport

# EC特化パイプライン
pipeline = Pipeline([
    DailyTransport(),           # WebRTC
    DeepgramSTTService(),       # 音声認識
    AnthropicLLMService(),      # Claude
    ElevenLabsTTSService(),     # 音声合成
])
```

#### 2. データベース導入

```
現状: In-Memory Store
改善: PostgreSQL + Redis
```

**スキーマ例**:
```sql
-- 商品
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2),
  stock_quantity INT,
  created_at TIMESTAMP
);

-- カート
CREATE TABLE carts (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255),
  created_at TIMESTAMP
);

-- カートアイテム
CREATE TABLE cart_items (
  cart_id UUID REFERENCES carts(id),
  product_id UUID REFERENCES products(id),
  quantity INT
);
```

#### 3. 独自WebRTC (長期)

Daily.co依存を減らし、自社SFU運用:

```
現状: Daily.co (マネージド)
改善: mediasoup自社運用 (コスト削減)
```

---

## 関連ドキュメント

- [API.md](./API.md) - API仕様書
- [omakase-ai-protocol.puml](./omakase-ai-protocol.puml) - プロトコルシーケンス図

---

## 更新履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-06 | 初版作成、HAR解析に基づく技術分析 |
