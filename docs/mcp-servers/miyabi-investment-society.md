# Miyabi Investment Society MCP Server

## Overview

マルチエージェント投資分析MCPサーバー。7つの専門エージェントが協調して包括的な投資分析を提供。

## Installation

```json
// .claude/mcp.json
{
  "miyabi-investment-society": {
    "command": "node",
    "args": [".claude/mcp-servers/miyabi-investment-society/index.js"],
    "description": "マルチエージェント投資分析"
  }
}
```

## Agents (7名)

### 1. ばしょみるん (Market Overview Agent)
**役割:** 市場概況の把握

| Tool | Description |
|------|-------------|
| `invest_market_overview` | 主要指数、VIX、市場センチメント取得 |

**Parameters:**
- `region`: `japan` / `us` / `global`

---

### 2. えらぶん (Stock Screener Agent)
**役割:** 条件に基づく銘柄スクリーニング

| Tool | Description |
|------|-------------|
| `invest_screen_stocks` | 条件に基づく銘柄スクリーニング |

**Parameters:**
- `symbols`: 対象銘柄リスト
- `pe_min` / `pe_max`: PER範囲
- `roe_min`: ROE下限 (%)
- `dividend_yield_min`: 配当利回り下限 (%)

---

### 3. ちゃーとみるん (Technical Analysis Agent)
**役割:** テクニカル指標分析

| Tool | Description |
|------|-------------|
| `invest_technical_analysis` | SMA, RSI, MACD, ボリンジャー分析 |

**Parameters:**
- `symbol`: 銘柄シンボル (例: `AAPL`, `7203.T`)

**Response:**
```json
{
  "symbol": "AAPL",
  "sma": { "sma20": 180.5, "sma50": 175.2, "sma200": 165.8 },
  "rsi": { "value": 58.3, "signal": "neutral" },
  "macd": { "line": 2.5, "signal": 1.8, "histogram": 0.7 },
  "bollinger": { "upper": 190, "middle": 180, "lower": 170 }
}
```

---

### 4. ざいむみるん (Fundamental Analysis Agent)
**役割:** ファンダメンタル指標分析

| Tool | Description |
|------|-------------|
| `invest_fundamental_analysis` | PER, PBR, ROE, 財務健全性分析 |

**Parameters:**
- `symbol`: 銘柄シンボル

**Response:**
```json
{
  "symbol": "AAPL",
  "valuation": { "per": 28.5, "pbr": 45.2, "psr": 7.8 },
  "profitability": { "roe": 147.3, "roa": 28.1, "grossMargin": 43.5 },
  "financial_health": { "debtToEquity": 1.87, "currentRatio": 0.99 }
}
```

---

### 5. りすくみるん (Risk Metrics Agent)
**役割:** リスク指標分析

| Tool | Description |
|------|-------------|
| `invest_risk_metrics` | ベータ, ボラティリティ, VaR, シャープレシオ |

**Parameters:**
- `symbol`: 銘柄シンボル

**Response:**
```json
{
  "symbol": "AAPL",
  "beta": 1.25,
  "volatility": { "daily": 1.8, "annualized": 28.5 },
  "var": { "95%": -3.2, "99%": -5.1 },
  "sharpeRatio": 1.42,
  "maxDrawdown": -15.3
}
```

---

### 6. さいてきかくん (Portfolio Analysis Agent)
**役割:** ポートフォリオ分析・最適化

| Tool | Description |
|------|-------------|
| `invest_portfolio_analysis` | 評価額、損益、分散度分析 |

**Parameters:**
```json
{
  "holdings": [
    { "symbol": "AAPL", "shares": 100, "avg_cost": 150.0 },
    { "symbol": "GOOGL", "shares": 50, "avg_cost": 130.0 }
  ]
}
```

**Response:**
```json
{
  "totalValue": 52500,
  "totalGain": 7500,
  "totalGainPercent": 16.7,
  "diversification": { "score": 0.72, "recommendation": "Consider adding bonds" },
  "holdings": [...]
}
```

---

### 7. とうしきるん (Comprehensive Analysis Agent)
**役割:** 総合分析・投資判断

| Tool | Description |
|------|-------------|
| `invest_analyze` | テクニカル + ファンダメンタル + リスク総合分析 |

**Parameters:**
- `symbol`: 銘柄シンボル
- `depth`: `quick` / `standard` / `deep`

**Response:**
```json
{
  "symbol": "AAPL",
  "overallScore": 78,
  "recommendation": "BUY",
  "technical": { ... },
  "fundamental": { ... },
  "risk": { ... },
  "summary": "Strong fundamentals with positive technical momentum"
}
```

---

## Additional Tools

### invest_quote
銘柄の現在値を取得

**Parameters:**
- `symbol`: 銘柄シンボル

---

### にゅーすあつめるん (News Agent)

| Tool | Description |
|------|-------------|
| `invest_news_stock` | 特定銘柄のニュース取得・センチメント分析 |
| `invest_news_market` | 市場全体のニュース・トレンド分析 |
| `invest_news_search` | キーワードでニュース検索 |

**Parameters (invest_news_stock):**
- `symbol`: 銘柄シンボル
- `limit`: 取得件数 (default: 10)

**Parameters (invest_news_market):**
- `region`: `japan` / `us`
- `limit`: 取得件数 (default: 15)

**Parameters (invest_news_search):**
- `query`: 検索キーワード (例: `AI`, `semiconductor`)
- `limit`: 取得件数 (default: 10)

---

## Symbol Format

| Market | Format | Example |
|--------|--------|---------|
| US Stocks | SYMBOL | AAPL, GOOGL, MSFT |
| Japan Stocks | CODE.T | 7203.T, 9984.T |
| Crypto | SYMBOL-USD | BTC-USD, ETH-USD |
| Forex | PAIR=X | USDJPY=X |

---

## Usage Examples

### 1. 市場概況確認
```
投資について相談したいのですが、まず米国市場の概況を教えてください
```
→ `invest_market_overview` (region: us)

### 2. 銘柄分析
```
Appleの株を買おうと思っています。分析してください
```
→ `invest_analyze` (symbol: AAPL, depth: deep)

### 3. ポートフォリオ診断
```
私のポートフォリオを分析してください：
AAPL 100株 @$150
GOOGL 50株 @$130
```
→ `invest_portfolio_analysis`

### 4. スクリーニング
```
PER 20以下、ROE 15%以上、配当利回り3%以上の銘柄を探してください
```
→ `invest_screen_stocks`

---

## Data Sources

- **Yahoo Finance API** - リアルタイム株価、財務データ
- **Alpha Vantage** - テクニカル指標（オプション）
- **News API** - ニュース取得

---

## Rate Limiting

- Yahoo Finance: 2000 requests/hour
- News API: 100 requests/day (free tier)

---

## Error Handling

| Error | Description |
|-------|-------------|
| SYMBOL_NOT_FOUND | 銘柄が見つかりません |
| API_ERROR | データソースエラー |
| RATE_LIMIT_EXCEEDED | レート制限超過 |

---

## Integration

### TradingView Webhook連携

`tradingview-webhook` MCPと連携して、アラート受信時に自動分析:

```
TradingView Alert → tradingview__analyze_alert → invest_analyze
```

---

## Related

- [tradingview-webhook](./tradingview-webhook.md) - Webhook受信サーバー
- [.claude/mcp.json](../../.claude/mcp.json) - MCP設定ファイル
