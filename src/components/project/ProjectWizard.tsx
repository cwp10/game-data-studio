"use client";
import { useState } from "react";
import { Sparkles, ChevronLeft, X, Loader2, ArrowRight, Database, Plus } from "lucide-react";
import { Btn, Input } from "@/components/ui";

interface Option { label: string; hint?: string }
interface Step { question: string; options: Option[]; canFinish: boolean }
interface PlanColumn { name: string; type: string; description?: string }
interface PlanTable { name: string; description?: string; columns?: PlanColumn[] }
interface Plan { name: string; genre: string; description: string; tables: PlanTable[] }

const L1: Step = {
  question: "어떤 장르의 게임인가요?",
  options: [
    { label: "RPG", hint: "역할수행·성장·전투" },
    { label: "시뮬레이션", hint: "경영·육성·운영" },
    { label: "퍼즐", hint: "논리·매칭·두뇌" },
    { label: "액션", hint: "반응·전투·횡스크롤" },
    { label: "전략", hint: "자원·배치·전술" },
    { label: "방치형/캐주얼", hint: "자동·가벼운 플레이" },
    { label: "교육", hint: "학습·문제·퀴즈" },
    { label: "스포츠", hint: "경기·시즌·선수" },
  ],
  canFinish: false,
};

export function ProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const [step, setStep] = useState<Step>(L1);
  const [path, setPath] = useState<string[]>([]);
  const [stack, setStack] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (label: string) => {
    const newPath = [...path, label];
    setLoading(true); setError(null); setCustom("");
    try {
      const d = await fetch("/api/genre-wizard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choices: newPath }) }).then((r) => r.json());
      if (d.error || d.type !== "choices") throw new Error(d.error ?? "");
      setStack((s) => [...s, step]);
      setPath(newPath);
      setStep({ question: d.question, options: d.options ?? [], canFinish: !!d.canFinish });
    } catch { setError("선택지를 불러오지 못했습니다. 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const back = () => {
    if (plan) { setPlan(null); return; }
    if (stack.length === 0) return;
    setPath((p) => p.slice(0, -1));
    setStep(stack[stack.length - 1]);
    setStack((s) => s.slice(0, -1));
  };

  const finish = async () => {
    setLoading(true); setError(null);
    try {
      const d = await fetch("/api/genre-wizard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choices: path, finish: true }) }).then((r) => r.json());
      if (d.error || d.type !== "plan") throw new Error(d.error ?? "");
      setPlan(d); setName(d.name ?? "");
    } catch { setError("컨셉 생성에 실패했습니다. 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const create = async () => {
    if (!name.trim() || !plan) return;
    setCreating(true);
    const p = await fetch("/api/projects/scaffold", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...plan, name: name.trim() }) }).then((r) => r.json());
    setCreating(false);
    if (p?.id) onCreated(p.id, p.name);
    else setError("생성에 실패했습니다.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-2xl shadow-2xl w-[640px] max-w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="px-5 py-3.5 border-b border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-[#8b5cf6] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#ededed]">새 프로젝트</span>
            {path.length > 0 && (
              <span className="text-[11px] text-[#6b6b77] truncate">· {path.join(" › ")}</span>
            )}
          </div>
          <button onClick={onClose} className="text-[#6b6b77] hover:text-[#ededed] p-1"><X size={15} /></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#6b6b77]">
              <Loader2 size={22} className="animate-spin text-[#8b5cf6]" />
              <span className="text-[12px]">AI가 다음 선택지를 구성하는 중…</span>
            </div>
          ) : plan ? (
            /* 플랜 미리보기 */
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">제안된 컨셉</div>
                <div className="text-[11px] text-[#6b6b77] mb-1">프로젝트명</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <div className="text-[10px] text-[#c4b5fd] mt-2">{plan.genre}</div>
                <div className="text-[12px] text-[#9a9aa3] leading-relaxed mt-1.5">{plan.description}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">생성될 스키마 · 테이블 {plan.tables.length}개</div>
                <div className="space-y-1.5">
                  {plan.tables.map((t) => (
                    <div key={t.name} className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Database size={11} className="text-[#8b5cf6]" />
                        <span className="text-[12px] font-medium text-[#ededed]">{t.name}</span>
                        <span className="text-[10px] text-[#4a4a55]">{t.columns?.length ?? 0}컬럼</span>
                      </div>
                      {t.columns && t.columns.length > 0 && (
                        <div className="text-[10px] text-[#6b6b77] mt-1 truncate">{t.columns.map((c) => c.name).join(", ")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {error && <div className="text-[11px] text-[#f87171]">{error}</div>}
              <div className="flex justify-between pt-1">
                <Btn onClick={back}><ChevronLeft size={11} />뒤로</Btn>
                <Btn variant="primary" onClick={create} disabled={creating || !name.trim()}>
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}{creating ? "생성 중…" : "이 컨셉으로 생성"}
                </Btn>
              </div>
            </div>
          ) : (
            /* 선택 단계 */
            <div>
              <div className="text-[13px] font-medium text-[#ededed] mb-3">{step.question}</div>
              <div className="grid grid-cols-2 gap-2">
                {step.options.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => pick(o.label)}
                    className="text-left bg-[#0f0f10] border border-[#2a2a2f] rounded-xl px-3.5 py-3 hover:border-[#7c3aed]/50 hover:bg-[#1a1a1c] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[#ededed]">{o.label}</span>
                      <ArrowRight size={12} className="text-[#3a3a42] group-hover:text-[#8b5cf6] transition-colors" />
                    </div>
                    {o.hint && <div className="text-[10px] text-[#6b6b77] mt-0.5 leading-relaxed">{o.hint}</div>}
                  </button>
                ))}
              </div>

              {/* 직접 입력 */}
              <div className="flex gap-2 mt-3">
                <Input placeholder="직접 입력 (예: 디펜스, 리듬…)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) pick(custom.trim()); }} />
                <Btn disabled={!custom.trim()} onClick={() => pick(custom.trim())}>추가</Btn>
              </div>

              {error && <div className="text-[11px] text-[#f87171] mt-3">{error}</div>}

              <div className="flex justify-between pt-4">
                <Btn disabled={stack.length === 0} onClick={back}><ChevronLeft size={11} />뒤로</Btn>
                {path.length > 0 && (
                  <Btn variant="primary" onClick={finish}><Sparkles size={11} />이 컨셉으로 만들기</Btn>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
