# Miyabi Investment Society MCP Server

マルチエージェント投資分析システム - 9つの専門AIエージェントによる包括的な投資分析

## 概要

| 項目 | 値 |
|------|-----|
| バージョン | 2.0.0 |
| プロトコル | MCP (Model Context Protocol) |
| ライセンス | MIT |
| API依存 | 無料API（Yahoo Finance等） |

## 9つの専門エージェント

| エージェント名 | 英語名 | 役割 |
|--------------|--------|------|
| **ばしょみるん** | bashomirun | 市場概況エージェント - 主要指数、VIX、センチメント |
| **えらぶん** | erabun | 銘柄スクリーニングエージェント - 条件検索 |
| **ちゃーとみるん** | chartomirun | テクニカル分析エージェント - SMA, RSI, MACD |
| **ざいむみるん** | zaimumirurn | ファンダメンタル分析エージェント - PER, ROE |
| **りすくみるん** | riskumirun | リスク分析エージェント - VaR, シャープレシオ |
| **さいてきかくん** | saitekikakun | ポートフォリオ最適化エージェント |
| **とうしきるん** | toushikirun | 総合分析エージェント - 統合判定 |
| **にゅーすあつめるん** | newsatsurun | ニュース収集エージェント - センチメント分析 |
| **バックテストくん** | backtestkun | バックテストエージェント - 戦略検証 |

---

## ツール一覧 (14ツール)

### 1. invest_market_overview
**エージェント**: ばしょみるん

市場全体の概況を取得します。

```typescript
// パラメータ
{
  region?: 'japan' | 'us' | 'global'  // デフォルト: 'us'
}

// レスポンス例
{
  "agent": { "name": "ばしょみるん", "role": "Market Overview Agent" },
  "region": "us",
  "indices": { "sp500": 5100, "nasdaq": 16200, "dow": 42500 },
  "vix": 14.5,
  "sentiment": "neutral",
  "trend": "sideways"
}
```

**使用例**:
```
「米国市場の概況を教えて」
「日本市場の状況は？」
```

---

### 2. invest_screen_stocks
**エージェント**: えらぶん

条件に基づいて銘柄をスクリーニングします。

```typescript
// パラメータ
{
  symbols?: string[]        // 対象銘柄リスト
  pe_min?: number           // PER下限
  pe_max?: number           // PER上限
  roe_min?: number          // ROE下限 (%)
  dividend_yield_min?: number // 配当利回り下限 (%)
}

// レスポンス例
{
  "agent": { "name": "えらぶん" },
  "results": [
    { "symbol": "AAPL", "pe": 28.5, "roe": 147.2, "dividend_yield": 0.5, "score": 85 }
  ],
  "total_screened": 500,
  "matches": 2
}
```

**使用例**:
```
「PER 20以下、ROE 15%以上の銘柄を探して」
「高配当銘柄をスクリーニング」
```

---

### 3. invest_technical_analysis
**エージェント**: ちゃーとみるん

テクニカル指標を分析します。

```typescript
// パラメータ
{
  symbol: string  // 必須: 銘柄シンボル
}

// レスポンス例
{
  "agent": { "name": "ちゃーとみるん" },
  "symbol": "AAPL",
  "indicators": {
    "sma": { "sma20": 180.5, "sma50": 175.2, "sma200": 165.8 },
    "rsi": { "value": 55, "signal": "neutral" },
    "macd": { "macd": 2.5, "signal": 1.8, "histogram": 0.7, "trend": "bullish" },
    "bollinger": { "upper": 195, "middle": 182, "lower": 169, "position": "middle" }
  },
  "overall_signal": "buy",
  "confidence": 0.72
}
```

**使用例**:
```
「AAPLのテクニカル分析をして」
「MACDとRSIを確認して」
```

---

### 4. invest_fundamental_analysis
**エージェント**: ざいむみるん

ファンダメンタル指標を分析します。

```typescript
// パラメータ
{
  symbol: string  // 必須: 銘柄シンボル
}

// レスポンス例
{
  "agent": { "name": "ざいむみるん" },
  "symbol": "AAPL",
  "valuation": { "pe": 28.5, "pb": 45.2, "ps": 7.8, "ev_ebitda": 22.1 },
  "profitability": { "roe": 147.2, "roa": 28.5, "margin_gross": 43.2, "margin_net": 25.1 },
  "growth": { "revenue_yoy": 8.5, "earnings_yoy": 12.3, "dividend_growth": 5.2 },
  "health": { "current_ratio": 1.1, "debt_equity": 1.8, "interest_coverage": 42.5 },
  "overall_score": 78
}
```

**使用例**:
```
「AAPLの財務状況を分析して」
「PERとROEを確認して」
```

---

### 5. invest_risk_metrics
**エージェント**: りすくみるん

リスク指標を算出します。

