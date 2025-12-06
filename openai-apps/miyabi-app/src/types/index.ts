/**
 * Miyabi ChatGPT App Types
 */

// Agent types available in Miyabi
export type AgentType =
  | 'coordinator'
  | 'codegen'
  | 'review'
  | 'issue'
  | 'pr'
  | 'deployment';

// Task priority levels
export type TaskPriority = 'P0-Critical' | 'P1-High' | 'P2-Medium' | 'P3-Low';

// Task status
export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked';

// Parsed task from natural language
export interface ParsedTask {
  action: TaskAction;
  target?: string;
  parameters: Record<string, unknown>;
  priority: TaskPriority;
  suggestedAgent: AgentType;
  confidence: number;
  originalPrompt: string;
}

// Task actions
export type TaskAction =
  | 'create_issue'
  | 'run_agent'
  | 'deploy'
  | 'review_code'
  | 'generate_code'
  | 'create_pr'
  | 'check_status'
  | 'run_tests'
  | 'security_scan'
  | 'generate_docs'
  | 'unknown';

// Task execution request
export interface TaskExecutionRequest {
  prompt: string;
  context?: TaskContext;
  options?: TaskOptions;
}

// Task context
export interface TaskContext {
  projectPath?: string;
  issueNumber?: number;
  branchName?: string;
  files?: string[];
  previousTaskId?: string;
}

// Task options
export interface TaskOptions {
  dryRun?: boolean;
  autoApprove?: boolean;
  priority?: TaskPriority;
  timeout?: number;
  webhookUrl?: string;
}

// Task execution response
export interface TaskExecutionResponse {
  taskId: string;
  status: TaskStatus;
  parsedTask: ParsedTask;
  result?: TaskResult;
  error?: TaskError;
  startedAt: string;
  completedAt?: string;
}

// Task result
export interface TaskResult {
  success: boolean;
  output: string;
  artifacts?: TaskArtifact[];
  metrics?: TaskMetrics;
}

// Task artifact
export interface TaskArtifact {
  type: 'file' | 'pr' | 'issue' | 'url' | 'log';
  name: string;
  value: string;
  metadata?: Record<string, unknown>;
}

// Task metrics
export interface TaskMetrics {
  durationMs: number;
  tokensUsed?: number;
  filesModified?: number;
  testsRun?: number;
  testsPassed?: number;
}

// Task error
export interface TaskError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

// Progress update
export interface ProgressUpdate {
  taskId: string;
  status: TaskStatus;
  progress: number; // 0-100
  currentStep: string;
  steps: ProgressStep[];
  timestamp: string;
}

// Progress step
export interface ProgressStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  output?: string;
}

// Agent selection result
export interface AgentSelectionResult {
  selectedAgent: AgentType;
  confidence: number;
  reasoning: string;
  fallbackAgents: AgentType[];
}

// OpenAI Action Schema
export interface OpenAIAction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, OpenAIParameterSchema>;
    required?: string[];
  };
}

export interface OpenAIParameterSchema {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}
