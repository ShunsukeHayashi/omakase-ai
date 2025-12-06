/**
 * API Routes for Miyabi ChatGPT App
 */

import { Router, Request, Response } from 'express';
import { parseTask, getActionDescription } from '../services/task-parser.js';
import { selectAgent, getAgentName, getAgentDescription, getAllAgents } from '../services/agent-selector.js';
import { executeTask, getTask, getProgress, listTasks } from '../services/task-executor.js';
import type { TaskExecutionRequest, OpenAIAction } from '../types/index.js';

const router = Router();

/**
 * POST /api/execute
 * Execute a task from natural language prompt
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { prompt, context, options } = req.body as TaskExecutionRequest;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'prompt is required and must be a string',
      });
    }

    // Parse natural language to task
    const parsedTask = parseTask(prompt);

    // Select agent
    const agentSelection = selectAgent(parsedTask);

    // Execute task
    const result = await executeTask(parsedTask, context, options);

    res.json({
      success: true,
      task: result,
      agent: {
        selected: agentSelection.selectedAgent,
        name: getAgentName(agentSelection.selectedAgent),
        confidence: agentSelection.confidence,
        reasoning: agentSelection.reasoning,
      },
    });
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({
      error: 'EXECUTION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/parse
 * Parse a prompt without executing
 */
router.post('/parse', (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'prompt is required',
      });
    }

    const parsedTask = parseTask(prompt);
    const agentSelection = selectAgent(parsedTask);

    res.json({
      success: true,
      parsed: {
        action: parsedTask.action,
        actionDescription: getActionDescription(parsedTask.action),
        priority: parsedTask.priority,
        confidence: parsedTask.confidence,
        parameters: parsedTask.parameters,
      },
      agent: {
        selected: agentSelection.selectedAgent,
        name: getAgentName(agentSelection.selectedAgent),
        description: getAgentDescription(agentSelection.selectedAgent),
        confidence: agentSelection.confidence,
        reasoning: agentSelection.reasoning,
        fallbacks: agentSelection.fallbackAgents,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'PARSE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/task/:taskId
 * Get task status by ID
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = getTask(taskId);

  if (!task) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Task ${taskId} not found`,
    });
  }

  res.json({ success: true, task });
});

/**
 * GET /api/task/:taskId/progress
 * Get task progress
 */
router.get('/task/:taskId/progress', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const progress = getProgress(taskId);

  if (!progress) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Progress for task ${taskId} not found`,
    });
  }

  res.json({ success: true, progress });
});

/**
 * GET /api/tasks
 * List all tasks
 */
router.get('/tasks', (_req: Request, res: Response) => {
  const tasks = listTasks();
  res.json({
    success: true,
    tasks,
    count: tasks.length,
  });
});

/**
 * GET /api/agents
 * List all available agents
 */
router.get('/agents', (_req: Request, res: Response) => {
  const agents = getAllAgents().map(agent => ({
    id: agent,
    name: getAgentName(agent),
    description: getAgentDescription(agent),
  }));

  res.json({ success: true, agents });
});

/**
 * GET /api/openai-actions
 * Get OpenAI Actions schema for ChatGPT integration
 */
router.get('/openai-actions', (_req: Request, res: Response) => {
  const actions: OpenAIAction[] = [
    {
      name: 'execute_miyabi_task',
      description: 'Execute a Miyabi task from natural language. Supports: code generation, reviews, PRs, deploys, tests, security scans.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Natural language task description (e.g., "Issue #123を処理して", "コードレビューを実行")',
          },
          priority: {
            type: 'string',
            description: 'Task priority',
            enum: ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'],
            default: 'P2-Medium',
          },
          dryRun: {
            type: 'boolean',
            description: 'Preview without executing',
            default: false,
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'get_task_status',
      description: 'Get the status and progress of a running Miyabi task',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'Task ID returned from execute_miyabi_task',
          },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'list_agents',
      description: 'List all available Miyabi agents and their capabilities',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ];

  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Miyabi Task Execution API',
      version: '1.0.0',
      description: 'Execute Miyabi tasks from ChatGPT UI',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
      },
    ],
    actions,
  });
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
