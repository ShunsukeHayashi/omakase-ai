import React from "react";

    export const GradientHero = () => {
      return (
        <div className="relative h-[520px] overflow-hidden rounded-large border border-white/10 bg-[#0B0B0C]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-12 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-[60px]"></div>
            <div className="absolute right-10 top-24 h-56 w-56 rounded-full bg-cyan-500/20 blur-[70px]"></div>
            <div className="absolute bottom-8 left-1/2 h-48 w-[70%] -translate-x-1/2 rounded-[80px] bg-gradient-to-r from-fuchsia-500/30 via-cyan-400/30 to-fuchsia-500/30 blur-[40px]"></div>
          </div>

          <div className="relative z-10 flex h-full flex-col items-start justify-center px-8">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-[32px]">
              あなたのサイトに「AI接客員」を。
            </h1>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-foreground-500">
              あなたのWebサイトにAIアシスタントを導入して、訪問者の体験を向上。高度な自然言語対応で、案内・提案・コンバージョンを自動化します。
            </p>

            <div className="mt-10 h-[220px] w-full rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.15),_transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(34,211,238,0.12),_transparent_60%)]">
              <div className="relative h-full w-full">
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2">
                  <div className="h-[2px] w-full bg-gradient-to-r from-fuchsia-500/70 via-cyan-400/70 to-fuchsia-500/70 blur-[2px]"></div>
                  <div className="mt-3 h-[2px] w-full rotate-[-7deg] bg-gradient-to-r from-cyan-400/60 via-fuchsia-500/60 to-cyan-400/60 blur-[2px]"></div>
                  <div className="mt-3 h-[2px] w-full rotate-[8deg] bg-gradient-to-r from-fuchsia-500/60 via-cyan-400/60 to-fuchsia-500/60 blur-[2px]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 rounded-large ring-1 ring-white/5"></div>
        </div>
      );
    };