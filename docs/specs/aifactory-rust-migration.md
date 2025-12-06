# #836 AIfactory Backend Migration to Rust

## 要件分析ドキュメント

**Issue**: #836
**作成日**: 2025-12-06
**ステータス**: 分析中

---

## 1. 概要

omakase-ai バックエンドを TypeScript/Express から Rust に移行する計画。
パフォーマンス向上、メモリ安全性、並行処理の改善を目的とする。

### 1.1 移行の目的

| 目的 | 期待効果 |
|------|----------|
| パフォーマンス | 10-100倍の処理速度向上 |
| メモリ効率 | 50-80%のメモリ使用量削減 |
| 並行処理 | async/awaitによる効率的なI/O |
| 型安全性 | コンパイル時エラー検出 |
| デプロイ | シングルバイナリ配布 |

---

## 2. 現在のバックエンド構造

### 2.1 技術スタック

```
現行スタック:
├── Runtime: Node.js 18+
├── Framework: Express 5.x
├── Language: TypeScript 5.3
├── WebSocket: ws 8.x
└── その他: axios, cheerio, zod
```

### 2.2 ディレクトリ構造

```
src/server/
├── index.ts                 # エントリーポイント (Express + WebSocket)
├── routes/
│   ├── agents.ts           # /api/agents - エージェント管理
│   ├── knowledge.ts        # /api/knowledge - ナレッジインポート
│   ├── products.ts         # /api/products - 商品管理
│   ├── prompts.ts          # /api/prompts - プロンプト生成
│   ├── scrape.ts           # /api/scrape - スクレイピング
│   ├── scraper.ts          # /api/scraper - EC スクレイパー
│   └── voice.ts            # /api/voice - 音声エージェント
├── services/
│   ├── cart.ts             # カート管理サービス
│   ├── ec-scraper.ts       # EC サイトスクレイピング
│   ├── knowledge.ts        # ナレッジ管理
│   ├── knowledge-importer.ts # ナレッジインポート
│   ├── order.ts            # 注文管理
│   ├── prompt-generator.ts # プロンプト生成
│   ├── scraper.ts          # 汎用スクレイパー
│   ├── store.ts            # 商品ストア
│   └── store-context.ts    # ストアコンテキスト
└── websocket/
    └── handler.ts          # WebSocket ハンドラー
```

### 2.3 API エンドポイント

| エンドポイント | メソッド | 機能 |
|---------------|----------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/agents` | GET/POST | エージェント管理 |
| `/api/knowledge` | POST | ナレッジインポート |
| `/api/products` | GET/POST | 商品CRUD |
| `/api/prompts` | GET/POST | プロンプト生成 |
| `/api/scrape` | POST | 単発スクレイピング |
| `/api/scraper` | POST | EC スクレイピングジョブ |
| `/api/voice` | POST | 音声エージェントセッション |
| `ws://` | WebSocket | リアルタイム音声通信 |

### 2.4 主要サービス

#### ProductStore (store.ts)
- インメモリ商品ストア
- CRUD操作
- 検索・フィルタリング

#### ECScraperService (ec-scraper.ts)
- Shopify/BASE/汎用EC対応
- 非同期ジョブ管理
- 商品データ抽出

#### WebSocket Handler (handler.ts)
- OpenAI Realtime API連携
- 音声ストリーミング
- ツール呼び出し処理

---

## 3. Rust 移行計画

### 3.1 推奨 Rust スタック

```toml
[dependencies]
# Web Framework
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "fs"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# HTTP Client
reqwest = { version = "0.12", features = ["json"] }

# WebSocket
tokio-tungstenite = "0.23"

# Scraping
scraper = "0.19"

# Validation
validator = { version = "0.18", features = ["derive"] }

# Async
futures = "0.3"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"
```

### 3.2 アーキテクチャ設計

```
rust-backend/
├── Cargo.toml
├── src/
│   ├── main.rs              # エントリーポイント
│   ├── lib.rs               # ライブラリルート
│   ├── config.rs            # 設定管理
│   ├── error.rs             # エラーハンドリング
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── health.rs
│   │   ├── agents.rs
│   │   ├── knowledge.rs
│   │   ├── products.rs
│   │   ├── prompts.rs
│   │   ├── scraper.rs
│   │   └── voice.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── cart.rs
│   │   ├── ec_scraper.rs
│   │   ├── knowledge.rs
│   │   ├── order.rs
│   │   ├── product_store.rs
│   │   └── prompt_generator.rs
│   ├── websocket/
│   │   ├── mod.rs
│   │   └── handler.rs
│   └── models/
│       ├── mod.rs
│       ├── product.rs
│       ├── agent.rs
│       └── session.rs
└── tests/
    └── integration/
```

