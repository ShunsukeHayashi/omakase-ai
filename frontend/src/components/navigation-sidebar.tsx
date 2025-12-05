import React from "react";
    import { Button, Divider } from "@heroui/react";
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
        <aside className="sticky top-8 h-fit rounded-medium border border-default-200 bg-content1 p-3">
          {sections.map((sec, idx) => (
            <div key={sec.header} className={idx > 0 ? "mt-3" : ""}>
              <div className="px-2 pb-2 pt-1 text-tiny font-medium tracking-wide text-foreground-500">
                {sec.header}
              </div>
              <div className="flex flex-col gap-1">
                {sec.items.map((it) => {
                  const isActive = active === it.key;
                  return (
                    <Button
                      key={it.key}
                      variant="flat"
                      color="default"
                      size="md"
                      fullWidth
                      isDisabled={it.disabled}
                      className={[
                        "justify-start gap-2 transition-all duration-200",
                        isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "",
                        it.disabled ? "opacity-60" : "",
                      ].join(" ")}
                      onPress={() => !it.disabled && setActive(it.key)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon icon={it.icon} className="text-[18px]" />
                      <span className="text-[15px]">{it.label}</span>
                      {it.premium && <span className="ml-auto text-tiny text-foreground-500">Pro</span>}
                    </Button>
                  );
                })}
              </div>
              {idx < sections.length - 1 && <Divider className="my-3" />}
            </div>
          ))}
        </aside>
      );
    };