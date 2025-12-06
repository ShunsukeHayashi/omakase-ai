/**
 * Miyabi ChatGPT App - Main Entry Point
 * Task Execution API for ChatGPT UI integration
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Miyabi ChatGPT App',
    version: '1.0.0',
    description: 'Task Execution API for ChatGPT UI integration',
    endpoints: {
      execute: 'POST /api/execute - Execute a task from natural language',
      parse: 'POST /api/parse - Parse prompt without executing',
      task: 'GET /api/task/:taskId - Get task status',
      progress: 'GET /api/task/:taskId/progress - Get task progress',
      tasks: 'GET /api/tasks - List all tasks',
      agents: 'GET /api/agents - List available agents',
      openaiActions: 'GET /api/openai-actions - OpenAI Actions schema',
      health: 'GET /api/health - Health check',
    },
    docs: 'https://github.com/ShunsukeHayashi/omakase-ai/tree/main/openai-apps/miyabi-app',
  });
});

// OpenAI plugin manifest
app.get('/.well-known/ai-plugin.json', (_req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'Miyabi Task Executor',
    name_for_model: 'miyabi',
    description_for_human: 'Execute development tasks using Miyabi AI agents',
    description_for_model: 'Execute software development tasks including code generation, reviews, PRs, deployments, and tests using Miyabi autonomous agents. Use natural language to describe the task.',
    auth: {
      type: 'none',
    },
    api: {
      type: 'openapi',
      url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/openai-actions`,
    },
    logo_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/logo.png`,
    contact_email: 'support@miyabi.dev',
    legal_info_url: 'https://miyabi.dev/legal',
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Miyabi ChatGPT App                        ║
║  Task Execution API v1.0.0                 ║
╠════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}             ║
║  Health: http://localhost:${PORT}/api/health  ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