```typescript
// パラメータ
{
  symbol: string  // 必須: 銘柄シンボル
}

// レスポンス例
{
  "agent": { "name": "りすくみるん" },
  "symbol": "AAPL",
  "metrics": {
    "beta": 1.25,
    "volatility": { "daily": 1.8, "annual": 28.5 },
    "var_95": -3.2,
    "sharpe_ratio": 1.45,
    "sortino_ratio": 1.82,
    "max_drawdown": -15.2
  },
  "risk_level": "moderate",
  "recommendation": "Position size: 5-8% of portfolio"
}
```

**使用例**:
```
「AAPLのリスク指標を教えて」
「ベータとボラティリティを確認」
```

---

### 6. invest_portfolio_analysis
**エージェント**: さいてきかくん

ポートフォリオ全体を分析します。

```typescript
// パラメータ
{
  holdings: Array<{
    symbol: string
    shares: number
    avg_cost: number
  }>  // 必須: 保有銘柄リスト
}

// レスポンス例
{
  "agent": { "name": "さいてきかくん" },
  "portfolio": {
    "total_value": 110000,
    "total_cost": 100000,
    "holdings": 5
  },
  "diversification": { "score": 72, "sectors": 5, "correlation_avg": 0.45 },
  "risk": { "portfolio_beta": 1.12, "portfolio_volatility": 18.5 },
  "performance": { "return_pct": 10, "sharpe": 1.2 }
}
```

**使用例**:
```
「私のポートフォリオを分析して」
「分散度とリスクを確認」
```

---

### 7. invest_analyze
**エージェント**: とうしきるん

銘柄の総合分析を行います（テクニカル + ファンダメンタル + リスク）。

```typescript
// パラメータ
{
  symbol: string                          // 必須: 銘柄シンボル
  depth?: 'quick' | 'standard' | 'deep'   // 分析の深さ (デフォルト: 'standard')
}

// レスポンス例
{
  "agent": { "name": "とうしきるん" },
  "symbol": "AAPL",
  "depth": "deep",
  "summary": {
    "technical": { "signal": "buy", "score": 72 },
    "fundamental": { "rating": "strong", "score": 78 },
    "risk": { "level": "moderate", "score": 65 },
    "overall": { "recommendation": "BUY", "confidence": 0.75, "target_price": 210 }
  },
  "key_factors": [
    "Strong earnings growth momentum",
    "Technical breakout above resistance",
    "Reasonable valuation vs peers"
  ]
}
```

**使用例**:
```
「AAPLの総合分析をして」
「MSFTを詳細に分析して」
```

---

### 8. invest_quote
現在の株価を取得します。

```typescript
// パラメータ
{
  symbol: string  // 必須: 銘柄シンボル
}

// レスポンス例
{
  "symbol": "AAPL",
  "price": 182.45,
  "change": 2.35,
  "change_pct": 1.31,
  "volume": 52000000,
  "timestamp": "2024-12-06T10:30:00Z"
}
```

**使用例**:
```
「AAPLの株価は？」
「現在値を教えて」
```

---

### 9. invest_news_stock
**エージェント**: にゅーすあつめるん

特定銘柄のニュースを取得し、センチメント分析を行います。

```typescript
// パラメータ
{
  symbol: string    // 必須: 銘柄シンボル
  limit?: number    // 取得件数 (デフォルト: 10)
}

// レスポンス例
{
  "agent": { "name": "にゅーすあつめるん" },
  "symbol": "AAPL",
  "news": [
    { "title": "AAPL Reports Strong Quarterly Results", "sentiment": "positive" }
  ],
  "overall_sentiment": "positive",
  "sentiment_score": 0.72
}
```

---

### 10. invest_news_market
**エージェント**: にゅーすあつめるん

市場全体のニュースを取得します。

```typescript
// パラメータ
{
  region?: 'japan' | 'us'  // 対象地域 (デフォルト: 'us')
  limit?: number           // 取得件数 (デフォルト: 15)
}

// レスポンス例
{
  "agent": { "name": "にゅーすあつめるん" },
  "region": "us",
  "headlines": [
    { "title": "Fed Signals Potential Rate Cuts", "sentiment": "positive" }
  ],
  "market_mood": "optimistic",
  "trending_topics": ["AI", "interest rates", "earnings"]
}
```

---

### 11. invest_news_search
**エージェント**: にゅーすあつめるん

キーワードでニュースを検索します。

```typescript
// パラメータ
{
  query: string     // 必須: 検索キーワード
  limit?: number    // 取得件数 (デフォルト: 10)
}
```

**使用例**:
```
「AI関連のニュースを検索」
「半導体ニュースを探して」
```

---

### 12. invest_portfolio_recommend
**エージェント**: さいてきかくん

リスク許容度に基づいて最適なポートフォリオを推奨します。

