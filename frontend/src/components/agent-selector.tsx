import React from "react";
import { Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

export interface AgentType {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  icon: string;
  status: "active" | "coming-soon";
}

interface AgentSelectorProps {
  selectedId: string | null;
  onSelect: (agent: AgentType) => void;
}

// Ive-approved: Simplified agent data without gradients
const agents: AgentType[] = [
  {
    id: "shopping-guide",
    name: "Shopping Guide",
    nameJa: "ショッピングガイド",
    description: "商品案内とコンシェルジュ機能",
    icon: "lucide:shopping-bag",
    status: "active",
  },
  {
    id: "product-sales",
    name: "Product Sales",
    nameJa: "商品販売エージェント",
    description: "商品スペック、在庫、レビュー連携",
    icon: "lucide:package",
    status: "active",
  },
  {
    id: "faq-support",
    name: "FAQ Support",
    nameJa: "FAQサポート",
    description: "よくある質問に即座に回答",
    icon: "lucide:help-circle",
    status: "active",
  },
  {
    id: "omotenashi-advisor",
    name: "Omotenashi Advisor",
    nameJa: "おもてなしアドバイザー",
    description: "潜在ニーズを引き出し、素敵な出会いを提案",
    icon: "lucide:heart",
    status: "active",
  },
  {
    id: "onboarding",
    name: "Onboarding",
    nameJa: "オンボーディング",
    description: "新規ユーザー向けガイド",
    icon: "lucide:compass",
    status: "coming-soon",
  },
];

export const AgentSelector = ({ selectedId, onSelect }: AgentSelectorProps) => {
  return (
    <div className="space-y-8">
      {/* Header - Clean typography */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">
          エージェントタイプ
        </h2>
        <p className="text-sm text-gray-400">
          用途に応じたエージェントを選択してください
        </p>
      </div>

      {/* Agent Cards Grid - Generous spacing */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, index) => {
          const isSelected = selectedId === agent.id;
          const isDisabled = agent.status === "coming-soon";

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            >
              <Card
                isPressable={!isDisabled}
                isHoverable={!isDisabled}
                className={`
                  relative overflow-hidden rounded-2xl
                  transition-all duration-200
                  ${isDisabled
                    ? "bg-gray-900/50 border border-gray-800 opacity-50 cursor-not-allowed"
                    : isSelected
                      ? "bg-blue-950/30 border-2 border-blue-500 shadow-lg shadow-blue-500/10"
                      : "bg-gray-900/80 border border-gray-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5"
                  }
                `}
                onPress={() => !isDisabled && onSelect(agent)}
              >
                <CardBody className="p-6">
                  {/* Icon & Status Row */}
                  <div className="flex items-start justify-between mb-5">
                    {/* Icon - Simplified */}
                    <div
                      className={`
                        flex h-12 w-12 items-center justify-center rounded-xl
                        ${isDisabled
                          ? "bg-gray-800"
                          : isSelected
                            ? "bg-blue-500/20"
                            : "bg-gray-800 group-hover:bg-blue-500/10"
                        }
                        transition-colors duration-200
                      `}
                    >
                      <Icon
                        icon={agent.icon}
                        className={`
                          text-2xl
                          ${isDisabled
                            ? "text-gray-600"
                            : isSelected
                              ? "text-blue-400"
                              : "text-gray-400"
                          }
                        `}
                      />
                    </div>

                    {/* Status Badge */}
                    {isDisabled ? (
                      <span className="px-3 py-1 bg-gray-800 text-gray-500 text-xs font-medium rounded-full">
                        準備中
                      </span>
                    ) : isSelected ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                        <Icon icon="lucide:check" className="text-sm text-white" />
                      </div>
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <h3 className={`
                      text-lg font-semibold tracking-tight
                      ${isDisabled ? "text-gray-600" : "text-white"}
                    `}>
                      {agent.name}
                    </h3>
                    <p className={`
                      text-sm font-medium
                      ${isDisabled ? "text-gray-700" : isSelected ? "text-blue-400" : "text-gray-500"}
                    `}>
                      {agent.nameJa}
                    </p>
                    <p className={`
                      text-sm leading-relaxed pt-2
                      ${isDisabled ? "text-gray-700" : "text-gray-400"}
                    `}>
                      {agent.description}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint - Subtle */}
      <p className="text-center text-xs text-gray-600">
        選択したエージェントは後から変更できます
      </p>
    </div>
  );
};

export default AgentSelector;
