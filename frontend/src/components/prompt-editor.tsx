import React from "react";
import { Button, Card, CardBody, Chip, Textarea, Tooltip, ScrollShadow } from "@heroui/react";
import { Icon } from "@iconify/react";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: { key: string; label: string; desc: string }[];
}

const defaultVariables = [
  { key: "{{store_name}}", label: "Store Name", desc: "The name of your shop" },
  { key: "{{user_name}}", label: "User Name", desc: "The customer's name if logged in" },
  { key: "{{product_list}}", label: "Products", desc: "Top 5 recommended products" },
  { key: "{{cart_items}}", label: "Cart", desc: "Items currently in cart" },
  { key: "{{promotion}}", label: "Promo", desc: "Active campaign details" },
];

export const PromptEditor = ({
  value,
  onChange,
  variables = defaultVariables,
}: PromptEditorProps) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variableKey: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.substring(0, start) + variableKey + value.substring(end);
    onChange(newValue);
    
    // Re-focus and move cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
    }, 0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Main Editor Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Icon icon="lucide:terminal-square" className="text-lg" />
             </div>
             <div>
                <h3 className="text-base font-bold text-slate-900">System Instruction</h3>
                <p className="text-xs text-slate-500">Define the core logic and constraints for the AI.</p>
             </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" color="default" className="bg-white border border-slate-200 text-slate-600">
               <Icon icon="lucide:history" />
               History
            </Button>
            <Button size="sm" variant="flat" color="primary" className="bg-indigo-50 text-indigo-600">
               <Icon icon="lucide:sparkles" />
               Optimize with AI
            </Button>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500">
            <Icon icon="lucide:code-2" />
            <span>System Prompt Editor</span>
            <div className="ml-auto flex gap-2">
               <span className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-200 cursor-pointer transition-colors">
                  <Icon icon="lucide:copy" /> Copy
               </span>
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            value={value}
            onValueChange={onChange}
            minRows={15}
            maxRows={25}
            variant="flat"
            radius="none"
            classNames={{
              input: "font-mono text-sm leading-relaxed text-slate-800 bg-transparent !outline-none hover:bg-transparent focus:bg-transparent p-4",
              inputWrapper: "bg-transparent shadow-none hover:bg-transparent focus-within:bg-transparent !transition-none",
            }}
            placeholder="You are a helpful AI shopping assistant..."
          />
          <div className="absolute bottom-2 right-4 text-xs text-slate-400">
            {value.length} chars
          </div>
        </div>
      </div>

      {/* Sidebar: Variables & Tips */}
      <div className="space-y-6">
        {/* Variables Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Icon icon="lucide:brackets" className="text-indigo-500" />
            Dynamic Variables
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Click to insert context-aware data into your prompt.
          </p>
          
          <div className="flex flex-col gap-2">
            {variables.map((v) => (
              <Tooltip key={v.key} content={v.desc} placement="left">
                <button
                  onClick={() => insertVariable(v.key)}
                  className="group flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-xs transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <span className="font-mono font-medium text-slate-700 group-hover:text-indigo-700">
                    {v.label}
                  </span>
                  <Icon icon="lucide:plus" className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-indigo-500" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Tips Panel */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
            <Icon icon="lucide:lightbulb" />
            Pro Tips
          </div>
          <ul className="list-inside list-disc space-y-2 text-xs text-amber-900/80">
            <li>
              Be specific about the agent's <strong>role</strong> and <strong>limitations</strong>.
            </li>
            <li>
              Use <code>{"{{store_name}}"}</code> to keep the branding consistent.
            </li>
            <li>
              Define how to handle "I don't know" cases to avoid hallucinations.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
