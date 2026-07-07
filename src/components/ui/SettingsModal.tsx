"use client";
import { useEffect, useState } from "react";
import { X, Bot, Terminal, CheckCircle2, AlertCircle } from "lucide-react";
import type { AIProvider, AppSettings } from "@/lib/settings";

const PROVIDERS: { id: AIProvider; label: string; sub: string; icon: string }[] = [
  { id: "claude", label: "Claude CLI", sub: "Anthropic · claude 바이너리", icon: "🤖" },
  { id: "codex",  label: "Codex CLI",  sub: "OpenAI · codex 바이너리",    icon: "⚡" },
];

const CODEX_MODELS = ["gpt-4o", "gpt-4o-mini", "o4-mini", "o3"];

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>({ aiProvider: "claude", codexModel: "gpt-4o" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: AppSettings) => setSettings(s))
      .catch(() => {});
    setSaved(false);
  }, [open]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#16161a] border border-[#2a2a2f] rounded-2xl shadow-2xl w-[440px] max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2f]">
          <span className="text-[14px] font-semibold text-[#ededed]">설정</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2a2a2f] text-[#6b6b77] hover:text-[#ededed] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* AI 제공자 */}
          <section>
            <div className="text-[11px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-3">AI 제공자</div>
            <div className="space-y-2">
              {PROVIDERS.map((p) => {
                const selected = settings.aiProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSettings((s) => ({ ...s, aiProvider: p.id }))}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-[#7c3aed] bg-[#7c3aed]/10"
                        : "border-[#2a2a2f] bg-[#1a1a1f] hover:border-[#3a3a4f] hover:bg-[#1e1e24]"
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium ${selected ? "text-[#c4b5fd]" : "text-[#ededed]"}`}>{p.label}</div>
                      <div className="text-[11px] text-[#6b6b77] mt-0.5">{p.sub}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? "border-[#7c3aed] bg-[#7c3aed]" : "border-[#3a3a4f]"
                    }`}>
                      {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Codex 모델 선택 (Codex 선택 시만 표시) */}
          {settings.aiProvider === "codex" && (
            <section>
              <div className="text-[11px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-3">Codex 모델</div>
              <div className="grid grid-cols-2 gap-2">
                {CODEX_MODELS.map((m) => {
                  const selected = settings.codexModel === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSettings((s) => ({ ...s, codexModel: m }))}
                      className={`px-3 py-2 rounded-lg border text-[12px] font-mono transition-all ${
                        selected
                          ? "border-[#7c3aed] bg-[#7c3aed]/10 text-[#c4b5fd]"
                          : "border-[#2a2a2f] bg-[#1a1a1f] text-[#9a9aa3] hover:border-[#3a3a4f]"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* MCP 설정 안내 */}
              <div className="mt-3 flex gap-2.5 p-3 bg-[#1a1510] border border-[#3d2e00] rounded-xl">
                <AlertCircle size={14} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#d4a647] leading-relaxed">
                  Codex CLI 사용 시 MCP 서버를 <span className="font-mono">~/.codex/config.toml</span>에 수동 등록해야 합니다.
                  <br />
                  <span className="text-[#9a7a3a] mt-1 block">
                    [mcp.servers.game-data-studio]<br />
                    command = &quot;node&quot;<br />
                    args = [&quot;--import&quot;, &quot;tsx&quot;, &quot;./src/lib/mcp/server.ts&quot;]
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#2a2a2f]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-[#6b6b77] hover:text-[#9a9aa3] transition-colors"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
              saved
                ? "bg-[#16a34a]/20 border border-[#16a34a]/40 text-[#4ade80]"
                : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white disabled:opacity-50"
            }`}
          >
            {saved ? <><CheckCircle2 size={13} /> 저장됨</> : saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
