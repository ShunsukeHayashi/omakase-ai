/**
 * Agent Prompts Module
 * Exports all agent prompt templates and configurations
 */

export {
  type AgentType,
  type Language,
  type AgentPromptConfig,
  buildPromptForAgent,
  buildShoppingGuidePrompt,
  buildProductSalesPrompt,
  buildFAQSupportPrompt,
  buildOnboardingPrompt,
  buildRoboticsPrompt,
  defaultAgentConfigs,
} from './prompts.js';
