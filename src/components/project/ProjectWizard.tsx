"use client";
import { useState } from "react";
import { Sparkles, ChevronLeft, X, Loader2, ArrowRight, Database, Plus } from "lucide-react";
import { Btn, Input } from "@/components/ui";

interface Option { label: string; hint?: string }
interface Step { question: string; options: Option[]; canFinish: boolean }
interface PlanColumn { name: string; type: string; description?: string }
interface PlanTable { name: string; description?: string; columns?: PlanColumn[] }
interface Plan { name: string; genre: string; description: string; tables: PlanTable[] }

// 계약 §1: RPG 6종 (코드·라벨·힌트). L1 카드는 이 6개 그대로, 순서 유지, 2열 그리드.
const GENRES: { code: string; label: string; hint: string }[] = [
  { code: "collection_rpg", label: "수집형 RPG", hint: "캐릭터 수집·가챠·성장" },
  { code: "idle_rpg", label: "방치형 RPG", hint: "자동 전투·방치 보상·경제" },
  { code: "mmorpg", label: "MMORPG", hint: "직업·장비 강화·던전·거래소" },
  { code: "battle_rpg", label: "턴제/액션 RPG", hint: "속성 상성·스킬·챕터" },
  { code: "roguelike_rpg", label: "로그라이크 RPG", hint: "런/층 스케일링·아이템 시너지" },
  { code: "srpg", label: "SRPG (전략)", hint: "유닛 성장률·무기 상성·그리드" },
];

// 계약 §4: 장르별 ★ 주력 시뮬 요약 (plan 미리보기 안내용)
const SIM_SUMMARY: Record<string, string[]> = {
  collection_rpg: ["가챠", "전투", "스탯 계산기"],
  idle_rpg: ["경제+인플레이션", "난이도/플레이타임"],
  mmorpg: ["경제+인플레이션", "DPS 분산(레이드)", "PvP 승률 매트릭스"],
  battle_rpg: ["전투", "스탯 계산기", "DPS 분산", "난이도/플레이타임"],
  roguelike_rpg: ["전투(런)", "DPS 분산(빌드)", "난이도(층)"],
  srpg: ["전투", "스탯 계산기", "난이도/플레이타임"],
};

const L1_QUESTION = "어떤 장르의 게임인가요?";

export function ProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const [step, setStep] = useState<Step | null>(null);
  const [genre, setGenre] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [stack, setStack] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // genreCode: L1 카드 클릭 시 명시 전달(같은 핸들러에서 state는 아직 반영 전이므로).
  const pick = async (label: string, genreCode?: string) => {
    const g = genreCode ?? genre;
    const newPath = [...path, label];
    setLoading(true); setError(null);
    try {
      const d = await fetch("/api/genre-wizard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choices: newPath, genre: g }) }).then((r) => r.json());
      if (d.error || d.type !== "choices") throw new Error(d.error ?? "");
      if (genreCode) setGenre(genreCode);
      if (step) setStack((s) => [...s, step]);
      setPath(newPath);
      setStep({ question: d.question, options: d.options ?? [], canFinish: !!d.canFinish });
    } catch { setError("선택지를 불러오지 못했습니다. 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const back = () => {
    if (plan) { setPlan(null); return; }
    if (stack.length === 0) {
      // L1(장르 선택)으로 복귀
      setPath([]); setGenre(""); setStep(null); return;
    }
    setPath((p) => p.slice(0, -1));
    setStep(stack[stack.length - 1]);
    setStack((s) => s.slice(0, -1));
  };

  const finish = async () => {
    setLoading(true); setError(null);
    try {
      const d = await fetch("/api/genre-wizard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choices: path, finish: true, genre }) }).then((r) => r.json());
      if (d.error || d.type !== "plan") throw new Error(d.error ?? "");
      setPlan(d); setName(d.name ?? "");
    } catch { setError("컨셉 생성에 실패했습니다. 다시 시도해주세요."); }
    finally { setLoading(false); }
  };

  const create = async () => {
    if (!name.trim() || !plan) return;
    setCreating(true);
    const p = await fetch("/api/projects/scaffold", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...plan, name: name.trim(), genre }) }).then((r) => r.json());
    setCreating(false);
    if (p?.id) onCreated(p.id, p.name);
    else setError("생성에 실패했습니다.");
  };

  // plan.genre 는 backend가 코드로 덮어쓰므로(라인 343-344) 라벨 표시는 GENRES 조회로.
  const genreLabel = GENRES.find((g) => g.code === genre)?.label ?? plan?.genre ?? "";

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
                <div className="text-[10px] text-[#c4b5fd] mt-2">{genreLabel}</div>
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
              {SIM_SUMMARY[genre] && (
                <div>
                  <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">주력 시뮬레이션</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SIM_SUMMARY[genre].map((s, i) => (
                      <span key={s} className={`text-[10px] px-2 py-0.5 rounded-md border ${i === 0 ? "bg-[#15101f] border-[#2d1b4d] text-[#c4b5fd]" : "bg-[#0f0f10] border-[#2a2a2f] text-[#6b6b77]"}`}>
                        {s}{i === 0 ? " ★" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="text-[13px] font-medium text-[#ededed] mb-3">{step ? step.question : L1_QUESTION}</div>
              <div className="grid grid-cols-2 gap-2">
                {step
                  ? step.options.map((o) => (
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
                    ))
                  : GENRES.map((g) => (
                      <button
                        key={g.code}
                        onClick={() => pick(g.label, g.code)}
                        className="text-left bg-[#0f0f10] border border-[#2a2a2f] rounded-xl px-3.5 py-3 hover:border-[#7c3aed]/50 hover:bg-[#1a1a1c] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-[#ededed]">{g.label}</span>
                          <ArrowRight size={12} className="text-[#3a3a42] group-hover:text-[#8b5cf6] transition-colors" />
                        </div>
                        <div className="text-[10px] text-[#6b6b77] mt-0.5 leading-relaxed">{g.hint}</div>
                      </button>
                    ))}
              </div>

              {error && <div className="text-[11px] text-[#f87171] mt-3">{error}</div>}

              <div className="flex justify-between pt-4">
                <Btn disabled={path.length === 0} onClick={back}><ChevronLeft size={11} />뒤로</Btn>
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
