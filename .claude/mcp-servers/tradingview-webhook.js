#!/usr/bin/env node

/**
 * TradingView Webhook MCP Server
 *
 * TradingViewからのWebhookアラートを受信・分析するMCPサーバー
 *
 * 提供ツール:
 * - tradingview__start_server - Webhookサーバー起動
 * - tradingview__stop_server - Webhookサーバー停止
 * - tradingview__get_alerts - 受信済みアラート一覧取得
 * - tradingview__get_alert - 特定アラート詳細取得
 * - tradingview__analyze_alert - アラート分析（miyabi-investment-society連携）
 * - tradingview__clear_alerts - アラート履歴クリア
 * - tradingview__get_status - サーバーステータス確認
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'http';

// ============================================================================
// Types & Constants
// ============================================================================

/**
 * TradingView Alert Payload Structure
 * TradingViewからのアラートは以下の形式で送信される:
 * {
 *   "symbol": "BTCUSDT",
 *   "exchange": "BINANCE",
 *   "action": "buy" | "sell" | "alert",
 *   "price": 42000.50,
 *   "time": "2024-01-15T10:30:00Z",
 *   "interval": "1H",
 *   "strategy": "MA Crossover",
 *   "message": "Golden Cross detected",
 *   "indicators": {
 *     "rsi": 65.5,
 *     "macd": 150.2,
 *     "ema20": 41500,
 *     "ema50": 41000
 *   }
 * }
 */
const ALERT_ACTIONS = ['buy', 'sell', 'alert', 'long', 'short', 'close'];

const DEFAULT_PORT = 3456;

// ============================================================================
// State Management
// ============================================================================

let httpServer = null;
let serverPort = DEFAULT_PORT;
let isServerRunning = false;

// Alert storage (in-memory)
const alerts = [];
const MAX_ALERTS = 1000;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate TradingView alert payload
 */
function validateAlertPayload(payload) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!payload.symbol) {
    errors.push('Missing required field: symbol');
  }

  // Optional but recommended fields
  if (!payload.action) {
    warnings.push('Missing field: action (defaulting to "alert")');
  } else if (!ALERT_ACTIONS.includes(payload.action.toLowerCase())) {
    warnings.push(`Unknown action: ${payload.action}. Expected one of: ${ALERT_ACTIONS.join(', ')}`);
  }

  if (!payload.price && payload.price !== 0) {
    warnings.push('Missing field: price');
  } else if (typeof payload.price === 'string') {
    const parsed = parseFloat(payload.price);
    if (isNaN(parsed)) {
      errors.push(`Invalid price format: ${payload.price}`);
    }
  }

  if (!payload.time) {
    warnings.push('Missing field: time (using server timestamp)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse and normalize alert payload
 */
function parseAlertPayload(rawPayload) {
  let payload;

  // Handle string payload (common from TradingView)
  if (typeof rawPayload === 'string') {
    try {
      payload = JSON.parse(rawPayload);
    } catch (e) {
      // Try to parse as key=value format
      payload = parseKeyValueFormat(rawPayload);
    }
  } else {
    payload = rawPayload;
  }

  // Normalize fields
  const normalized = {
    id: generateAlertId(),
    receivedAt: new Date().toISOString(),
    symbol: payload.symbol?.toUpperCase() || 'UNKNOWN',
    exchange: payload.exchange?.toUpperCase() || 'UNKNOWN',
    action: payload.action?.toLowerCase() || 'alert',
    price: parseFloat(payload.price) || 0,
    time: payload.time || new Date().toISOString(),
    interval: payload.interval || payload.timeframe || 'UNKNOWN',
    strategy: payload.strategy || payload.name || 'Manual Alert',
    message: payload.message || payload.comment || '',
    indicators: payload.indicators || {},
    raw: payload,
  };

  return normalized;
}

/**
 * Parse key=value format
 */
function parseKeyValueFormat(str) {
  const result = {};
  const pairs = str.split(',').map(s => s.trim());

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      result[key.trim()] = valueParts.join('=').trim();
    }
  }

  return result;
}

/**
 * Generate unique alert ID
 */
