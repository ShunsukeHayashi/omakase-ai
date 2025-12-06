# TradingView Webhook MCP Server

## 概要

TradingViewアラートを受信し、分析・管理するMCPサーバー。miyabi-investment-societyと連携して投資判断を支援。

## 基本情報

| 項目 | 値 |
|------|-----|
| サーバー名 | `tradingview-webhook` |
| ポート | 3456 (デフォルト) |
| プロトコル | HTTP |
| CORS | 有効 |
| 最大アラート保持数 | 1000 |

---

## MCP ツール一覧

### 1. start_server

Webhookサーバーを起動します。

```typescript
{
  name: "start_server",
  parameters: {
    port?: number  // デフォルト: 3456
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "port": 3456,
  "message": "TradingView webhook server started"
}
```

### 2. stop_server

Webhookサーバーを停止します。

```typescript
{
  name: "stop_server",
  parameters: {}
}
```

### 3. get_status

サーバーの稼働状態を取得します。

```typescript
{
  name: "get_status",
  parameters: {}
}
```

**レスポンス例:**
```json
{
  "running": true,
  "port": 3456,
  "alertCount": 42,
  "uptime": 3600000
}
```

### 4. get_alerts

受信したアラート一覧を取得します。

```typescript
{
  name: "get_alerts",
  parameters: {
    limit?: number,     // 取得件数 (デフォルト: 50)
    ticker?: string,    // ティッカーでフィルタ
    since?: string      // ISO日時以降のアラート
  }
}
```

### 5. get_alert

特定のアラートを取得します。

```typescript
{
  name: "get_alert",
  parameters: {
    id: string  // アラートID
  }
}
```

### 6. analyze_alert

アラートを分析し、投資シグナルを抽出します。

```typescript
{
  name: "analyze_alert",
  parameters: {
    id: string  // アラートID
  }
}
```

**レスポンス例:**
```json
{
  "id": "alert_12345",
  "analysis": {
    "trend": "bullish",
    "signal": "buy",
    "strength": "strong",
    "positionValue": 45000.50,
    "intervalMinutes": 60,
    "recommendation": "Consider long position"
  }
}
```

### 7. clear_alerts

保存されたアラートをクリアします。

```typescript
{
  name: "clear_alerts",
  parameters: {
    before?: string  // この日時より前のアラートをクリア
  }
}
```

### 8. test_webhook

テストアラートを送信します。

```typescript
{
  name: "test_webhook",
  parameters: {
    ticker?: string,   // デフォルト: "TEST"
    action?: string    // "buy" | "sell" | "close"
  }
}
```

---

## HTTP エンドポイント

### POST /webhook

TradingViewからのアラートを受信します。

**リクエスト:**
```http
POST http://localhost:3456/webhook
Content-Type: application/json

{
  "ticker": "BTCUSD",
  "exchange": "BINANCE",
  "price": 45000.50,
  "volume": 1234.56,
  "time": "2024-01-15T10:30:00Z",
  "interval": "1H",
  "strategy": {
    "order_action": "buy",
    "order_contracts": 1,
    "position_size": 100
  },
  "alert_message": "Buy signal triggered"
}
```

**レスポンス:**
```json
{
  "success": true,
  "id": "alert_1705315800123_abc123def",
  "message": "Alert received"
}
```

### GET /health

ヘルスチェックエンドポイント。

**レスポンス:**
```json
{
  "status": "ok",
  "uptime": 3600000,
  "alertCount": 42
}
```

### GET /alerts

アラート一覧を取得 (クエリパラメータ対応)。

```http
GET /alerts?limit=10&ticker=BTCUSD
```

---

## TradingView アラート形式

### 基本フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `ticker` | string | Yes | シンボル (例: BTCUSD) |
| `exchange` | string | No | 取引所 (例: BINANCE) |
| `price` | number | No | 現在価格 |
| `volume` | number | No | 出来高 |
| `time` | string | No | ISO8601形式のタイムスタンプ |
| `interval` | string | No | 時間足 (1M, 5M, 1H, 1D等) |

### ストラテジーフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `strategy.order_action` | string | "buy", "sell", "close", "cancel" |
| `strategy.order_contracts` | number | 注文数量 |
| `strategy.position_size` | number | ポジションサイズ (%) |

### TradingView アラートメッセージ設定例

```json
{
  "ticker": "{{ticker}}",
  "exchange": "{{exchange}}",
  "price": {{close}},
  "volume": {{volume}},
  "time": "{{timenow}}",
  "interval": "{{interval}}",
  "strategy": {
    "order_action": "{{strategy.order.action}}",
    "order_contracts": {{strategy.order.contracts}},
    "position_size": {{strategy.position_size}}
  },
  "alert_message": "{{strategy.order.comment}}"
}
```

---

## 分析機能

### トレンド判定

| order_action | トレンド |
|--------------|---------|
| buy | bullish |
| sell | bearish |
| close | neutral |
| cancel | neutral |

### インターバル変換

| 表記 | 分 |
|------|-----|
| 1S | 1/60 |
| 1M | 1 |
| 5M | 5 |
| 15M | 15 |
| 1H | 60 |
| 4H | 240 |
| 1D | 1440 |

### ポジション価値計算

```
positionValue = price × order_contracts
```

---

## miyabi-investment-society 連携

アラート受信時に以下のツールと連携可能:

| ツール | 用途 |
|--------|------|
| `invest_technical_analysis` | テクニカル分析 |
| `invest_fundamental_analysis` | ファンダメンタル分析 |
| `invest_risk_metrics` | リスク指標 |
| `invest_analyze` | 総合分析 |

### 連携例

```typescript
// アラート受信後
const alert = await getAlert(alertId);

// テクニカル分析
const technical = await invest_technical_analysis({
  symbol: alert.payload.ticker
});

// 総合判断
const analysis = await invest_analyze({
  symbol: alert.payload.ticker,
  depth: "deep"
});
```

---

## セキュリティ

### 推奨設定

1. **IPホワイトリスト**: TradingViewのIP範囲を許可
2. **シークレットトークン**: アラートメッセージにトークンを含める
3. **HTTPS**: 本番環境ではSSL/TLS必須

### TradingView IPレンジ

```
52.89.214.238
34.212.75.30
54.218.53.128
52.32.178.7
```

---

## トラブルシューティング

### アラートが受信されない

1. サーバーが起動しているか確認: `get_status`
2. ポートが開いているか確認
3. ファイアウォール設定を確認
4. TradingViewのWebhook URLが正しいか確認

### JSONパースエラー

- TradingViewアラートメッセージが有効なJSONか確認
- 特殊文字のエスケープを確認

### アラートが保存されない

- 最大保持数 (1000) に達していないか確認
- `clear_alerts` で古いアラートを削除

---

## 設定例

### mcp.json

```json
{
  "tradingview-webhook": {
    "command": "node",
    "args": [".claude/mcp-servers/tradingview-webhook.js"],
    "disabled": false,
    "description": "TradingView Webhook受信サーバー"
  }
}
```

---

*Generated by サクラ (Review Agent)*