```typescript
// パラメータ
{
  investment_amount: number                              // 必須: 投資金額
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive'  // 必須: リスク許容度
  investment_horizon?: 'short' | 'medium' | 'long'       // 投資期間
  preferences?: {
    sectors?: string[]           // 優先セクター
    exclude_sectors?: string[]   // 除外セクター
    dividend_focus?: boolean     // 配当重視
  }
}

// レスポンス例
{
  "agent": { "name": "さいてきかくん" },
  "recommendation": {
    "investment_amount": 1000000,
    "risk_tolerance": "moderate",
    "asset_allocation": { "stocks": 50, "bonds": 35, "cash": 10, "alternatives": 5 },
    "recommended_holdings": [
      { "symbol": "VTI", "allocation_pct": 12, "amount": 120000 }
    ],
    "expected_return": 8,
    "expected_volatility": 12
  }
}
```

**使用例**:
```
「100万円で中程度のリスクでポートフォリオを組んで」
「配当重視で保守的な運用を提案して」
```

---

### 13. invest_backtest
**エージェント**: バックテストくん

投資戦略のバックテストを実行します。

```typescript
// パラメータ
{
  strategy: {
    name: string
    type: 'momentum' | 'value' | 'dividend' | 'growth' | 'custom'
    rules?: {
      entry_conditions?: string[]
      exit_conditions?: string[]
      position_size?: number
      stop_loss?: number
      take_profit?: number
    }
  }
  symbols: string[]       // 必須: 対象銘柄
  start_date: string      // 必須: 開始日 (YYYY-MM-DD)
  end_date: string        // 必須: 終了日 (YYYY-MM-DD)
  initial_capital: number // 必須: 初期資金
}

// レスポンス例
{
  "agent": { "name": "バックテストくん" },
  "backtest_results": {
    "strategy": "Momentum Strategy",
    "total_return_pct": 35,
    "annualized_return": 12.5,
    "max_drawdown": -18.5,
    "sharpe_ratio": 1.25,
    "win_rate": 58,
    "total_trades": 42
  }
}
```

**使用例**:
```
「モメンタム戦略を過去1年でバックテスト」
「バリュー投資戦略の成績を検証」
```

---

### 14. invest_multi_agent_analyze
複数エージェントによる協調分析を実行します。

```typescript
// パラメータ
{
  symbol: string                                    // 必須: 銘柄シンボル
  agents?: string[]                                 // 使用するエージェント
  mode?: 'parallel' | 'sequential' | 'consensus'   // 実行モード
}

// レスポンス例
{
  "mode": "parallel",
  "symbol": "AAPL",
  "agents_used": 5,
  "results": {
    "chartomirun": { "score": 75, "signal": "bullish" },
    "zaimumirurn": { "score": 78, "signal": "bullish" }
  },
  "consensus": {
    "average_score": 76,
    "bullish_votes": 4,
    "bearish_votes": 1,
    "final_signal": "BUY",
    "confidence": "80.0%"
  }
}
```

**使用例**:
```
「全エージェントでAAPLを分析」
「複数視点でMSFTを評価」
```

---

## 設定

### mcp.json への追加

```json
{
  "mcpServers": {
    "miyabi-investment-society": {
      "command": "node",
      "args": [".claude/mcp-servers/miyabi-investment-society/index.js"],
      "disabled": false,
      "description": "マルチエージェント投資分析"
    }
  }
}
```

### 環境変数

**不要** - 無料APIを使用するため追加の設定は不要です。

---

## 使用例

### 1. 銘柄の包括的分析

```
ユーザー: 「AAPLを詳しく分析して」

Claude: [invest_analyze を実行]
→ テクニカル、ファンダメンタル、リスクを統合分析
→ 総合的な投資判断を提示
```

### 2. ポートフォリオ診断

```
ユーザー: 「私のポートフォリオ（AAPL 100株@150, MSFT 50株@300）を分析して」

Claude: [invest_portfolio_analysis を実行]
→ 分散度、リスク、パフォーマンスを評価
→ 改善提案を提示
```

### 3. 市場概況確認

```
ユーザー: 「今日の米国市場はどう？」

Claude: [invest_market_overview を実行]
→ 主要指数、VIX、センチメントを取得
→ 市場トレンドを解説
```

---

## エージェント協調フロー

```
                    ┌────────────────┐
                    │ とうしきるん   │
                    │ (統括・総合判定)│
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌───────▼───────┐
│ ちゃーとみるん │  │ ざいむみるん   │  │ りすくみるん │
│ (テクニカル)   │  │ (ファンダメンタル)│  │ (リスク)     │
└───────────────┘  └─────────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌────────────────┐
                    │ さいてきかくん │
                    │ (ポートフォリオ) │
                    └────────────────┘
```

---

## 制限事項

- リアルタイムデータは模擬データを使用
- 実際の取引執行機能は含まれない
- 投資助言ではなく情報提供のみ

---

**作成日**: 2024-12-06
**バージョン**: 2.0.0
**管理**: Miyabi Autonomous System