### 3.3 コード変換例

#### TypeScript (現行)
```typescript
// src/server/routes/products.ts
import { Router } from 'express';
import { productStore } from '../services/store.js';

const router = Router();

router.get('/', (_req, res) => {
  const products = productStore.getAll();
  res.json(products);
});

export { router as productsRouter };
```

#### Rust (移行後)
```rust
// src/routes/products.rs
use axum::{extract::State, Json, routing::get, Router};
use crate::services::ProductStore;
use crate::models::Product;
use std::sync::Arc;

pub fn router() -> Router<Arc<ProductStore>> {
    Router::new()
        .route("/", get(get_all_products))
}

async fn get_all_products(
    State(store): State<Arc<ProductStore>>,
) -> Json<Vec<Product>> {
    Json(store.get_all().await)
}
```

---

## 4. 移行フェーズ

### Phase 1: 基盤構築 (1-2週間)

- [ ] Rust プロジェクト初期化
- [ ] Axum + Tokio セットアップ
- [ ] 基本的なルーティング
- [ ] ヘルスチェックエンドポイント
- [ ] Docker設定

### Phase 2: コアサービス移行 (2-3週間)

- [ ] ProductStore実装
- [ ] Cart/Orderサービス
- [ ] 商品APIエンドポイント
- [ ] 単体テスト

### Phase 3: スクレイピング機能 (2週間)

- [ ] EC Scraperサービス
- [ ] Shopify/BASE対応
- [ ] 非同期ジョブ管理
- [ ] scraper crateによるHTML解析

### Phase 4: WebSocket/音声 (2-3週間)

- [ ] WebSocketサーバー実装
- [ ] OpenAI Realtime API連携
- [ ] 音声ストリーミング
- [ ] ツール呼び出し処理

### Phase 5: 統合・テスト (1-2週間)

- [ ] 統合テスト
- [ ] 負荷テスト
- [ ] ベンチマーク比較
- [ ] ドキュメント更新

---

## 5. 技術的考慮事項

### 5.1 並行処理

```rust
// Tokio による非同期処理
use tokio::sync::RwLock;
use std::sync::Arc;

pub struct ProductStore {
    products: RwLock<HashMap<String, Product>>,
}

impl ProductStore {
    pub async fn get_all(&self) -> Vec<Product> {
        self.products.read().await.values().cloned().collect()
    }

    pub async fn add(&self, product: Product) {
        self.products.write().await.insert(product.id.clone(), product);
    }
}
```

### 5.2 エラーハンドリング

```rust
// src/error.rs
use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Product not found: {0}")]
    ProductNotFound(String),

    #[error("Scraping failed: {0}")]
    ScrapingError(String),

    #[error("WebSocket error: {0}")]
    WebSocketError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            AppError::ProductNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::ScrapingError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::WebSocketError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
```

### 5.3 WebSocket実装

```rust
// src/websocket/handler.rs
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
};
use futures::{SinkExt, StreamExt};

pub async fn ws_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    while let Some(msg) = socket.recv().await {
        if let Ok(Message::Text(text)) = msg {
            // OpenAI Realtime API への転送
            let response = process_voice_message(&text).await;
            if socket.send(Message::Text(response)).await.is_err() {
                break;
            }
        }
    }
}
```

---

## 6. 期待されるパフォーマンス改善

| メトリクス | TypeScript | Rust | 改善率 |
|-----------|------------|------|--------|
| レスポンス時間 | 50ms | 5ms | 10x |
| メモリ使用量 | 150MB | 30MB | 5x |
| 同時接続数 | 1,000 | 10,000+ | 10x |
| スループット | 5,000 req/s | 50,000 req/s | 10x |
| 起動時間 | 2s | 0.1s | 20x |

---

## 7. リスクと対策

| リスク | 対策 |
|--------|------|
| 学習コスト | Rust トレーニング、ペアプログラミング |
| 移行期間中の機能追加 | 並行開発、feature freeze検討 |
| 外部ライブラリ互換性 | 事前調査、代替ライブラリ評価 |
| デバッグ難易度 | tracing導入、ログ強化 |

---

## 8. 次のステップ

1. **Phase 1 開始**: Rustプロジェクト初期化
2. **ベンチマーク設計**: 移行前後の比較基準策定
3. **チーム教育**: Rust基礎トレーニング
4. **CI/CD更新**: Rust ビルドパイプライン追加

---

## 参考資料

- [Axum Documentation](https://docs.rs/axum/latest/axum/)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Are We Web Yet?](https://www.arewewebyet.org/)

---

**作成者**: サクラ (Review Agent)
**レビュー**: 未完了
