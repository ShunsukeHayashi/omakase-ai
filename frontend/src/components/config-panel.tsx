import React from "react";
    import { Avatar, Button, Input, Slider, Switch, Textarea } from "@heroui/react";
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

    export const ConfigPanel = ({
      value,
      onChange,
    }: {
      value: AgentConfig;
      onChange: (patch: Partial<AgentConfig>) => void;
    }) => {
      const [dragOver, setDragOver] = React.useState(false);
      const fileInputRef = React.useRef<HTMLInputElement | null>(null);

      const handleFiles = (files: FileList | null) => {
        if (!files || !files[0]) return;
        const f = files[0];
        const url = URL.createObjectURL(f);
        onChange({ avatarUrl: url });
      };

      const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      };

      const onSelectClick = () => fileInputRef.current?.click();

      // Voice descriptions
      const voiceDescriptions: Record<string, string> = {
        "Yuumi (Japanese Female)": "明るく元気。初回接客やポジティブな印象作りに最適。",
        "Haru (Japanese Male)": "落ち着いた共感型。丁寧なサポートに適しています。",
        "Ava (English Female)": "Clear and friendly tone. Great for global audiences.",
      };

      // Localized placeholders for voice call messages
      const placeholders = {
        Japanese: {
          start: "お電話ありがとうございます。ご用件をお聞かせください。",
          end: "本日はありがとうございました。失礼いたします。",
        },
        English: {
          start: "Thanks for calling! How can I help you today?",
          end: "Thanks for your time. Goodbye!",
        },
        Korean: {
          start: "전화 주셔서 감사합니다. 무엇을 도와드릴까요?",
          end: "이용해 주셔서 감사합니다. 안녕히 계세요.",
        },
      } as const;

      // Save indicator
      const [saving, setSaving] = React.useState<"idle" | "saving" | "saved">("idle");
      const valueSignature = JSON.stringify(value);
      React.useEffect(() => {
        if (saving === "saving") return;
        setSaving("saving");
        const t = setTimeout(() => setSaving("saved"), 600);
        return () => clearTimeout(t);
      }, [valueSignature]);

      return (
        <section className="min-h-[80vh] rounded-medium border border-default-200 bg-content1 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Character Configuration</h2>
            <p className="text-small text-foreground-500">Define identity, voice and behavior. Changes update the preview instantly.</p>
          </div>

          {/* Avatar uploader */}
          <div
            className={[
              "relative flex items-center gap-4 rounded-medium border p-4",
              dragOver ? "border-primary bg-primary/5" : "border-default-200 bg-content2",
            ].join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Avatar
              radius="md"
              className="h-16 w-16"
              src={
                value.avatarUrl ??
                "https://img.heroui.chat/image/avatar?w=128&h=128&u=agent_default"
              }
            />
            <div className="flex-1">
              <p className="text-small font-medium">Avatar</p>
              <p className="text-tiny text-foreground-500">Drag & drop or upload. Recommended: 512×512px, JPG/PNG.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="flat" className="gap-2" onPress={onSelectClick}>
                  <Icon icon="lucide:upload" />
                  Upload
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  className="gap-2"
                  onPress={() =>
                    onChange({
                      avatarUrl: "https://img.heroui.chat/image/avatar?w=128&h=128&u=random_pick",
                    })
                  }
                >
                  <Icon icon="lucide:image-plus" />
                  Pick from gallery
                </Button>
              </div>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

          {/* Name */}
          <div className="mt-6 grid gap-4">
            <Input
              label="Name"
              placeholder="Agent name (e.g., Yuumi)"
              value={value.name}
              onValueChange={(v) => onChange({ name: v })}
            />

            {/* Personality */}
            <Textarea
              label="Personality"
              placeholder="Describe how your agent talks, behaves, and prioritizes tasks."
              value={value.personality}
              onValueChange={(v) => onChange({ personality: v })}
              minRows={4}
            />
          </div>

          {/* Language & Voice */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-small font-medium text-foreground">Language</label>
              <select
                className="rounded-medium border border-default-200 bg-content1 px-3 py-2 text-small outline-hidden focus-visible:ring-3 focus-visible:ring-primary"
                value={value.language}
                onChange={(e) => onChange({ language: e.target.value as AgentConfig["language"] })}
              >
                <option>Japanese</option>
                <option>English</option>
                <option>Korean</option>
              </select>
              <p className="text-tiny text-foreground-500">UI remains in English; agent speaks the selected language.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-small font-medium text-foreground">Voice Selection</label>
              <select
                className="rounded-medium border border-default-200 bg-content1 px-3 py-2 text-small outline-hidden focus-visible:ring-3 focus-visible:ring-primary"
                value={value.voice}
                onChange={(e) => onChange({ voice: e.target.value })}
              >
                <option>Yuumi (Japanese Female)</option>
                <option>Haru (Japanese Male)</option>
                <option>Ava (English Female)</option>
              </select>
              <p className="text-tiny text-foreground-500">{voiceDescriptions[value.voice] ?? ""}</p>
            </div>
          </div>

          {/* Voice toggle & speed */}
          <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="flex items-center justify-between rounded-medium border border-default-200 bg-content2 p-4">
              <div>
                <p className="text-small font-medium">Enable Voice mode</p>
                <p className="text-tiny text-foreground-500">Allow the agent to speak using the selected voice.</p>
              </div>
              <Switch isSelected={value.voiceOn} onValueChange={(v) => onChange({ voiceOn: v })} />
            </div>

            <div className="rounded-medium border border-default-200 bg-content2 p-4">
              <p className="mb-2 text-small font-medium">Speech Speed: {value.speechSpeed.toFixed(1)}x</p>
              <Slider
                aria-label="Speech Speed"
                value={value.speechSpeed}
                onChange={(v) => onChange({ speechSpeed: Number(v) })}
                minValue={0.5}
                maxValue={2}
                step={0.1}
                color="primary"
              />
            </div>
          </div>

          {/* Voice call message localization fix */}
          <div className="mt-6 grid gap-4">
            <Textarea
              label="Voice Call - Start Message"
              placeholder={placeholders[value.language].start}
              value={value.startMessage}
              onValueChange={(v) => onChange({ startMessage: v })}
              minRows={3}
            />
            <Textarea
              label="Voice Call - End Message"
              placeholder={placeholders[value.language].end}
              value={value.endMessage}
              onValueChange={(v) => onChange({ endMessage: v })}
              minRows={3}
            />
            <p className="text-tiny text-foreground-500">
              Tip: Placeholders auto-localize based on the selected language to avoid mismatches.
            </p>
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 border-t border-default-200 bg-content1/90 px-6 py-4 backdrop-blur-sm md:-mx-8 md:-mb-8 md:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-small">
                {saving === "saving" ? (
                  <>
                    <Icon icon="lucide:loader-2" className="animate-spin text-default-500" />
                    <span className="text-foreground-500">Saving…</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check" className="text-success-500" />
                    <span className="text-foreground-500">All changes saved</span>
                  </>
                )}
              </div>
              <Button color="primary" className="gap-2">
                <Icon icon="lucide:save" />
                Save changes
              </Button>
            </div>
          </div>
        </section>
      );
    };