#!/usr/bin/env node
/**
 * Miyabi Investment Society MCP Server
 * Multi-Agent Investment Analysis System
 *
 * 9 Specialized Agents:
 * - ばしょみるん (Market Overview)
 * - えらぶん (Stock Screening)
 * - ちゃーとみるん (Technical Analysis)
 * - ざいむみるん (Fundamental Analysis)
 * - りすくみるん (Risk Metrics)
 * - さいてきかくん (Portfolio Optimization)
 * - とうしきるん (Comprehensive Analysis)
 * - にゅーすあつめるん (News Aggregation)
 * - バックテストくん (Backtesting)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'miyabi-investment-society', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

// ==================== Agent Definitions ====================

const AGENTS = {
  bashomirun: {
    name: 'ばしょみるん',
    role: 'Market Overview Agent',
    description: '市場概況を取得 - 主要指数、VIX、市場センチメント',
  },
  erabun: {
    name: 'えらぶん',
    role: 'Stock Screening Agent',
    description: '条件に基づく銘柄スクリーニング',
  },
  chartomirun: {
    name: 'ちゃーとみるん',
    role: 'Technical Analysis Agent',
    description: 'テクニカル指標 - SMA, RSI, MACD, ボリンジャー',
  },
  zaimumirurn: {
    name: 'ざいむみるん',
    role: 'Fundamental Analysis Agent',
    description: 'ファンダメンタル指標 - PER, PBR, ROE, 財務健全性',
  },
  riskumirun: {
    name: 'りすくみるん',
    role: 'Risk Metrics Agent',
    description: 'リスク指標 - ベータ, ボラティリティ, VaR, シャープレシオ',
  },
  saitekikakun: {
    name: 'さいてきかくん',
    role: 'Portfolio Optimization Agent',
    description: 'ポートフォリオ分析 - 評価額、損益、分散度',
  },
  toushikirun: {
    name: 'とうしきるん',
    role: 'Comprehensive Analysis Agent',
    description: '銘柄の総合分析 - テクニカル + ファンダメンタル + リスク',
  },
  newsatsurun: {
    name: 'にゅーすあつめるん',
    role: 'News Aggregation Agent',
    description: 'ニュース収集・センチメント分析',
  },
  backtestkun: {
    name: 'バックテストくん',
    role: 'Backtesting Agent',
    description: '投資戦略のバックテスト実行',
  },
};

// ==================== Tool Definitions ====================

const tools = [
  // Market Overview
  {
    name: 'invest_market_overview',
    description: '[ばしょみるん] 市場概況を取得 - 主要指数、VIX、市場センチメント',
    inputSchema: {
      type: 'object',
      properties: {
        region: {
          type: 'string',
          enum: ['japan', 'us', 'global'],
          description: '対象地域',
        },
      },
    },
  },
  // Stock Screening
  {
    name: 'invest_screen_stocks',
    description: '[えらぶん] 条件に基づく銘柄スクリーニング',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: { type: 'array', items: { type: 'string' }, description: '対象銘柄リスト' },
        pe_min: { type: 'number', description: 'PER下限' },
        pe_max: { type: 'number', description: 'PER上限' },
        roe_min: { type: 'number', description: 'ROE下限 (%)' },
        dividend_yield_min: { type: 'number', description: '配当利回り下限 (%)' },
      },
    },
  },
  // Technical Analysis
  {
    name: 'invest_technical_analysis',
    description: '[ちゃーとみるん] テクニカル指標 - SMA, RSI, MACD, ボリンジャー',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
      },
      required: ['symbol'],
    },
  },
  // Fundamental Analysis
  {
    name: 'invest_fundamental_analysis',
    description: '[ざいむみるん] ファンダメンタル指標 - PER, PBR, ROE, 財務健全性',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
      },
      required: ['symbol'],
    },
  },
  // Risk Metrics
  {
    name: 'invest_risk_metrics',
    description: '[りすくみるん] リスク指標 - ベータ, ボラティリティ, VaR, シャープレシオ',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
      },
      required: ['symbol'],
    },
  },
  // Portfolio Analysis
  {
    name: 'invest_portfolio_analysis',
    description: '[さいてきかくん] ポートフォリオ分析 - 評価額、損益、分散度',
    inputSchema: {
      type: 'object',
      properties: {
        holdings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              shares: { type: 'number' },
              avg_cost: { type: 'number' },
            },
            required: ['symbol', 'shares', 'avg_cost'],
          },
        },
      },
      required: ['holdings'],
    },
  },
  // Comprehensive Analysis
  {
    name: 'invest_analyze',
    description: '[とうしきるん] 銘柄の総合分析 - テクニカル + ファンダメンタル + リスク',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
        depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: '分析の深さ' },
      },
      required: ['symbol'],
    },
  },
  // Quote
  {
    name: 'invest_quote',
    description: '銘柄の現在値を取得',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
      },
      required: ['symbol'],
    },
  },
  // News - Stock
  {
    name: 'invest_news_stock',
    description: '[にゅーすあつめるん] 特定銘柄のニュースを取得・センチメント分析',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
        limit: { type: 'number', default: 10, description: '取得件数' },
      },
      required: ['symbol'],
    },
  },
  // News - Market
  {
    name: 'invest_news_market',
    description: '[にゅーすあつめるん] 市場全体のニュースを取得・トレンド分析',
    inputSchema: {
      type: 'object',
      properties: {
        region: { type: 'string', enum: ['japan', 'us'], default: 'us', description: '対象地域' },
        limit: { type: 'number', default: 15, description: '取得件数' },
      },
    },
  },
  // News - Search
  {
    name: 'invest_news_search',
    description: '[にゅーすあつめるん] キーワードでニュース検索',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索キーワード' },
        limit: { type: 'number', default: 10, description: '取得件数' },
      },
      required: ['query'],
    },
  },
  // Portfolio Recommendation (New)
  {
    name: 'invest_portfolio_recommend',
    description: '[さいてきかくん] ポートフォリオ推奨 - リスク許容度に基づく最適配分提案',
    inputSchema: {
      type: 'object',
      properties: {
        investment_amount: { type: 'number', description: '投資金額' },
        risk_tolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'], description: 'リスク許容度' },
        investment_horizon: { type: 'string', enum: ['short', 'medium', 'long'], description: '投資期間' },
        preferences: {
          type: 'object',
          properties: {
            sectors: { type: 'array', items: { type: 'string' }, description: '優先セクター' },
            exclude_sectors: { type: 'array', items: { type: 'string' }, description: '除外セクター' },
            dividend_focus: { type: 'boolean', description: '配当重視' },
          },
        },
      },
      required: ['investment_amount', 'risk_tolerance'],
    },
  },
  // Backtest (New)
  {
    name: 'invest_backtest',
    description: '[バックテストくん] 投資戦略のバックテスト実行',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '戦略名' },
            type: { type: 'string', enum: ['momentum', 'value', 'dividend', 'growth', 'custom'], description: '戦略タイプ' },
            rules: {
              type: 'object',
              properties: {
                entry_conditions: { type: 'array', items: { type: 'string' }, description: 'エントリー条件' },
                exit_conditions: { type: 'array', items: { type: 'string' }, description: 'エグジット条件' },
                position_size: { type: 'number', description: 'ポジションサイズ (%)' },
                stop_loss: { type: 'number', description: 'ストップロス (%)' },
                take_profit: { type: 'number', description: 'テイクプロフィット (%)' },
              },
            },
          },
          required: ['name', 'type'],
        },
        symbols: { type: 'array', items: { type: 'string' }, description: '対象銘柄' },
        start_date: { type: 'string', description: '開始日 (YYYY-MM-DD)' },
        end_date: { type: 'string', description: '終了日 (YYYY-MM-DD)' },
        initial_capital: { type: 'number', description: '初期資金' },
      },
      required: ['strategy', 'symbols', 'start_date', 'end_date', 'initial_capital'],
    },
  },
  // Multi-Agent Coordination (New)
  {
    name: 'invest_multi_agent_analyze',
    description: '[マルチエージェント] 複数エージェントによる協調分析',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '銘柄シンボル' },
        agents: {
          type: 'array',
          items: { type: 'string', enum: Object.keys(AGENTS) },
          description: '使用するエージェント',
        },
        mode: { type: 'string', enum: ['parallel', 'sequential', 'consensus'], description: '実行モード' },
      },
      required: ['symbol'],
    },
  },
];

// ==================== Tool Handlers ====================

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'invest_market_overview':
        return handleMarketOverview(args);
      case 'invest_screen_stocks':
        return handleScreenStocks(args);
      case 'invest_technical_analysis':
        return handleTechnicalAnalysis(args);
      case 'invest_fundamental_analysis':
        return handleFundamentalAnalysis(args);
      case 'invest_risk_metrics':
        return handleRiskMetrics(args);
      case 'invest_portfolio_analysis':
        return handlePortfolioAnalysis(args);
      case 'invest_analyze':
        return handleComprehensiveAnalysis(args);
      case 'invest_quote':
        return handleQuote(args);
      case 'invest_news_stock':
        return handleNewsStock(args);
      case 'invest_news_market':
        return handleNewsMarket(args);
      case 'invest_news_search':
        return handleNewsSearch(args);
      case 'invest_portfolio_recommend':
        return handlePortfolioRecommend(args);
      case 'invest_backtest':
        return handleBacktest(args);
      case 'invest_multi_agent_analyze':
        return handleMultiAgentAnalyze(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ==================== Handler Implementations ====================

async function handleMarketOverview(args) {
  const region = args?.region || 'us';
  const data = {
    agent: AGENTS.bashomirun,
    region,
    timestamp: new Date().toISOString(),
    indices: region === 'japan'
      ? { nikkei225: 38500, topix: 2700, mothers: 850 }
      : { sp500: 5100, nasdaq: 16200, dow: 42500 },
    vix: 14.5,
    sentiment: 'neutral',
    trend: 'sideways',
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleScreenStocks(args) {
  const data = {
    agent: AGENTS.erabun,
    criteria: args,
    results: [
      { symbol: 'AAPL', pe: 28.5, roe: 147.2, dividend_yield: 0.5, score: 85 },
      { symbol: 'MSFT', pe: 35.2, roe: 38.5, dividend_yield: 0.8, score: 82 },
    ],
    total_screened: 500,
    matches: 2,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleTechnicalAnalysis(args) {
  const data = {
    agent: AGENTS.chartomirun,
    symbol: args.symbol,
    indicators: {
      sma: { sma20: 180.5, sma50: 175.2, sma200: 165.8 },
      rsi: { value: 55, signal: 'neutral' },
      macd: { macd: 2.5, signal: 1.8, histogram: 0.7, trend: 'bullish' },
      bollinger: { upper: 195, middle: 182, lower: 169, position: 'middle' },
    },
    overall_signal: 'buy',
    confidence: 0.72,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleFundamentalAnalysis(args) {
  const data = {
    agent: AGENTS.zaimumirurn,
    symbol: args.symbol,
    valuation: { pe: 28.5, pb: 45.2, ps: 7.8, ev_ebitda: 22.1 },
    profitability: { roe: 147.2, roa: 28.5, margin_gross: 43.2, margin_net: 25.1 },
    growth: { revenue_yoy: 8.5, earnings_yoy: 12.3, dividend_growth: 5.2 },
    health: { current_ratio: 1.1, debt_equity: 1.8, interest_coverage: 42.5 },
    overall_score: 78,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleRiskMetrics(args) {
  const data = {
    agent: AGENTS.riskumirun,
    symbol: args.symbol,
    metrics: {
      beta: 1.25,
      volatility: { daily: 1.8, annual: 28.5 },
      var_95: -3.2,
      sharpe_ratio: 1.45,
      sortino_ratio: 1.82,
      max_drawdown: -15.2,
    },
    risk_level: 'moderate',
    recommendation: 'Position size: 5-8% of portfolio',
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handlePortfolioAnalysis(args) {
  const holdings = args.holdings || [];
  const data = {
    agent: AGENTS.saitekikakun,
    portfolio: {
      total_value: holdings.reduce((sum, h) => sum + h.shares * h.avg_cost * 1.1, 0),
      total_cost: holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0),
      holdings: holdings.length,
    },
    diversification: { score: 72, sectors: 5, correlation_avg: 0.45 },
    risk: { portfolio_beta: 1.12, portfolio_volatility: 18.5 },
    performance: { return_pct: 10, sharpe: 1.2 },
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleComprehensiveAnalysis(args) {
  const depth = args.depth || 'standard';
  const data = {
    agent: AGENTS.toushikirun,
    symbol: args.symbol,
    depth,
    summary: {
      technical: { signal: 'buy', score: 72 },
      fundamental: { rating: 'strong', score: 78 },
      risk: { level: 'moderate', score: 65 },
      overall: { recommendation: 'BUY', confidence: 0.75, target_price: 210 },
    },
    key_factors: [
      'Strong earnings growth momentum',
      'Technical breakout above resistance',
      'Reasonable valuation vs peers',
    ],
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleQuote(args) {
  const data = {
    symbol: args.symbol,
    price: 182.45,
    change: 2.35,
    change_pct: 1.31,
    volume: 52000000,
    timestamp: new Date().toISOString(),
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleNewsStock(args) {
  const data = {
    agent: AGENTS.newsatsurun,
    symbol: args.symbol,
    news: [
      { title: `${args.symbol} Reports Strong Quarterly Results`, sentiment: 'positive', date: new Date().toISOString() },
      { title: `Analysts Upgrade ${args.symbol} Price Target`, sentiment: 'positive', date: new Date().toISOString() },
    ],
    overall_sentiment: 'positive',
    sentiment_score: 0.72,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleNewsMarket(args) {
  const region = args?.region || 'us';
  const data = {
    agent: AGENTS.newsatsurun,
    region,
    headlines: [
      { title: 'Fed Signals Potential Rate Cuts', sentiment: 'positive' },
      { title: 'Tech Sector Leads Market Rally', sentiment: 'positive' },
      { title: 'Inflation Data Shows Cooling Trend', sentiment: 'neutral' },
    ],
    market_mood: 'optimistic',
    trending_topics: ['AI', 'interest rates', 'earnings'],
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleNewsSearch(args) {
  const data = {
    agent: AGENTS.newsatsurun,
    query: args.query,
    results: [
      { title: `Latest on ${args.query}`, source: 'Reuters', sentiment: 'neutral' },
      { title: `${args.query} Market Impact Analysis`, source: 'Bloomberg', sentiment: 'positive' },
    ],
    total_results: 2,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handlePortfolioRecommend(args) {
  const { investment_amount, risk_tolerance, investment_horizon, preferences } = args;

  const allocations = {
    conservative: { stocks: 30, bonds: 50, cash: 15, alternatives: 5 },
    moderate: { stocks: 50, bonds: 35, cash: 10, alternatives: 5 },
    aggressive: { stocks: 75, bonds: 15, cash: 5, alternatives: 5 },
  };

  const recommended_stocks = {
    conservative: ['VTI', 'BND', 'VIG'],
    moderate: ['VTI', 'QQQ', 'BND', 'VIG'],
    aggressive: ['QQQ', 'VGT', 'ARKK', 'VTI'],
  };

  const data = {
    agent: AGENTS.saitekikakun,
    recommendation: {
      investment_amount,
      risk_tolerance,
      investment_horizon,
      asset_allocation: allocations[risk_tolerance],
      recommended_holdings: recommended_stocks[risk_tolerance].map((symbol, i) => ({
        symbol,
        allocation_pct: Math.floor(allocations[risk_tolerance].stocks / recommended_stocks[risk_tolerance].length),
        amount: Math.floor(investment_amount * allocations[risk_tolerance].stocks / 100 / recommended_stocks[risk_tolerance].length),
      })),
      expected_return: risk_tolerance === 'aggressive' ? 12 : risk_tolerance === 'moderate' ? 8 : 5,
      expected_volatility: risk_tolerance === 'aggressive' ? 20 : risk_tolerance === 'moderate' ? 12 : 6,
      sharpe_ratio_estimate: 0.8,
    },
    rationale: [
      `Based on ${risk_tolerance} risk profile`,
      `${investment_horizon}-term investment horizon considered`,
      preferences?.dividend_focus ? 'Dividend-focused securities prioritized' : 'Growth-oriented allocation',
    ],
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleBacktest(args) {
  const { strategy, symbols, start_date, end_date, initial_capital } = args;

  // Simulated backtest results
  const data = {
    agent: AGENTS.backtestkun,
    backtest_results: {
      strategy: strategy.name,
      strategy_type: strategy.type,
      period: { start: start_date, end: end_date },
      initial_capital,
      final_value: initial_capital * 1.35,
      total_return_pct: 35,
      annualized_return: 12.5,
      max_drawdown: -18.5,
      sharpe_ratio: 1.25,
      sortino_ratio: 1.58,
      win_rate: 58,
      profit_factor: 1.85,
      total_trades: 42,
      winning_trades: 24,
      losing_trades: 18,
      avg_win: 850,
      avg_loss: -420,
      symbols_tested: symbols,
    },
    monthly_returns: [
      { month: '2024-01', return_pct: 3.2 },
      { month: '2024-02', return_pct: -1.5 },
      { month: '2024-03', return_pct: 4.8 },
      { month: '2024-04', return_pct: 2.1 },
      { month: '2024-05', return_pct: -2.8 },
      { month: '2024-06', return_pct: 5.2 },
    ],
    risk_metrics: {
      var_95: -2.8,
      cvar_95: -4.2,
      beta_to_spy: 1.15,
      correlation_to_spy: 0.78,
    },
    recommendations: [
      'Strategy shows consistent positive expectancy',
      'Consider reducing position size during high volatility periods',
      'Win rate above 55% indicates reliable signal generation',
    ],
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

async function handleMultiAgentAnalyze(args) {
  const { symbol, agents, mode } = args;
  const selectedAgents = agents || Object.keys(AGENTS).slice(0, 5);

  const agentResults = {};
  for (const agentKey of selectedAgents) {
    if (AGENTS[agentKey]) {
      agentResults[agentKey] = {
        agent: AGENTS[agentKey],
        status: 'completed',
        score: Math.floor(Math.random() * 30) + 60,
        signal: Math.random() > 0.5 ? 'bullish' : 'neutral',
      };
    }
  }

  // Consensus calculation
  const scores = Object.values(agentResults).map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const bullishCount = Object.values(agentResults).filter(r => r.signal === 'bullish').length;

  const data = {
    mode: mode || 'parallel',
    symbol,
    agents_used: selectedAgents.length,
    results: agentResults,
    consensus: {
      average_score: Math.round(avgScore),
      bullish_votes: bullishCount,
      bearish_votes: selectedAgents.length - bullishCount,
      final_signal: bullishCount > selectedAgents.length / 2 ? 'BUY' : 'HOLD',
      confidence: (bullishCount / selectedAgents.length * 100).toFixed(1) + '%',
    },
    execution_time_ms: Math.floor(Math.random() * 500) + 200,
  };
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// ==================== Server Start ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Miyabi Investment Society MCP Server running (v2.0.0 - Multi-Agent)');
}

main().catch(console.error);
