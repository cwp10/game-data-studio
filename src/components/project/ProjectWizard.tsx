"use client";
import { useState } from "react";
import { Sparkles, X, Plus, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Btn, Input } from "@/components/ui";
import { GENRES, SEED_TEMPLATES } from "@/lib/genre-seeds";

interface StepDef {
  question: string;
  options: { label: string; hint: string }[];
}

const PREDEFINED_STEPS: StepDef[] = [
  {
    question: "핵심 성장 구조는 무엇인가요?",
    options: [
      { label: "레벨 성장", hint: "XP·레벨업·스탯 증가" },
      { label: "장비·강화", hint: "장비 파밍·강화·세공" },
      { label: "스킬 트리", hint: "스킬 포인트·분기 성장" },
      { label: "수집·합성", hint: "캐릭터 수집·진화·합성" },
    ],
  },
  {
    question: "전투 방식은 무엇인가요?",
    options: [
      { label: "자동 전투", hint: "방치·오프라인 진행" },
      { label: "턴제", hint: "행동 순서·전략적 선택" },
      { label: "실시간 액션", hint: "즉각 조작·스킬 타이밍" },
      { label: "전략 배치", hint: "그리드·유닛 포지셔닝" },
    ],
  },
  {
    question: "핵심 콘텐츠는 무엇인가요?",
    options: [
      { label: "스토리·챕터", hint: "메인 퀘스트·서사 중심" },
      { label: "던전·레이드", hint: "파티 플레이·보스 전투" },
      { label: "PvP·경쟁", hint: "랭킹·아레나·토너먼트" },
      { label: "길드·협력", hint: "협력 콘텐츠·공성전" },
    ],
  },
  {
    question: "경제 시스템을 선택하세요",
    options: [
      { label: "가챠·뽑기", hint: "확률형 아이템·천장 시스템" },
      { label: "시즌 패스", hint: "기간 한정 보상·배틀패스" },
      { label: "아이템 거래", hint: "유저 간 거래·경매장" },
      { label: "직접 구매", hint: "상점·꾸미기·확장팩" },
    ],
  },
];

// 0 = 장르, 1~N = PREDEFINED_STEPS, N+1 = 이름 입력
const TOTAL_SELECTION_STEPS = 1 + PREDEFINED_STEPS.length; // 5

const STEP_LABELS = ["성장", "전투", "콘텐츠", "경제"];

