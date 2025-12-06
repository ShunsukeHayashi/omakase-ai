/**
 * Natural Language Task Parser
 * Converts user prompts to structured Miyabi tasks
 */

import type {
  ParsedTask,
  TaskAction,
  TaskPriority,
  AgentType,
} from '../types/index.js';

// Action patterns for task recognition
const ACTION_PATTERNS: { pattern: RegExp; action: TaskAction; agent: AgentType }[] = [
  // Issue related
  { pattern: /issue.*作成|create.*issue|issue.*create/i, action: 'create_issue', agent: 'issue' },
  { pattern: /issue.*分析|analyze.*issue|issue.*analyze/i, action: 'run_agent', agent: 'issue' },

  // Code generation
  { pattern: /コード.*生成|generate.*code|code.*generate|実装|implement/i, action: 'generate_code', agent: 'codegen' },
  { pattern: /機能.*追加|add.*feature|feature.*add|新機能/i, action: 'generate_code', agent: 'codegen' },

  // Review
  { pattern: /レビュー|review|品質.*チェック|quality.*check/i, action: 'review_code', agent: 'review' },
  { pattern: /コード.*確認|check.*code|code.*check/i, action: 'review_code', agent: 'review' },

  // PR
  { pattern: /pr.*作成|create.*pr|pull.*request|プルリクエスト/i, action: 'create_pr', agent: 'pr' },

  // Deploy
  { pattern: /デプロイ|deploy|リリース|release|本番.*反映/i, action: 'deploy', agent: 'deployment' },
  { pattern: /staging|ステージング/i, action: 'deploy', agent: 'deployment' },

  // Test
  { pattern: /テスト.*実行|run.*test|test.*run|テスト/i, action: 'run_tests', agent: 'coordinator' },

  // Security
  { pattern: /セキュリティ|security|脆弱性|vulnerability|スキャン|scan/i, action: 'security_scan', agent: 'review' },

  // Docs
  { pattern: /ドキュメント|document|docs|ドキュメント.*生成/i, action: 'generate_docs', agent: 'codegen' },

  // Status
  { pattern: /ステータス|status|状態|状況|確認/i, action: 'check_status', agent: 'coordinator' },

  // Agent run
  { pattern: /agent.*実行|run.*agent|エージェント.*実行/i, action: 'run_agent', agent: 'coordinator' },
];

// Priority patterns
const PRIORITY_PATTERNS: { pattern: RegExp; priority: TaskPriority }[] = [
  { pattern: /緊急|critical|至急|asap|今すぐ|immediately/i, priority: 'P0-Critical' },
  { pattern: /重要|important|高優先|high.*priority|優先.*高/i, priority: 'P1-High' },
  { pattern: /低優先|low.*priority|優先.*低|後で|later/i, priority: 'P3-Low' },
];

// Extract issue number from text
function extractIssueNumber(text: string): number | undefined {
  const match = text.match(/#(\d+)|issue\s*(\d+)|Issue\s*(\d+)/i);
  if (match) {
    return parseInt(match[1] || match[2] || match[3], 10);
  }
  return undefined;
}

// Extract file paths from text
function extractFilePaths(text: string): string[] {
  const patterns = [
    /(?:^|\s)([\w\-./]+\.[a-zA-Z]{2,4})(?:\s|$|,)/g,
    /`([^`]+\.[a-zA-Z]{2,4})`/g,
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }
  }
  return files;
}

// Extract branch name from text
function extractBranchName(text: string): string | undefined {
  const match = text.match(/branch[:\s]+([^\s,]+)|ブランチ[:\s]+([^\s,]+)/i);
  if (match) {
    return match[1] || match[2];
  }
  return undefined;
}

// Parse natural language to task
export function parseTask(prompt: string): ParsedTask {
  let action: TaskAction = 'unknown';
  let suggestedAgent: AgentType = 'coordinator';
  let confidence = 0;

  // Find matching action pattern
  for (const { pattern, action: matchedAction, agent } of ACTION_PATTERNS) {
    if (pattern.test(prompt)) {
      action = matchedAction;
      suggestedAgent = agent;
      confidence = 0.8;
      break;
    }
  }

  // Determine priority
  let priority: TaskPriority = 'P2-Medium';
  for (const { pattern, priority: matchedPriority } of PRIORITY_PATTERNS) {
    if (pattern.test(prompt)) {
      priority = matchedPriority;
      break;
    }
  }

  // Extract parameters
  const parameters: Record<string, unknown> = {};

  const issueNumber = extractIssueNumber(prompt);
  if (issueNumber) {
    parameters.issueNumber = issueNumber;
    confidence += 0.1;
  }

  const files = extractFilePaths(prompt);
  if (files.length > 0) {
    parameters.files = files;
    confidence += 0.05;
  }

  const branchName = extractBranchName(prompt);
  if (branchName) {
    parameters.branchName = branchName;
    confidence += 0.05;
  }

  // Cap confidence at 0.95
  confidence = Math.min(confidence, 0.95);

  // If no action found, default to coordinator with low confidence
  if (action === 'unknown') {
    confidence = 0.3;
  }

  return {
    action,
    target: issueNumber ? `#${issueNumber}` : undefined,
    parameters,
    priority,
    suggestedAgent,
    confidence,
    originalPrompt: prompt,
  };
}

// Get human-readable action description
export function getActionDescription(action: TaskAction): string {
  const descriptions: Record<TaskAction, string> = {
    create_issue: 'Issue作成',
    run_agent: 'Agent実行',
    deploy: 'デプロイ',
    review_code: 'コードレビュー',
    generate_code: 'コード生成',
    create_pr: 'PR作成',
    check_status: 'ステータス確認',
    run_tests: 'テスト実行',
    security_scan: 'セキュリティスキャン',
    generate_docs: 'ドキュメント生成',
    unknown: '不明なアクション',
  };
  return descriptions[action];
}
