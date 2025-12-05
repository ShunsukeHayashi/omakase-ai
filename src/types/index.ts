/**
 * Core type definitions for Omakase AI
 */

// Agent Types
export type AgentType =
  | 'shopping-guide'
  | 'product-sales'
  | 'faq-support'
  | 'onboarding'
  | 'robotics';

export type AgentMode = 'voice' | 'chat' | 'vision';

export type AgentStatus = 'active' | 'coming-soon' | 'disabled';

export interface AgentConfig {
  type: AgentType;
  modes: AgentMode[];
  status: AgentStatus;
  isDefault?: boolean;
}

// Widget Configuration
export type WidgetPosition = 'bottom-left' | 'bottom-right';

export type WidgetStyle = 'button' | 'preview' | 'hidden';

export interface WidgetConfig {
  position: WidgetPosition;
  style: WidgetStyle;
  heightPercentage: number;
  showWelcomeNotification: boolean;
}

// Knowledge Base
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
  isActive: boolean;
  stockQuantity?: number; // undefined = 在庫管理なし, 0 = 在庫切れ, >0 = 在庫あり
  lowStockThreshold?: number; // 在庫少アラートのしきい値
}

export interface QAItem {
  id: string;
  question: string;
  answer: string;
  status: 'active' | 'draft' | 'archived';
}

export interface Document {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

// Platform Tiers
export type SubscriptionTier = 'associate' | 'principal' | 'enterprise';

export interface PlatformFeatures {
  analytics: boolean;
  conversations: boolean;
  leads: boolean;
  customRules: boolean;
  reScraping: boolean;
}