export function ProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [genreSelections, setGenreSelections] = useState<string[]>([]);
  const [stepSelections, setStepSelections] = useState<string[][]>(
    PREDEFINED_STEPS.map(() => [])
  );
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNameStep = stepIndex === TOTAL_SELECTION_STEPS;

  const toggleGenre = (code: string) => {
    setGenreSelections((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleOption = (label: string, sIdx: number) => {
    setStepSelections((prev) => {
      const next = prev.map((s) => [...s]);
      next[sIdx] = next[sIdx].includes(label)
        ? next[sIdx].filter((l) => l !== label)
        : [...next[sIdx], label];
      return next;
    });
  };

  const next = () => {
    if (stepIndex === 0 && genreSelections.length === 0) return;
    if (isNameStep) return;
    // 이름 단계 진입 직전: 이름 자동 제안
    if (stepIndex === TOTAL_SELECTION_STEPS - 1) {
      const labels = genreSelections.map((c) => GENRES.find((g) => g.code === c)?.label ?? c);
      setName(genreSelections.length === 1 ? `${labels[0]} 프로젝트` : "하이브리드 RPG 프로젝트");
    }
    setStepIndex((i) => i + 1);
  };

  const back = () => {
    if (stepIndex === 0) return;
    setError(null);
    setStepIndex((i) => i - 1);
  };

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true); setError(null);
    const genreDisplay = genreSelections
      .map((c) => GENRES.find((g) => g.code === c)?.label ?? c)
      .join(" + ");
    const descParts = stepSelections
      .map((ss, i) => ss.length > 0 ? `${STEP_LABELS[i]}: ${ss.join("·")}` : null)
      .filter(Boolean);
    const p = await fetch("/api/projects/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        genre: genreDisplay,
        description: descParts.length > 0 ? descParts.join(" | ") : undefined,
        genreCodes: genreSelections,
      }),
    }).then((r) => r.json());
    setCreating(false);
    if (p?.id) onCreated(p.id, p.name);
    else setError("생성에 실패했습니다.");
  };

  const tableCount = new Set(
    genreSelections.flatMap((c) => (SEED_TEMPLATES[c] ?? []).map((t) => t.name))
  ).size;

  const genreChip = genreSelections
    .map((c) => (GENRES.find((g) => g.code === c)?.label ?? c).replace(" RPG", "").replace(" (전략)", ""))
    .join(" + ");

  const curSelections = stepIndex > 0 && !isNameStep ? stepSelections[stepIndex - 1] : [];
  const canNext = stepIndex === 0 ? genreSelections.length > 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-2xl shadow-2xl w-[640px] max-w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="px-5 py-3.5 border-b border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-[#8b5cf6] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#ededed] flex-shrink-0">새 프로젝트</span>
            {genreSelections.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30 flex-shrink-0 max-w-[200px] truncate">
                {genreChip}
              </span>
            )}
          </div>
          {/* 진행 도트 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              {Array.from({ length: TOTAL_SELECTION_STEPS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === stepIndex
                      ? "w-4 h-1.5 bg-[#8b5cf6]"
                      : i < stepIndex
                      ? "w-1.5 h-1.5 bg-[#5b21b6]/60"
                      : "w-1.5 h-1.5 bg-[#2a2a2f]"
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-[#6b6b77] hover:text-[#ededed] p-1"><X size={15} /></button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-5">

          {/* ── Step 0: 장르 ── */}
          {stepIndex === 0 && (
            <div>
              <div className="text-[13px] font-medium text-[#ededed] mb-1">어떤 장르의 게임인가요?</div>
              <div className="text-[11px] text-[#4a4a55] mb-4">장르를 기반으로 기본 테이블 뼈대가 결정됩니다. 복수 선택 가능.</div>
              <div className="grid grid-cols-2 gap-2.5">
                {GENRES.map((g) => {
                  const isSelected = genreSelections.includes(g.code);
                  const tc = (SEED_TEMPLATES[g.code] ?? []).length;
                  return (
                    <button
                      key={g.code}
                      onClick={() => toggleGenre(g.code)}
                      className={`text-left rounded-xl px-4 py-4 transition-all border ${
                        isSelected ? "bg-[#16101f] border-[#7c3aed]" : "bg-[#0f0f10] border-[#2a2a2f] hover:border-[#7c3aed]/50 hover:bg-[#1a1a1c]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#ededed] leading-tight">{g.label}</span>
                        {isSelected
                          ? <Check size={14} className="text-[#8b5cf6] flex-shrink-0 mt-0.5" />
                          : <span className="text-[10px] text-[#3a3a42] flex-shrink-0 mt-0.5 tabular-nums">{tc}테이블</span>
                        }
                      </div>
                      <div className="text-[11px] text-[#6b6b77] leading-relaxed">{g.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 1~N: 사전 정의 단계 ── */}
          {stepIndex > 0 && !isNameStep && (
            <div>
              <div className="text-[13px] font-medium text-[#ededed] mb-1">
                {PREDEFINED_STEPS[stepIndex - 1].question}
              </div>
              <div className="text-[11px] text-[#4a4a55] mb-4">복수 선택 가능. 건너뛰어도 됩니다.</div>
              <div className="grid grid-cols-2 gap-2.5">
                {PREDEFINED_STEPS[stepIndex - 1].options.map((o) => {
                  const isSelected = curSelections.includes(o.label);
                  return (
                    <button
                      key={o.label}
                      onClick={() => toggleOption(o.label, stepIndex - 1)}
                      className={`text-left rounded-xl px-4 py-4 transition-all border ${
                        isSelected ? "bg-[#16101f] border-[#7c3aed]" : "bg-[#0f0f10] border-[#2a2a2f] hover:border-[#7c3aed]/50 hover:bg-[#1a1a1c]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#ededed] leading-tight">{o.label}</span>
                        {isSelected && <Check size={14} className="text-[#8b5cf6] flex-shrink-0 mt-0.5" />}
                      </div>
                      <div className="text-[11px] text-[#6b6b77] leading-relaxed">{o.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 이름 입력 (마지막) ── */}
          {isNameStep && (
            <div className="space-y-4">
              <div>
                <div className="text-[13px] font-medium text-[#ededed] mb-1">프로젝트 이름을 정해주세요</div>
                <div className="text-[11px] text-[#4a4a55] mb-3">
                  장르 기반 {tableCount}개 테이블이 즉시 생성됩니다.
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="프로젝트 이름"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && !creating && name.trim() && create()}
                />
              </div>

              {/* 선택 요약 */}
              <div>
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">선택 요약</div>
                <div className="flex flex-wrap gap-1.5">
                  {genreSelections.map((c) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30">
                      {GENRES.find((g) => g.code === c)?.label}
                    </span>
                  ))}
                  {stepSelections.flatMap((ss, i) => ss.map((label) => ({ label, i }))).map(({ label, i }) => (
                    <span key={`${i}-${label}`} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f0f10] text-[#6b6b77] border border-[#2a2a2f]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {error && <div className="text-[11px] text-[#f87171]">{error}</div>}
            </div>
          )}

        </div>

        {/* 하단 네비게이션 */}
        <div className="px-5 py-3 border-t border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
          <Btn disabled={stepIndex === 0} onClick={back}>
            <ChevronLeft size={11} />뒤로
          </Btn>
          <div className="flex gap-2">
            {!isNameStep && (
              <Btn variant="primary" disabled={!canNext} onClick={next}>
                {stepIndex === TOTAL_SELECTION_STEPS - 1 ? "이름 입력" : "다음"}
                <ChevronRight size={11} />
              </Btn>
            )}
            {isNameStep && (
              <Btn variant="primary" onClick={create} disabled={creating || !name.trim()}>
                {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {creating ? "생성 중…" : `기본 뼈대 생성 (${tableCount}테이블)`}
              </Btn>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
