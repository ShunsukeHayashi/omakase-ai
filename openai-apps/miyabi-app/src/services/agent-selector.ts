/**
 * Agent Auto-Selection Service
 * Automatically selects the best agent for a given task
 */

import type {
  AgentType,
  TaskAction,
  AgentSelectionResult,
  ParsedTask,
} from '../types/index.js';

// Agent capabilities matrix
const AGENT_CAPABILITIES: Record<AgentType, {
  actions: TaskAction[];
  priority: number;
  description: string;
}> = {
  coordinator: {
    actions: ['run_agent', 'check_status', 'run_tests'],
    priority: 1,
    description: 'タスク統括・並行実行制御',
  },
  codegen: {
    actions: ['generate_code', 'generate_docs'],
    priority: 2,
    description: 'AI駆動コード生成',
  },
  review: {
    actions: ['review_code', 'security_scan'],
    priority: 2,
    description: '品質評価・80点基準',
  },
  issue: {
    actions: ['create_issue', 'run_agent'],
    priority: 3,
    description: 'Issue分析・Label付与',
  },
  pr: {
    actions: ['create_pr'],
    priority: 3,
    description: 'PR自動作成',
  },
  deployment: {
    actions: ['deploy'],
    priority: 4,
    description: 'CI/CD・Firebase',
  },
};

// Agent dependencies (which agents should run before others)
const AGENT_DEPENDENCIES: Partial<Record<AgentType, AgentType[]>> = {
  pr: ['codegen', 'review'],
  deployment: ['pr', 'review'],
  review: ['codegen'],
};

/**
 * Select the best agent for a parsed task
 */
export function selectAgent(parsedTask: ParsedTask): AgentSelectionResult {
  const { action, suggestedAgent } = parsedTask;

  // Find agents capable of this action
  const capableAgents: AgentType[] = [];
  for (const [agent, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
    if (capabilities.actions.includes(action)) {
      capableAgents.push(agent as AgentType);
    }
  }

  // If no capable agents, use coordinator as fallback
  if (capableAgents.length === 0) {
    return {
      selectedAgent: 'coordinator',
      confidence: 0.5,
      reasoning: `アクション "${action}" に対応するAgentが見つからないため、CoordinatorAgentにフォールバック`,
      fallbackAgents: ['codegen', 'review'],
    };
  }

  // If suggested agent is capable, prefer it
  if (capableAgents.includes(suggestedAgent)) {
    const fallbacks = capableAgents.filter(a => a !== suggestedAgent);
    return {
      selectedAgent: suggestedAgent,
      confidence: parsedTask.confidence,
      reasoning: `タスク解析により ${getAgentName(suggestedAgent)} を選択`,
      fallbackAgents: fallbacks.length > 0 ? fallbacks : ['coordinator'],
    };
  }

  // Sort by priority and select the best
  const sortedAgents = capableAgents.sort((a, b) => {
    return AGENT_CAPABILITIES[a].priority - AGENT_CAPABILITIES[b].priority;
  });

  const selectedAgent = sortedAgents[0];
  const fallbackAgents = sortedAgents.slice(1);

  return {
    selectedAgent,
    confidence: 0.7,
    reasoning: `アクション "${action}" に対して ${getAgentName(selectedAgent)} が最適`,
    fallbackAgents: fallbackAgents.length > 0 ? fallbackAgents : ['coordinator'],
  };
}

/**
 * Get human-readable agent name
 */
export function getAgentName(agent: AgentType): string {
  const names: Record<AgentType, string> = {
    coordinator: 'CoordinatorAgent',
    codegen: 'CodeGenAgent',
    review: 'ReviewAgent',
    issue: 'IssueAgent',
    pr: 'PRAgent',
    deployment: 'DeploymentAgent',
  };
  return names[agent];
}

/**
 * Get agent description
 */
export function getAgentDescription(agent: AgentType): string {
  return AGENT_CAPABILITIES[agent].description;
}

/**
 * Get agent dependencies
 */
export function getAgentDependencies(agent: AgentType): AgentType[] {
  return AGENT_DEPENDENCIES[agent] || [];
}

/**
 * Check if agent can handle action
 */
export function canAgentHandle(agent: AgentType, action: TaskAction): boolean {
  return AGENT_CAPABILITIES[agent].actions.includes(action);
}

/**
 * Get all agents sorted by priority
 */
export function getAllAgents(): AgentType[] {
  return Object.keys(AGENT_CAPABILITIES) as AgentType[];
}
