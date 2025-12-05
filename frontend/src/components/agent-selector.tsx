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
  {
    id: "sales-manager",
    name: "Sales Manager",
    nameJa: "営業部長AI",
    description: "超体育会系の営業部長。商談報告を詰めて部下の成長を促す",
    icon: "lucide:megaphone",
    status: "active",
  },
];

export const AgentSelector = ({ selectedId, onSelect }: AgentSelectorProps) => {
  return (
    <div className="space-y-8">
      {/* Header - Clean typography */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
          エージェントタイプ
        </h2>
        <p className="text-sm text-slate-500">
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
              whileHover={!isDisabled ? { y: -4 } : {}}
            >
              <Card
                isPressable={!isDisabled}
                isHoverable={!isDisabled}
                className={`
                  relative overflow-hidden rounded-2xl border
                  transition-all duration-200 bg-white h-full
                  ${isDisabled
                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    : isSelected
                      ? "border-slate-900 bg-white shadow-lg shadow-slate-900/5 ring-2 ring-slate-900 ring-offset-2"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                  }
                `}
                onPress={() => !isDisabled && onSelect(agent)}
              >
                <CardBody className="p-6 flex flex-col h-full">
                  {/* Icon & Status Row */}
                  <div className="flex items-start justify-between mb-5">
                    {/* Icon - Simplified */}
                    <div
                      className={`
                        flex h-12 w-12 items-center justify-center rounded-xl
                        ${isDisabled
                          ? "bg-slate-100"
                          : isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 group-hover:bg-slate-100"
                        }
                        transition-colors duration-200
                      `}
                    >
                      <Icon
                        icon={agent.icon}
                        className={`
                          text-2xl
                          ${isDisabled
                            ? "text-slate-400"
                            : isSelected
                              ? "text-white"
                              : "text-slate-600"
                          }
                        `}
                      />
                    </div>

                    {/* Status Badge */}
                    {isDisabled ? (
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                        準備中
                      </span>
                    ) : isSelected ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-sm shadow-blue-500/50">
                        <Icon icon="lucide:check" className="text-sm text-white" />
                      </div>
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="space-y-1 mt-auto">
                    <h3 className={`
                      text-lg font-semibold tracking-tight
                      ${isDisabled ? "text-slate-400" : "text-slate-900"}
                    `}>
                      {agent.name}
                    </h3>
                    <p className={`
                      text-sm font-medium
                      ${isDisabled ? "text-slate-400" : isSelected ? "text-slate-700" : "text-slate-500"}
                    `}>
                      {agent.nameJa}
                    </p>
                    <p className={`
                      text-sm leading-relaxed pt-2
                      ${isDisabled ? "text-slate-400" : "text-slate-600"}
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
      <p className="text-center text-xs text-slate-500">
        選択したエージェントは後から変更できます
      </p>
    </div>
  );
};

export default AgentSelector;
