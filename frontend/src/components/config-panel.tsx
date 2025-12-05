import React from "react";
import { Avatar, Button, Input, Slider, Switch, Textarea, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

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

const voiceOptions = [
  {
    id: "Yuumi (Japanese Female)",
    name: "Yuumi",
    lang: "Japanese",
    desc: "明るく元気。初回接客やポジティブな印象作りに最適。",
    avatar: "https://img.heroui.chat/image/avatar?w=128&h=128&u=yuumi",
  },
  {
    id: "Haru (Japanese Male)",
    name: "Haru",
    lang: "Japanese",
    desc: "落ち着いた共感型。丁寧なサポートに適しています。",
    avatar: "https://img.heroui.chat/image/avatar?w=128&h=128&u=haru",
  },
  {
    id: "Ava (English Female)",
    name: "Ava",
    lang: "English",
    desc: "Clear and friendly tone. Great for global audiences.",
    avatar: "https://img.heroui.chat/image/avatar?w=128&h=128&u=ava",
  },
];

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

  return (
    <div className="space-y-8 pb-8">
      {/* Section 1: Identity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon icon="lucide:user" className="text-xs" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Identity</h3>
        </div>
        
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
           {/* Avatar uploader */}
          <div
            className={`
              group relative flex h-32 w-32 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition-all
              ${dragOver 
                ? "border-indigo-500 bg-indigo-50" 
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
              }
            `}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={onSelectClick}
          >
             {value.avatarUrl ? (
                <img src={value.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
             ) : (
                <>
                  <Icon icon="lucide:image-plus" className="text-2xl text-slate-400 group-hover:text-slate-600" />
                  <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">Upload</span>
                </>
             )}
             <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleFiles(e.target.files)}
              />
          </div>

          <div className="space-y-4">
            <Input
              label="Agent Name"
              placeholder="e.g. Yuumi"
              value={value.name}
              onValueChange={(v) => onChange({ name: v })}
              variant="bordered"
              classNames={{
                label: "text-slate-500",
                input: "text-slate-900 font-medium",
                inputWrapper: "border-slate-200 bg-white hover:border-slate-300 focus-within:border-slate-900 shadow-sm",
              }}
            />
             
             <div className="relative">
               <Icon icon="lucide:quote" className="absolute left-3 top-3 text-slate-300" />
               <Textarea
                  label="Personality & Behavior"
                  placeholder="Describe how your agent talks, behaves, and prioritizes tasks."
                  value={value.personality}
                  onValueChange={(v) => onChange({ personality: v })}
                  minRows={3}
                  variant="bordered"
                  classNames={{
                    label: "text-slate-500 pl-6",
                    input: "text-slate-700 pl-6 italic",
                    inputWrapper: "border-slate-200 bg-slate-50 hover:border-slate-300 focus-within:border-slate-900 focus-within:bg-white shadow-sm",
                  }}
                />
             </div>
          </div>
        </div>
      </div>

      {/* Section 2: Voice & Audio */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Icon icon="lucide:mic" className="text-xs" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Voice & Audio</h3>
        </div>

        {/* Voice Selection Grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          {voiceOptions.map((opt) => {
            const isSelected = value.voice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ voice: opt.id, language: opt.lang as any })}
                className={`
                  relative flex flex-col items-start gap-3 rounded-xl border p-3 text-left transition-all
                  ${isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg ring-2 ring-slate-900 ring-offset-2"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex w-full items-center justify-between">
                   <Avatar src={opt.avatar} className="h-8 w-8" />
                   {isSelected && <Icon icon="lucide:volume-2" className="animate-pulse" />}
                </div>
                <div>
                   <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>{opt.name}</p>
                   <p className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>{opt.lang}</p>
                </div>
                <p className={`text-[10px] line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {opt.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Settings Row */}
        <div className="grid gap-6 pt-2 md:grid-cols-2">
           <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                 <span className="text-sm font-medium text-slate-700">Speech Speed</span>
                 <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{value.speechSpeed.toFixed(1)}x</span>
              </div>
              <Slider
                aria-label="Speech Speed"
                value={value.speechSpeed}
                onChange={(v) => onChange({ speechSpeed: Number(v) })}
                minValue={0.5}
                maxValue={2}
                step={0.1}
                size="sm"
                color="foreground"
                classNames={{
                   track: "h-1.5 bg-slate-100",
                   filler: "bg-slate-900",
                   thumb: "bg-white border-2 border-slate-900 shadow-md w-5 h-5 after:bg-slate-900 after:w-1 after:h-1",
                }}
              />
              <div className="mt-2 flex justify-between text-[10px] text-slate-400 px-1">
                 <span>Slow</span>
                 <span>Normal</span>
                 <span>Fast</span>
              </div>
           </div>

           <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Voice Mode</p>
                <p className="text-xs text-slate-500">Enable TTS/STT features</p>
              </div>
              <Switch 
                isSelected={value.voiceOn} 
                onValueChange={(v) => onChange({ voiceOn: v })}
                color="default"
                classNames={{
                   wrapper: "group-data-[selected=true]:bg-slate-900",
                }}
              />
           </div>
        </div>

        {/* Call Messages */}
        <div className="grid gap-4 pt-2">
           <Input
              label="Start Message (Call)"
              placeholder={placeholders[value.language].start}
              value={value.startMessage}
              onValueChange={(v) => onChange({ startMessage: v })}
              variant="bordered"
              classNames={{
                label: "text-slate-500",
                input: "text-slate-900",
                inputWrapper: "border-slate-200 bg-white shadow-sm",
              }}
            />
            <Input
              label="End Message (Call)"
              placeholder={placeholders[value.language].end}
              value={value.endMessage}
              onValueChange={(v) => onChange({ endMessage: v })}
              variant="bordered"
              classNames={{
                label: "text-slate-500",
                input: "text-slate-900",
                inputWrapper: "border-slate-200 bg-white shadow-sm",
              }}
            />
        </div>
      </div>
    </div>
  );
};