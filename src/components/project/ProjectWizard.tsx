"use client";
import { useState } from "react";
import { Sparkles, X, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Btn, Input } from "@/components/ui";
import { GENRES } from "@/lib/genre-seeds";
import { FEATURE_GROUPS, getTableCountPreview } from "@/lib/game-patterns/modules";

type ProposalColumn = { name: string; type: string; description?: string; enum_type_name?: string };
type ProposalTable = { name: string; description?: string; columns?: ProposalColumn[]; rows?: Record<string, unknown>[] };
type EnumTypeDef = { name: string; values: string[] };
type RelationDef = { from_table: string; from_column: string; to_table: string; to_column: string };
type Proposal = {
  tables: ProposalTable[];
  enumTypes?: EnumTypeDef[];
  relations?: RelationDef[];
  baseTables?: string[];
  overlayTables?: string[];
};

export function ProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [tableChecks, setTableChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const genreLabel = GENRES.find((g) => g.code === selectedBase)?.label ?? selectedBase;
  const preview = selectedBase ? getTableCountPreview(selectedBase, selectedFeatures) : null;

  const fetchProposal = async () => {
    setLoading(true);
    setError(null);
    setStep(2);
    try {
      const res = await fetch("/api/keyword-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseGenre: selectedBase, features: selectedFeatures }),
      });
      const data: Proposal = await res.json();
      if (!data.tables) throw new Error("제안 생성 실패");
      setProposal(data);
      const checks: Record<string, boolean> = {};
      data.tables.forEach((t) => { checks[t.name] = true; });
      setTableChecks(checks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const createEmpty = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const p = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      }).then((r) => r.json());
      if (p?.id) onCreated(p.id, p.name);
      else setError("생성에 실패했습니다.");
    } catch {
      setError("생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const create = async () => {
    if (!name.trim() || !proposal) return;
    setCreating(true);
    setError(null);
    try {
      const selectedTables = proposal.tables.filter((t) => tableChecks[t.name]);
      const p = await fetch("/api/projects/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          genre: selectedBase,
          tables: selectedTables,
          enumTypes: proposal.enumTypes ?? [],
          relations: proposal.relations ?? [],
        }),
      }).then((r) => r.json());
      if (p?.id) onCreated(p.id, p.name);
      else setError("생성에 실패했습니다.");
    } catch {
      setError("생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const toggleTable = (tableName: string) => {
    setTableChecks((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const checkedCount = proposal ? proposal.tables.filter((t) => tableChecks[t.name]).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-2xl shadow-2xl w-[640px] max-w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="px-5 py-3.5 border-b border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-[#8b5cf6] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-[#ededed] flex-shrink-0">새 프로젝트</span>
            {step > 0 && selectedBase && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30 flex-shrink-0 max-w-[260px] truncate">
                {genreLabel}
                {selectedFeatures.length > 0 && ` + 기능 ${selectedFeatures.length}개`}
              </span>
            )}
          </div>
          {/* 진행 도트 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === step
                      ? "w-4 h-1.5 bg-[#8b5cf6]"
                      : i < step
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

          {/* ── Step 0: 이름 입력 ── */}
          {step === 0 && (
            <div>
              <div className="text-[13px] font-medium text-[#ededed] mb-1">프로젝트 이름을 입력하세요</div>
              <div className="text-[11px] text-[#4a4a55] mb-4">나중에 언제든 변경할 수 있습니다.</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="프로젝트 이름"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(1)}
              />
            </div>
          )}

          {/* ── Step 1: 베이스 장르 + 기능 오버레이 ── */}
          {step === 1 && (
            <div>
              {/* 베이스 장르 */}
              <div className="text-[13px] font-medium text-[#ededed] mb-1">
                베이스 장르를 선택하세요 <span className="text-[#8b5cf6]">●</span>
                <span className="text-[11px] text-[#4a4a55] font-normal ml-1">1개 필수</span>
              </div>
              <div className="text-[11px] text-[#4a4a55] mb-4">선택한 장르의 핵심 테이블 구조로 데이터 모델을 설계합니다.</div>
              <div className="grid grid-cols-3 gap-2">
                {GENRES.map((g) => {
                  const isSelected = selectedBase === g.code;
                  return (
                    <button
                      key={g.code}
                      onClick={() => setSelectedBase(g.code)}
                      className={`text-left rounded-xl px-3 py-2.5 border transition-colors ${
                        isSelected
                          ? "border-[#7c3aed] bg-[#1e1b4b]"
                          : "border-[#2a2a2f] bg-[#0f0f10] hover:border-[#7c3aed]/50"
                      }`}
                    >
                      <div className={`text-[12px] font-semibold ${isSelected ? "text-[#ededed]" : "text-[#9a9aa3]"}`}>{g.label}</div>
                      <div className="text-[10px] text-[#4a4a55] leading-relaxed mt-0.5">{g.hint}</div>
                    </button>
                  );
                })}
              </div>

              {/* 구분선 + 기능 오버레이 */}
              <div className="flex items-center gap-3 mt-6 mb-4">
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest flex-shrink-0">기능 추가 (선택사항)</div>
                <div className="flex-1 h-px bg-[#2a2a2f]" />
              </div>
              <div className="space-y-4">
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">{group.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {group.keys.map((key) => {
                        const isSelected = selectedFeatures.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleFeature(key)}
                            className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                              isSelected
                                ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]"
                                : "bg-[#0f0f10] border-[#2a2a2f] text-[#6b6b77] hover:border-[#7c3aed]/50"
                            }`}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 미리보기 */}
              {preview && (
                <div className="mt-6 pt-4 border-t border-[#2a2a2f] text-[11px] text-[#9a9aa3]">
                  예상 테이블: 베이스 <span className="text-[#c4b5fd] font-medium">{preview.base}개</span>
                  {preview.overlay > 0 && (
                    <> + 오버레이 <span className="text-[#6ee7b7] font-medium">{preview.overlay}개</span></>
                  )}
                  {" = 총 "}
                  <span className="text-[#ededed] font-medium">{preview.base + preview.overlay}개</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: AI 제안 ── */}
          {step === 2 && (
            <div>
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Loader2 size={28} className="text-[#8b5cf6] animate-spin" />
                  <div className="text-[12px] text-[#9a9aa3]">AI가 테이블 구조를 설계하고 있습니다…</div>
                </div>
              )}

              {!loading && proposal && (
                <div>
                  <div className="text-[13px] font-medium text-[#ededed] mb-3">
                    AI 제안 테이블 ({checkedCount}/{proposal.tables.length}개 선택됨)
                  </div>
                  <div className="space-y-2">
                    {proposal.tables.map((t) => {
                      const checked = !!tableChecks[t.name];
                      const cols = t.columns ?? [];
                      const shown = cols.slice(0, 5);
                      const extra = cols.length - shown.length;
                      const isBase = proposal.baseTables?.includes(t.name);
                      const isOverlay = proposal.overlayTables?.includes(t.name);
                      return (
                        <button
                          key={t.name}
                          onClick={() => toggleTable(t.name)}
                          className={`w-full text-left rounded-xl px-4 py-3 transition-all border ${
                            checked ? "bg-[#16101f] border-[#7c3aed]" : "bg-[#0f0f10] border-[#2a2a2f] hover:border-[#7c3aed]/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                              checked ? "bg-[#7c3aed] border-[#7c3aed]" : "border-[#3a3a42] bg-transparent"
                            }`}>
                              {checked && <Check size={11} className="text-white" />}
                            </span>
                            <span className="text-[13px] font-semibold text-[#ededed]">{t.name}</span>
                            <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                              {isBase && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2040] text-[#93c5fd]">베이스</span>
                              )}
                              {isOverlay && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2e1a] text-[#6ee7b7]">오버레이</span>
                              )}
                              {t.rows && t.rows.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2e1a] text-[#6ee7b7] border border-[#166534]/40">
                                  예시 {t.rows.length}행
                                </span>
                              )}
                            </span>
                          </div>
                          {t.description && (
                            <div className="text-[11px] text-[#6b6b77] leading-relaxed ml-6 mb-1">{t.description}</div>
                          )}
                          {shown.length > 0 && (
                            <div className="text-[10px] text-[#4a4a55] ml-6 leading-relaxed">
                              컬럼: {shown.map((c) => `${c.name}(${c.type})`).join(", ")}
                              {extra > 0 && <span className="text-[#6b6b77]"> +{extra}개 더</span>}
                            </div>
                          )}
                          {proposal.enumTypes && proposal.enumTypes.length > 0 && (
                            <div className="text-[10px] text-[#4a4a55] ml-6 mt-1 flex flex-wrap gap-1">
                              {t.columns?.filter((c) => c.type === "enum" && c.enum_type_name).map((c) => {
                                const et = proposal.enumTypes!.find((e) => e.name === c.enum_type_name);
                                return et ? (
                                  <span key={c.name} className="px-1.5 py-0.5 rounded bg-[#1e1b4b] text-[#c4b5fd] border border-[#7c3aed]/30">
                                    {c.name}: {et.values.slice(0, 4).join("/")}
                                    {et.values.length > 4 ? "…" : ""}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {proposal.relations && proposal.relations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#2a2a2f]">
                      <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">
                        자동 관계 {proposal.relations.length}개
                      </div>
                      <div className="flex flex-col gap-1">
                        {proposal.relations.map((r, i) => (
                          <div key={i} className="text-[10px] text-[#6b6b77] flex items-center gap-1.5">
                            <span className="text-[#4a4a55]">{r.from_table}.{r.from_column}</span>
                            <span className="text-[#3a3a42]">→</span>
                            <span className="text-[#4a4a55]">{r.to_table}.{r.to_column}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div className="text-[11px] text-[#f87171] mt-4">{error}</div>}

        </div>

        {/* 하단 네비게이션 */}
        <div className="px-5 py-3 border-t border-[#2a2a2f] flex items-center justify-between flex-shrink-0">
          <div>
            {step === 0 && (
              <Btn disabled={!name.trim() || creating} onClick={createEmpty}>
                {creating ? <Loader2 size={11} className="animate-spin" /> : null}
                빈 테이블로 바로 시작
              </Btn>
            )}
            {step === 1 && (
              <Btn onClick={() => setStep(0)}>
                <ChevronLeft size={11} />뒤로
              </Btn>
            )}
            {step === 2 && !loading && proposal && (
              <Btn onClick={() => setStep(1)}>
                <ChevronLeft size={11} />장르 다시 선택
              </Btn>
            )}
          </div>
          <div className="flex gap-2">
            {step === 0 && (
              <Btn variant="primary" disabled={!name.trim()} onClick={() => setStep(1)}>
                다음<ChevronRight size={11} />
              </Btn>
            )}
            {step === 1 && (
              <Btn variant="primary" disabled={!selectedBase} onClick={fetchProposal}>
                AI 제안 받기<Sparkles size={11} />
              </Btn>
            )}
            {step === 2 && !loading && proposal && (
              <Btn variant="primary" disabled={creating || checkedCount === 0} onClick={create}>
                {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {creating ? "생성 중…" : "이 설계로 생성"}
              </Btn>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
