import React from "react";
import { Button, Divider, Avatar, User } from "@heroui/react";
import { Icon } from "@iconify/react";

type Item = {
  key: string;
  label: string;
  icon: string;
  disabled?: boolean;
  premium?: boolean;
};

const sections: { header: string; items: Item[] }[] = [
  {
    header: "PERFORMANCE",
    items: [
      { key: "analytics", label: "Analytics", icon: "lucide:line-chart" },
      { key: "conversations", label: "Conversations", icon: "lucide:messages-square" },
      { key: "leads", label: "Leads (Premium)", icon: "lucide:lock", disabled: true, premium: true },
    ],
  },
  {
    header: "CONFIGURE",
    items: [
      { key: "character", label: "Character", icon: "lucide:user" },
      { key: "agent-types", label: "Agent Types", icon: "lucide:bot" },
      { key: "interface", label: "Interface", icon: "lucide:panel-top" },
    ],
  },
  {
    header: "TRAIN",
    items: [
      { key: "kb", label: "Knowledge Base", icon: "lucide:book-open" },
      { key: "rules", label: "Custom Rules", icon: "lucide:sliders" },
      { key: "rescrape", label: "Re-Scraping", icon: "lucide:scan" },
    ],
  },
];

export const NavigationSidebar = () => {
  const [active, setActive] = React.useState("character");

  return (
    <aside className="sticky top-8 flex h-[calc(100vh-4rem)] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Logo Area */}
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Icon icon="lucide:infinity" className="text-lg" />
        </div>
        <div className="font-bold tracking-tight text-slate-900">
          Omakase AI
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((sec, idx) => (
          <div key={sec.header} className={idx > 0 ? "mt-6" : ""}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sec.header}
            </div>
            <div className="flex flex-col gap-0.5">
              {sec.items.map((it) => {
                const isActive = active === it.key;
                return (
                  <Button
                    key={it.key}
                    variant="light"
                    color="default"
                    size="md"
                    fullWidth
                    isDisabled={it.disabled}
                    className={[
                      "justify-start gap-3 px-3 py-2 font-medium transition-all duration-200 h-10",
                      isActive 
                        ? "bg-slate-100 text-slate-900" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                      it.disabled ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    onPress={() => !it.disabled && setActive(it.key)}
                  >
                    <Icon icon={it.icon} className={`text-[18px] ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                    <span className="text-[14px]">{it.label}</span>
                    {it.premium && (
                      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        PRO
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / User Profile */}
      <div className="mt-4 space-y-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-900">
            <Icon icon="lucide:zap" className="text-amber-500" />
            <span>Free Plan</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-[70%] rounded-full bg-slate-900"></div>
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>70% used</span>
            <span className="hover:underline cursor-pointer">Upgrade</span>
          </div>
        </div>
        
        <Divider className="my-2" />
        
        <div className="flex items-center gap-3 px-2 transition-opacity hover:opacity-80 cursor-pointer">
          <Avatar
            src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
            size="sm"
            isBordered
            className="ring-2 ring-offset-2 ring-offset-white ring-slate-200"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">Shunsuke</span>
            <span className="text-[10px] text-slate-500">Admin Workspace</span>
          </div>
          <Icon icon="lucide:chevron-right" className="ml-auto text-slate-400 text-xs" />
        </div>
      </div>
    </aside>
  );
};
