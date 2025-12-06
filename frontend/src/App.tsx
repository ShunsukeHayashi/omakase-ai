import React from "react";
import { NavigationSidebar } from "./components/navigation-sidebar";
import { ConfigPanel } from "./components/config-panel";
import { PreviewPhone } from "./components/preview-phone";
import { AgentSelector, type AgentType } from "./components/agent-selector";
import { ECContextForm, type ContextResult } from "./components/ec-context-form";
import { PromptEditor } from "./components/prompt-editor";
import { Button, Tabs, Tab, Card, CardBody, Chip, Divider } from "@heroui/react";
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
  agentType?: string;
  systemPrompt: string;
};

export default function App() {
  const [showPreview, setShowPreview] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("agent");
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>("shopping-guide");
  const [latestContext, setLatestContext] = React.useState<ContextResult | null>(null);

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
    agentType: "shopping-guide",
    systemPrompt: `You are {{name}}, a helpful AI shopping assistant for {{store_name}}.
Your goal is to help customers find the perfect products based on their needs.

Tone & Style:
- {{personality}}
- Be concise and polite.
- Use emojis sparingly.

Constraints:
- Do not hallucinate products not in {{product_list}}.
- If unsure, ask for clarification.`,
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
        agentType: "shopping-guide",
      },
      "product-sales": {
        name: "Aya",
        personality: "専門的で説得力があり、商品知識が豊富。データドリブンな提案を行いながらも、お客様に寄り添った対応を心がけます。",
        startMessage: "こちらの商品にご興味をお持ちですね。詳しくご説明しましょうか？",
        voice: "Yuumi (Japanese Female)",
        agentType: "product-sales",
      },
      "faq-support": {
        name: "Hana",
        personality: "丁寧で正確、効率的なサポートを提供。プロフェッショナルで落ち着いた対応でお客様の疑問を解消します。",
        startMessage: "お問い合わせありがとうございます。どのようなご質問でしょうか？",
        voice: "Yuumi (Japanese Female)",
        agentType: "faq-support",
      },
      "omotenashi-advisor": {
        name: "Sakura",
        personality: "物腰柔らかで聞き上手、共感力が高い。お客様の潜在ニーズを引き出し、素敵な出会いを提案します。押し売りせず、共感から始めるスタイル。",
        startMessage: "いらっしゃいませ。本日はどのようなアイテムをお探しでしょうか？",
        voice: "Yuumi (Japanese Female)",
        agentType: "omotenashi-advisor",
      },
      "sales-manager": {
        name: "鬼塚部長",
        personality: "超体育会系。理不尽ギリギリの厳しさで詰めるが、根底には部下への愛がある。商談報告を詰めて成長を促す。",
        startMessage: "オイ！今日もお疲れだな。で、どうだったよ？結果出たか？",
        endMessage: "よし、じゃあ明日は倍動けよ。分かったな？お疲れ！",
        voice: "Ken (Japanese Male)",
        agentType: "sales-manager",
      },
    };

    if (agentConfigs[agent.id]) {
      updateConfig(agentConfigs[agent.id]);
    }
  };

  const handleContextGenerated = (context: ContextResult) => {
    setLatestContext(context);
  };

  const handleContextApplied = (context: ContextResult) => {
    setLatestContext(context);
    // 簡易的に開始メッセージをブランドトーンに合わせる
    if (context.storeContext.storeName) {
      updateConfig({
        startMessage: `こんにちは！${context.storeContext.storeName}へようこそ。本日はどのような商品をお探しですか？`,
      });
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] text-slate-900">
      <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[260px_1fr_360px] xl:grid-cols-[280px_1fr_420px] xl:px-6">
        {/* Left Sidebar */}
        <NavigationSidebar />

        {/* Main Content */}
        <main className="space-y-6">
          {/* Workspace Header */}
          <Card className="border-none bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-50 shadow-sm">
            <CardBody className="flex flex-col gap-4 p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
                  <Icon icon="lucide:waveform" className="text-sm" />
                  Voice & Chat Studio
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                    Omakase AI オペレーションパネル
                  </h1>
                  <p className="text-base text-slate-600">
                    エージェント設定・ナレッジ・プレビューを一箇所で管理。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Chip size="sm" variant="solid" className="bg-white/80 shadow-sm text-slate-700 backdrop-blur-md">
                    <Icon icon="lucide:mic" className="mr-1 text-indigo-500" />
                    Voice ready
                  </Chip>
                  <Chip size="sm" variant="solid" className="bg-white/80 shadow-sm text-slate-700 backdrop-blur-md">
                    <Icon icon="lucide:database" className="mr-1 text-emerald-500" />
                    Knowledge synced
                  </Chip>
                  <Chip size="sm" variant="solid" className="bg-white/80 shadow-sm text-slate-700 backdrop-blur-md">
                    <Icon icon="lucide:shield-check" className="mr-1 text-blue-500" />
                    Safety on
                  </Chip>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="bordered"
                  className="gap-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                  onPress={() => setActiveTab("knowledge")}
                >
                  <Icon icon="lucide:scan-text" className="text-lg" />
                  ナレッジ投入
                </Button>
                <Button
                  color="primary"
                  className="gap-2 bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-105 hover:opacity-90 transition-transform"
                  onPress={() => setShowPreview(true)}
                >
                  <Icon icon="lucide:smartphone" className="text-lg" />
                  プレビューを開く
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Tabs Navigation */}
          <div className="sticky top-0 z-20 -mx-4 bg-[#F6F7FB]/95 px-4 py-2 backdrop-blur-sm xl:-mx-6 xl:px-6">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              variant="light"
              classNames={{
                tabList: "gap-4 p-1",
                tab: "px-0 h-auto data-[selected=true]:opacity-100 opacity-60 transition-opacity",
                cursor: "w-full bg-slate-900 h-[2px] -bottom-2 shadow-none rounded-none",
                tabContent: "group-data-[selected=true]:text-slate-900 text-slate-500 font-medium text-base",
              }}
            >
              <Tab
                key="agent"
                title={
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Icon icon="lucide:bot" className="text-lg" />
                    <span>Agent Type</span>
                  </div>
                }
              />
              <Tab
                key="character"
                title={
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Icon icon="lucide:user" className="text-lg" />
                    <span>Character</span>
                  </div>
                }
              />
              <Tab
                key="prompt"
                title={
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Icon icon="lucide:terminal-square" className="text-lg" />
                    <span>Prompt</span>
                  </div>
                }
              />
              <Tab
                key="knowledge"
                title={
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Icon icon="lucide:database" className="text-lg" />
                    <span>Knowledge</span>
                  </div>
                }
              />
              <Tab
                key="settings"
                title={
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <Icon icon="lucide:settings" className="text-lg" />
                    <span>Settings</span>
                  </div>
                }
              />
            </Tabs>
            <Divider className="absolute bottom-0 left-0 right-0 border-slate-200" />
          </div>

          {/* Tab Content */}
          {activeTab === "agent" && (
            <Card className="border border-slate-200 bg-white">
              <CardBody className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Step 1
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">エージェントを選択</h2>
                    <p className="text-sm text-slate-500">
                      目的に合う役割を選ぶと、性格や口調のプリセットが自動で読み込まれます。
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:flex">
                    <Icon icon="lucide:sparkles" />
                    ショッピングサイト向けに最適化済み
                  </div>
                </div>
                <AgentSelector
                  selectedId={selectedAgentId}
                  onSelect={handleAgentSelect}
                />
              </CardBody>
            </Card>
          )}

          {activeTab === "character" && (
            <Card className="border border-slate-200 bg-white">
              <CardBody className="p-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Step 2
                  </p>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">キャラクターと声の調整</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon icon="lucide:volume-2" />
                      音声変更は即時プレビュー
                    </div>
                  </div>
                </div>
                <Divider className="border-slate-100" />
                <ConfigPanel value={config} onChange={updateConfig} />
              </CardBody>
            </Card>
          )}

          {activeTab === "prompt" && (
            <Card className="border border-slate-200 bg-white">
              <CardBody className="p-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Step 3
                  </p>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">プロンプトエンジニアリング</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon icon="lucide:wand-2" />
                      Advanced Mode
                    </div>
                  </div>
                </div>
                <Divider className="border-slate-100" />
                <PromptEditor
                  value={config.systemPrompt}
                  onChange={(v) => updateConfig({ systemPrompt: v })}
                />
              </CardBody>
            </Card>
          )}

          {activeTab === "knowledge" && (
            <Card className="border border-slate-200 bg-white">
              <CardBody className="p-6">
                <ECContextForm onContextGenerated={handleContextGenerated} onContextApplied={handleContextApplied} />
                {latestContext && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="mb-2 flex items-center gap-2 text-slate-900 font-semibold">
                      <Icon icon="lucide:database" />
                      ストアコンテキストが更新されました
                    </div>
                    <p className="font-medium text-slate-800">{latestContext.storeContext.storeName}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Products synced: {latestContext.productsCount} / Sample prompt ready
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === "settings" && (
            <Card className="border border-slate-200 bg-white">
              <CardBody className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <Icon icon="lucide:settings" className="text-3xl text-slate-900" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Advanced Settings</h3>
                <p className="max-w-md text-slate-600">
                  ウィジェットの表示位置、カスタムCSS、Webhook連携などの高度な設定を行います。
                </p>
              </CardBody>
            </Card>
          )}
        </main>

        {/* Right Preview */}
        <div className="lg:block">
          {showPreview ? (
            <PreviewPhone config={config} onHide={() => setShowPreview(false)} />
          ) : (
            <div className="flex items-start justify-end">
              <Button
                variant="flat"
                className="mt-2 gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onPress={() => setShowPreview(true)}
              >
                <Icon icon="lucide:smartphone" className="text-base" />
                Show preview
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}