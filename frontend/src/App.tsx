import React from "react";
import { GradientHero } from "./components/gradient-hero";
import { LoginCard } from "./components/login-card";
import { NavigationSidebar } from "./components/navigation-sidebar";
import { ConfigPanel } from "./components/config-panel";
import { PreviewPhone } from "./components/preview-phone";
import { AgentSelector, type AgentType } from "./components/agent-selector";
import { ECContextForm } from "./components/ec-context-form";
import { Button, Tabs, Tab, Card, CardBody } from "@heroui/react";
import { Icon } from "@iconify/react";

type AgentConfig = {
  avatarUrl: string | null;
  name: string;
  personality: string;
  language: "Japanese" | "English" | "Korean";
  voice: string;
  voiceOn: boolean;
  speechSpeed: number;
  startMessage: string;
  endMessage: string;
};

export default function App() {
  const [showPreview, setShowPreview] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("agent");
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>("shopping-guide");

  const [config, setConfig] = React.useState<AgentConfig>({
    avatarUrl: null,
    name: "Yuumi",
    personality: "明るく親しみやすく、初めての来訪者にも気軽に話しかけるスタイル。要点を簡潔に伝え、相手の目的達成を最優先にします。",
    language: "Japanese",
    voice: "Yuumi (Japanese Female)",
    voiceOn: true,
    speechSpeed: 1.0,
    startMessage: "こんにちは！お困りのことはありますか？",
    endMessage: "ありがとうございました。またいつでもお声がけください！",
  });

  const updateConfig = (patch: Partial<AgentConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const handleAgentSelect = (agent: AgentType) => {
    setSelectedAgentId(agent.id);
    // Update config based on selected agent
    const agentConfigs: Record<string, Partial<AgentConfig>> = {
      "shopping-guide": {
        name: "Yuumi",
        personality: "明るく親しみやすく、初めての来訪者にも気軽に話しかけるスタイル。要点を簡潔に伝え、相手の目的達成を最優先にします。",
        startMessage: "こんにちは！本日はどのような商品をお探しですか？",
        voice: "Yuumi (Japanese Female)",
      },
      "product-sales": {
        name: "Aya",
        personality: "専門的で説得力があり、商品知識が豊富。データドリブンな提案を行いながらも、お客様に寄り添った対応を心がけます。",
        startMessage: "こちらの商品にご興味をお持ちですね。詳しくご説明しましょうか？",
        voice: "Yuumi (Japanese Female)",
      },
      "faq-support": {
        name: "Hana",
        personality: "丁寧で正確、効率的なサポートを提供。プロフェッショナルで落ち着いた対応でお客様の疑問を解消します。",
        startMessage: "お問い合わせありがとうございます。どのようなご質問でしょうか？",
        voice: "Yuumi (Japanese Female)",
      },
      "omotenashi-advisor": {
        name: "Sakura",
        personality: "物腰柔らかで聞き上手、共感力が高い。お客様の潜在ニーズを引き出し、素敵な出会いを提案します。押し売りせず、共感から始めるスタイル。",
        startMessage: "いらっしゃいませ。本日はどのようなアイテムをお探しでしょうか？",
        voice: "Yuumi (Japanese Female)",
      },
    };

    if (agentConfigs[agent.id]) {
      updateConfig(agentConfigs[agent.id]);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-[#0B0B0C] via-[#121214] to-[#0B0B0C] text-foreground">
      {/* Ambient background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-cyan-500/20 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-[280px_1fr_420px] gap-6 px-6 py-8">
        {/* Left Sidebar */}
        <NavigationSidebar />

        {/* Main Content */}
        <main className="space-y-6">
          {/* Tabs Navigation */}
          <Card className="border border-white/10 bg-[#0B0B0C]/80 backdrop-blur-sm">
            <CardBody className="p-2">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as string)}
                variant="light"
                classNames={{
                  tabList: "gap-2",
                  tab: "px-4 py-2",
                  cursor: "bg-white/10",
                }}
              >
                <Tab
                  key="agent"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:bot" className="text-lg" />
                      <span>Agent Type</span>
                    </div>
                  }
                />
                <Tab
                  key="character"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:user" className="text-lg" />
                      <span>Character</span>
                    </div>
                  }
                />
                <Tab
                  key="knowledge"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:database" className="text-lg" />
                      <span>Knowledge</span>
                    </div>
                  }
                />
                <Tab
                  key="settings"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:settings" className="text-lg" />
                      <span>Settings</span>
                    </div>
                  }
                />
              </Tabs>
            </CardBody>
          </Card>

          {/* Tab Content */}
          {activeTab === "agent" && (
            <Card className="border border-white/10 bg-[#0B0B0C]/80 backdrop-blur-sm">
              <CardBody className="p-6">
                <AgentSelector
                  selectedId={selectedAgentId}
                  onSelect={handleAgentSelect}
                />
              </CardBody>
            </Card>
          )}

          {activeTab === "character" && (
            <ConfigPanel value={config} onChange={updateConfig} />
          )}

          {activeTab === "knowledge" && (
            <Card className="border border-white/10 bg-[#0B0B0C]/80 backdrop-blur-sm">
              <CardBody className="p-6">
                <ECContextForm />
              </CardBody>
            </Card>
          )}

          {activeTab === "settings" && (
            <Card className="border border-white/10 bg-[#0B0B0C]/80 backdrop-blur-sm">
              <CardBody className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20">
                  <Icon icon="lucide:settings" className="text-3xl text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Advanced Settings</h3>
                <p className="max-w-md text-foreground-500">
                  ウィジェットの表示位置、カスタムCSS、Webhook連携などの高度な設定を行います。
                </p>
              </CardBody>
            </Card>
          )}
        </main>

        {/* Right Preview */}
        {showPreview ? (
          <PreviewPhone config={config} onHide={() => setShowPreview(false)} />
        ) : (
          <div className="flex items-start justify-end">
            <Button
              variant="flat"
              className="mt-2 gap-2 border border-white/10 bg-white/5"
              onPress={() => setShowPreview(true)}
            >
              <Icon icon="lucide:smartphone" className="text-base" />
              Show preview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
