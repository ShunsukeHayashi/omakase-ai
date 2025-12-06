/**
 * Task Executor Service
 * Executes Miyabi tasks with progress tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  ParsedTask,
  TaskExecutionResponse,
  TaskStatus,
  TaskResult,
  TaskError,
  ProgressUpdate,
  ProgressStep,
  TaskContext,
  TaskOptions,
} from '../types/index.js';
import { selectAgent, getAgentName } from './agent-selector.js';

const execAsync = promisify(exec);

// In-memory task store
const taskStore = new Map<string, TaskExecutionResponse>();
const progressStore = new Map<string, ProgressUpdate>();

/**
 * Execute a parsed task
 */
export async function executeTask(
  parsedTask: ParsedTask,
  context?: TaskContext,
  options?: TaskOptions
): Promise<TaskExecutionResponse> {
  const taskId = uuidv4();
  const startedAt = new Date().toISOString();

  // Initialize response
  const response: TaskExecutionResponse = {
    taskId,
    status: 'queued',
    parsedTask,
    startedAt,
  };

  taskStore.set(taskId, response);

  // Initialize progress
  const progress: ProgressUpdate = {
    taskId,
    status: 'queued',
    progress: 0,
    currentStep: 'タスクをキューに追加',
    steps: [
      { name: 'タスク解析', status: 'completed' },
      { name: 'Agent選択', status: 'pending' },
      { name: 'タスク実行', status: 'pending' },
      { name: '結果検証', status: 'pending' },
    ],
    timestamp: startedAt,
  };
  progressStore.set(taskId, progress);

  // Execute asynchronously
  executeTaskAsync(taskId, parsedTask, context, options).catch((error) => {
    const stored = taskStore.get(taskId);
    if (stored) {
      stored.status = 'failed';
      stored.error = {
        code: 'EXECUTION_ERROR',
        message: error.message,
        recoverable: true,
      };
      stored.completedAt = new Date().toISOString();
    }
  });

  return response;
}

/**
 * Execute task asynchronously
 */
async function executeTaskAsync(
  taskId: string,
  parsedTask: ParsedTask,
  context?: TaskContext,
  options?: TaskOptions
): Promise<void> {
  const stored = taskStore.get(taskId);
  const progress = progressStore.get(taskId);
  if (!stored || !progress) return;

  try {
    // Step 1: Agent selection
    updateProgress(taskId, 'in_progress', 25, 'Agent選択中', 1);
    const agentSelection = selectAgent(parsedTask);
    stored.status = 'in_progress';

    // Step 2: Execute task
    updateProgress(taskId, 'in_progress', 50, 'タスク実行中', 2);

    let result: TaskResult;

    if (options?.dryRun) {
      result = {
        success: true,
        output: `[Dry Run] ${getAgentName(agentSelection.selectedAgent)} would execute: ${parsedTask.action}`,
        metrics: { durationMs: 0 },
      };
    } else {
      result = await runMiyabiCommand(parsedTask, agentSelection.selectedAgent, context);
    }

    // Step 3: Verify results
    updateProgress(taskId, 'in_progress', 75, '結果検証中', 3);

    // Complete
    stored.status = result.success ? 'completed' : 'failed';
    stored.result = result;
    stored.completedAt = new Date().toISOString();

    updateProgress(taskId, stored.status, 100, '完了', 3);

    // Webhook callback if configured
    if (options?.webhookUrl) {
      await sendWebhook(options.webhookUrl, stored);
    }

  } catch (error) {
    stored.status = 'failed';
    stored.error = {
      code: 'EXECUTION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: true,
    };
    stored.completedAt = new Date().toISOString();
    updateProgress(taskId, 'failed', progress.progress, 'エラー発生', -1);
  }
}

/**
 * Run Miyabi CLI command
 */
async function runMiyabiCommand(
  parsedTask: ParsedTask,
  agent: string,
  context?: TaskContext
): Promise<TaskResult> {
  const startTime = Date.now();
  let command = '';

  switch (parsedTask.action) {
    case 'run_agent':
    case 'create_issue':
      const issueNum = parsedTask.parameters.issueNumber;
      command = issueNum
        ? `npx miyabi agent --issue ${issueNum}`
        : `npx miyabi agent`;
      break;

    case 'check_status':
      command = 'npx miyabi status';
      break;

    case 'run_tests':
      command = 'npm test';
      break;

    case 'deploy':
      const env = parsedTask.originalPrompt.includes('production')
        ? 'production'
        : 'staging';
      command = `npx miyabi deploy --env ${env}`;
      break;

    case 'review_code':
      command = 'npm run review';
      break;

    case 'generate_code':
      command = `npx miyabi codegen --prompt "${parsedTask.originalPrompt.replace(/"/g, '\\"')}"`;
      break;

    case 'create_pr':
      command = 'npx miyabi pr';
      break;

    case 'security_scan':
      command = 'npm run security:scan';
      break;

    case 'generate_docs':
      command = 'npm run docs:generate';
      break;

    default:
      command = `npx miyabi auto`;
  }

  try {
    const cwd = context?.projectPath || process.cwd();
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 300000, // 5 minutes
    });

    return {
      success: true,
      output: stdout || 'Command executed successfully',
      metrics: {
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: execError.stderr || execError.stdout || execError.message || 'Command failed',
      metrics: {
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Update progress
 */
function updateProgress(
  taskId: string,
  status: TaskStatus,
  progressPercent: number,
  currentStep: string,
  stepIndex: number
): void {
  const progress = progressStore.get(taskId);
  if (!progress) return;

  progress.status = status;
  progress.progress = progressPercent;
  progress.currentStep = currentStep;
  progress.timestamp = new Date().toISOString();

  if (stepIndex >= 0 && stepIndex < progress.steps.length) {
    // Mark previous steps as completed
    for (let i = 0; i < stepIndex; i++) {
      progress.steps[i].status = 'completed';
    }
    // Mark current step
    progress.steps[stepIndex].status = status === 'failed' ? 'failed' : 'in_progress';
    if (status === 'completed' || status === 'failed') {
      progress.steps[stepIndex].status = status;
      progress.steps[stepIndex].completedAt = progress.timestamp;
    }
  }
}

/**
 * Send webhook callback
 */
async function sendWebhook(url: string, data: TaskExecutionResponse): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Webhook failed:', error);
  }
}

/**
 * Get task by ID
 */
export function getTask(taskId: string): TaskExecutionResponse | undefined {
  return taskStore.get(taskId);
}

/**
 * Get task progress
 */
export function getProgress(taskId: string): ProgressUpdate | undefined {
  return progressStore.get(taskId);
}

/**
 * List all tasks
 */
export function listTasks(): TaskExecutionResponse[] {
  return Array.from(taskStore.values());
}