function generateAlertId() {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// HTTP Server Functions
// ============================================================================

/**
 * Create HTTP server for receiving webhooks
 */
function createWebhookServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check endpoint
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', alerts: alerts.length }));
        return;
      }

      // Webhook endpoint
      if (req.method === 'POST' && (req.url === '/webhook' || req.url === '/')) {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const alert = parseAlertPayload(body);
            const validation = validateAlertPayload(alert);

            // Store alert
            alerts.unshift({
              ...alert,
              validation,
            });

            // Trim old alerts
            if (alerts.length > MAX_ALERTS) {
              alerts.splice(MAX_ALERTS);
            }

            // Log to console
            console.error(`[TradingView] Alert received: ${alert.symbol} ${alert.action} @ ${alert.price}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              alertId: alert.id,
              validation,
            }));
          } catch (error) {
            console.error(`[TradingView] Error processing alert: ${error.message}`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message,
            }));
          }
        });

        return;
      }

      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.on('error', (error) => {
      reject(error);
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

// ============================================================================
// Analysis Functions (miyabi-investment-society連携)
// ============================================================================

/**
 * Analyze alert with investment context
 */
function analyzeAlert(alert) {
  const analysis = {
    alertId: alert.id,
    symbol: alert.symbol,
    action: alert.action,
    timestamp: alert.receivedAt,

    // Signal strength based on available data
    signalStrength: calculateSignalStrength(alert),

    // Risk assessment
    riskLevel: assessRiskLevel(alert),

    // Recommendations
    recommendations: generateRecommendations(alert),

    // Technical context
    technicalContext: extractTechnicalContext(alert),
  };

  return analysis;
}

function calculateSignalStrength(alert) {
  let score = 50; // Base score

  // Boost for having indicator data
  if (alert.indicators && Object.keys(alert.indicators).length > 0) {
    score += 10;

    // RSI analysis
    const rsi = alert.indicators.rsi;
    if (rsi !== undefined) {
      if (alert.action === 'buy' && rsi < 30) score += 15;
      if (alert.action === 'sell' && rsi > 70) score += 15;
    }

    // MACD analysis
    if (alert.indicators.macd !== undefined) {
      score += 5;
    }
  }

  // Boost for strategy name
  if (alert.strategy && alert.strategy !== 'Manual Alert') {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function assessRiskLevel(alert) {
  // Simple risk assessment based on action type
  if (['buy', 'long'].includes(alert.action)) {
    return 'MEDIUM';
  }
  if (['sell', 'short'].includes(alert.action)) {
    return 'MEDIUM';
  }
  if (alert.action === 'close') {
    return 'LOW';
  }
  return 'UNKNOWN';
}

function generateRecommendations(alert) {
  const recs = [];

  // Basic recommendations based on action
  if (['buy', 'long'].includes(alert.action)) {
    recs.push('Confirm trend direction with multiple timeframes');
    recs.push('Set stop-loss below recent support level');
    recs.push('Consider position sizing based on account risk tolerance');
  }

  if (['sell', 'short'].includes(alert.action)) {
    recs.push('Verify resistance levels for confirmation');
    recs.push('Set stop-loss above recent resistance');
    recs.push('Consider partial profit-taking strategy');
  }

  // RSI-based recommendations
  if (alert.indicators?.rsi !== undefined) {
    const rsi = alert.indicators.rsi;
    if (rsi < 30) {
      recs.push(`RSI ${rsi.toFixed(1)}: Potential oversold condition - watch for reversal signals`);
    } else if (rsi > 70) {
      recs.push(`RSI ${rsi.toFixed(1)}: Potential overbought condition - watch for reversal signals`);
    }
  }

  return recs;
}

function extractTechnicalContext(alert) {
  const context = {
    hasIndicators: Object.keys(alert.indicators || {}).length > 0,
    indicators: alert.indicators || {},
    timeframe: alert.interval,
    strategy: alert.strategy,
  };

  // Add indicator interpretations
  if (alert.indicators) {
    const interpretations = [];

    if (alert.indicators.rsi !== undefined) {
      const rsi = alert.indicators.rsi;
      if (rsi < 30) interpretations.push('RSI: Oversold');
      else if (rsi > 70) interpretations.push('RSI: Overbought');
      else interpretations.push('RSI: Neutral');
    }

    if (alert.indicators.macd !== undefined) {
      interpretations.push(`MACD: ${alert.indicators.macd > 0 ? 'Bullish' : 'Bearish'}`);
    }

    context.interpretations = interpretations;
  }

  return context;
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const mcpServer = new Server(
  {
    name: 'tradingview-webhook',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'tradingview__start_server',
        description: 'TradingView Webhookサーバーを起動します',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: `サーバーポート番号 (デフォルト: ${DEFAULT_PORT})`,
            },
          },
        },
      },
      {
        name: 'tradingview__stop_server',
        description: 'TradingView Webhookサーバーを停止します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'tradingview__get_status',
        description: 'Webhookサーバーのステータスを確認します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'tradingview__get_alerts',
        description: '受信済みアラート一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '取得件数 (デフォルト: 20)',
            },
            symbol: {
              type: 'string',
              description: 'シンボルでフィルタ (例: BTCUSDT)',
            },
            action: {
              type: 'string',
              description: 'アクションでフィルタ (buy/sell/alert)',
            },
          },
        },
      },
      {
        name: 'tradingview__get_alert',
        description: '特定のアラート詳細を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'アラートID',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'tradingview__analyze_alert',
        description: 'アラートを分析し、投資判断のヒントを提供します（miyabi-investment-society連携）',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'アラートID',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'tradingview__clear_alerts',
        description: 'アラート履歴をクリアします',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: '確認フラグ (trueを指定)',
            },
          },
          required: ['confirm'],
        },
      },
      {
        name: 'tradingview__test_webhook',
        description: 'テスト用のWebhookアラートを送信します（開発用）',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'シンボル (例: BTCUSDT)',
            },
            action: {
              type: 'string',
              description: 'アクション (buy/sell/alert)',
            },
            price: {
              type: 'number',
              description: '価格',
            },
          },
          required: ['symbol', 'action', 'price'],
        },
      },
    ],
  };
});

// Handle tool calls
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'tradingview__start_server': {
        if (isServerRunning) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Server is already running',
                port: serverPort,
              }, null, 2),
            }],
          };
        }

        const port = args?.port || DEFAULT_PORT;
        httpServer = await createWebhookServer(port);
        serverPort = port;
        isServerRunning = true;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Webhook server started',
              port: serverPort,
              webhookUrl: `http://localhost:${serverPort}/webhook`,
              healthUrl: `http://localhost:${serverPort}/health`,
            }, null, 2),
          }],
        };
      }

      case 'tradingview__stop_server': {
        if (!isServerRunning || !httpServer) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Server is not running',
              }, null, 2),
            }],
          };
        }

        await new Promise((resolve) => httpServer.close(resolve));
        httpServer = null;
        isServerRunning = false;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Webhook server stopped',
            }, null, 2),
          }],
        };
      }

      case 'tradingview__get_status': {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              isRunning: isServerRunning,
              port: isServerRunning ? serverPort : null,
              webhookUrl: isServerRunning ? `http://localhost:${serverPort}/webhook` : null,
              alertCount: alerts.length,
              lastAlertAt: alerts.length > 0 ? alerts[0].receivedAt : null,
            }, null, 2),
          }],
        };
      }

      case 'tradingview__get_alerts': {
        let filtered = [...alerts];

        // Apply filters
        if (args?.symbol) {
          filtered = filtered.filter(a =>
            a.symbol.toUpperCase().includes(args.symbol.toUpperCase())
          );
        }
        if (args?.action) {
          filtered = filtered.filter(a =>
            a.action.toLowerCase() === args.action.toLowerCase()
          );
        }

        // Apply limit
        const limit = args?.limit || 20;
        filtered = filtered.slice(0, limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: alerts.length,
              filtered: filtered.length,
              alerts: filtered.map(a => ({
                id: a.id,
                symbol: a.symbol,
                action: a.action,
                price: a.price,
                time: a.receivedAt,
                strategy: a.strategy,
                message: a.message,
              })),
            }, null, 2),
          }],
        };
      }

      case 'tradingview__get_alert': {
        const alert = alerts.find(a => a.id === args.alertId);

        if (!alert) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Alert not found',
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              alert,
            }, null, 2),
          }],
        };
      }

      case 'tradingview__analyze_alert': {
        const alert = alerts.find(a => a.id === args.alertId);

        if (!alert) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Alert not found',
              }, null, 2),
            }],
          };
        }

        const analysis = analyzeAlert(alert);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              analysis,
            }, null, 2),
          }],
        };
      }

      case 'tradingview__clear_alerts': {
        if (!args?.confirm) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Please set confirm: true to clear alerts',
              }, null, 2),
            }],
          };
        }

        const count = alerts.length;
        alerts.length = 0;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Cleared ${count} alerts`,
            }, null, 2),
          }],
        };
      }

      case 'tradingview__test_webhook': {
        const testAlert = parseAlertPayload({
          symbol: args.symbol,
          action: args.action,
          price: args.price,
          exchange: 'TEST',
          time: new Date().toISOString(),
          strategy: 'Test Alert',
          message: 'This is a test alert',
          indicators: {
            rsi: 50,
            macd: 0,
          },
        });

        const validation = validateAlertPayload(testAlert);
        alerts.unshift({
          ...testAlert,
          validation,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Test alert created',
              alert: testAlert,
            }, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: `Unknown tool: ${name}`,
            }, null, 2),
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          stack: error.stack,
        }, null, 2),
      }],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('[TradingView Webhook MCP] Server started');
}

main().catch((error) => {
  console.error('[TradingView Webhook MCP] Fatal error:', error);
  process.exit(1);
});
