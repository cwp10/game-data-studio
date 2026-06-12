"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { Column, RowWithData, Skill, Table, Unit, guessCol, num } from "./types";

// 전투 로그의 스킬 이벤트 표시(라벨/배지/행 배경). "attack" 미설정은 기존 공격 행 그대로.
export const SKILL_EVENT_META: Record<"heal" | "invuln" | "revive" | "aoe", { label: string; badge: string; rowBg: string }> = {
  heal:   { label: "회복", badge: "bg-[#0f2a1a] text-[#4ade80]", rowBg: "bg-[#4ade80]/5" },
  invuln: { label: "무적", badge: "bg-[#1e1b4b] text-[#c4b5fd]", rowBg: "bg-[#7c3aed]/5" },
  revive: { label: "부활", badge: "bg-[#0f2a1a] text-[#4ade80]", rowBg: "bg-[#4ade80]/5" },
  aoe:    { label: "광역", badge: "bg-[#3a1c00] text-[#f59e0b]", rowBg: "bg-[#f59e0b]/5" },
};

const SKILL_TYPES: { value: Skill["type"]; label: string }[] = [
  { value: "heal", label: "회복" },
  { value: "invuln", label: "무적" },
  { value: "revive", label: "부활" },
  { value: "aoe", label: "광역" },
];

export function UnitForm({ title, unit, onChange, tables, showSkills }: { title: string; unit: Unit; onChange: (u: Unit) => void; tables: Table[]; showSkills?: boolean }) {
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);

  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => setCols(d.columns ?? []));
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // 행 선택 시 추정 컬럼으로 Unit 프리필
  const prefill = (rid: string) => {
    const row = rows.find((r) => r.id === rid);
    if (!row) return;
    onChange({
      name: String(row.data.name ?? row.data.id ?? "유닛"),
      hp: num(row.data[guessCol(cols, ["hp", "health"])]),
      atk: num(row.data[guessCol(cols, ["atk", "attack", "power"])]),
      def: num(row.data[guessCol(cols, ["def", "defense", "armor"])]),
      speed: num(row.data[guessCol(cols, ["spd", "speed"])]) || 100,
      critRate: num(row.data[guessCol(cols, ["crit_rate", "critrate"])]) / 100 || 0,
      critMult: num(row.data[guessCol(cols, ["crit_dmg", "critmult", "crit_mult"])]) / 100 || 1.5,
    });
  };

  const set = (k: keyof Unit, v: number | string) => onChange({ ...unit, [k]: v });

  const skills = unit.skills ?? [];
  const addSkill = () => onChange({ ...unit, skills: [...skills, { type: "heal", cooldown: 3, value: 1000 }] });
  const setSkill = (i: number, patch: Partial<Skill>) => onChange({ ...unit, skills: skills.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const removeSkill = (i: number) => onChange({ ...unit, skills: skills.filter((_, j) => j !== i) });

  return (
    <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
      <div className="text-[12px] font-semibold text-[#ededed] mb-2.5">{title}</div>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">행에서 불러오기…</option>
          {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value="" onChange={(e) => prefill(e.target.value)} disabled={!tableId}>
          <option value="">— 행 선택 —</option>
          {rows.map((r) => <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <Input placeholder="이름" value={unit.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {([["HP", "hp"], ["ATK", "atk"], ["DEF", "def"], ["속도", "speed"]] as const).map(([label, k]) => (
            <div key={k}>
              <div className="text-[10px] text-[#6b6b77] mb-1">{label}</div>
              <Input type="number" value={unit[k] as number} onChange={(e) => set(k, Number(e.target.value) || 0)} />
            </div>
          ))}
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1">치명타율 (0~1)</div>
            <Input type="number" step={0.01} min={0} max={1} value={unit.critRate ?? 0} onChange={(e) => set("critRate", Number(e.target.value) || 0)} />
          </div>
          <div>
            <div className="text-[10px] text-[#6b6b77] mb-1">치명타 배율</div>
            <Input type="number" step={0.1} value={unit.critMult ?? 1.5} onChange={(e) => set("critMult", Number(e.target.value) || 1.5)} />
          </div>
        </div>
      </div>
      {showSkills && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2f]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-wide">스킬</div>
            <button onClick={addSkill} className="text-[#6b6b77] hover:text-[#c4b5fd] flex items-center gap-1 text-[11px]"><Plus size={12} />추가</button>
          </div>
          {skills.length === 0 && <div className="text-[11px] text-[#4a4a55]">스킬 없음 (기본 전투)</div>}
          <div className="space-y-2">
            {skills.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">유형</div>
                  <Select value={s.type} onChange={(e) => setSkill(i, { type: e.target.value as Skill["type"] })}>
                    {SKILL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">쿨다운(턴)</div>
                  <Input type="number" min={0} value={s.cooldown} onChange={(e) => setSkill(i, { cooldown: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <div className="text-[10px] text-[#6b6b77] mb-1">값</div>
                  <Input type="number" value={s.value} onChange={(e) => setSkill(i, { value: Number(e.target.value) || 0 })} />
                </div>
                <button onClick={() => removeSkill(i)} className="text-[#6b6b77] hover:text-[#f87171] pb-1.5 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
