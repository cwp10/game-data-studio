"use client";
import { useEffect, useState } from "react";
import {
  Home, Table2, Database, Tags, BarChart2, Play, Coins, NotebookText,
  X, Lightbulb, ChevronRight,
  Plus, Upload, Download, Save, Undo2, Redo2, TrendingUp, Sparkles,
  GitCompare, Link2, Pencil, Trash2, MessageSquare, Eye, StickyNote,
  RotateCcw, Copy, BarChart3, Zap,
} from "lucide-react";
import { type Screen } from "@/app/page";

// ── 인라인 시각 컴포넌트 ─────────────────────────────────────────

function IBtn({ icon: Icon, label, variant = "default" }: {
  icon?: React.ElementType;
  label?: string;
  variant?: "default" | "primary" | "success" | "danger";
}) {
  const cls = {
    default: "bg-[#2a2a3a] border-[#3a3a4a] text-[#c9c9d4]",
    primary: "bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#a78bfa]",
    success: "bg-emerald-900/20 border-emerald-700/40 text-emerald-400",
    danger:  "bg-red-900/20 border-red-800/40 text-red-400",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-[3px] px-1.5 py-[2px] rounded border text-[10px] font-medium align-middle leading-none ${cls}`}>
      {Icon && <Icon size={9} />}
      {label && <span>{label}</span>}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-[2px] rounded bg-[#0f0f10] border border-[#3a3a4a] text-[10px] font-mono text-[#a78bfa] align-middle leading-none">
      {children}
    </kbd>
  );
}

function StepList({ title, items }: {
  title?: string;
  items: { label: React.ReactNode; sub?: React.ReactNode }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-5 h-5 rounded-full bg-[#2a2a3a] border border-[#7c3aed]/50 flex items-center justify-center text-[10px] text-[#8b5cf6] font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#ededed] leading-relaxed">{item.label}</div>
              {item.sub && <div className="text-[11px] text-[#6b6b77] mt-0.5 leading-relaxed">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowDiagram({ title, items }: {
  title?: string;
  items: { icon?: React.ElementType; label: string; desc?: string }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex items-start gap-1 flex-wrap">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#1e1e28] border border-[#2a2a3a]">
                {item.icon && <item.icon size={11} className="text-[#8b5cf6] flex-shrink-0" />}
                <span className="text-[11px] text-[#ededed] whitespace-nowrap">{item.label}</span>
              </div>
              {item.desc && <span className="text-[9px] text-[#6b6b77] text-center px-1">{item.desc}</span>}
            </div>
            {i < items.length - 1 && <ChevronRight size={12} className="text-[#3a3a4a] flex-shrink-0 mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutGrid({ items }: { items: { key: string; desc: string }[] }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">키보드 단축키</div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(({ key, desc }) => (
          <div key={key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <Kbd>{key}</Kbd>
            <span className="text-[11px] text-[#9a9aa3] truncate">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarRow({ title, items }: {
  title?: string;
  items: { icon: React.ElementType; label: string; desc: string }[];
}) {
  return (
    <div className="mb-5">
      {title && <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{title}</div>}
      <div className="flex flex-col divide-y divide-[#1e1e28] rounded-lg border border-[#2a2a3a] overflow-hidden">
        {items.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2 bg-[#16161e]">
            <IBtn icon={Icon} label={label} />
            <span className="text-[11px] text-[#9a9aa3] leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold text-[#6b6b77] uppercase tracking-wider mb-2.5">{children}</div>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-[#22222e] border border-[#2a2a3a] px-3.5 py-3">
      <Lightbulb size={13} className="text-[#d6b34a] flex-shrink-0 mt-0.5" />
      <div className="text-[11px] text-[#c9c9d4] leading-relaxed">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-4 border-t border-[#2a2a3a]" />;
}

// ── 화면별 도움말 콘텐츠 ─────────────────────────────────────────

function HomeContent() {
  return (
    <>
      <FlowDiagram
        title="새 프로젝트 만들기"
        items={[
          { icon: Plus, label: "새 프로젝트 만들기", desc: "버튼 클릭" },
          { icon: Play, label: "장르 선택", desc: "RPG 유형 선택" },
          { label: "이름 입력", desc: "프로젝트명" },
          { icon: Zap, label: "자동 생성 완료", desc: "테이블 생성" },
        ]}
      />
      <Divider />
      <StepList
        title="프로젝트 카드 관리"
        items={[
          {
            label: <>카드를 클릭하면 해당 프로젝트의 <strong className="text-[#ededed]">스키마 화면</strong>으로 이동합니다.</>,
          },
          {
            label: <>카드 우측 <IBtn label="편집" /> 버튼으로 이름을 변경합니다.</>,
          },
          {
            label: <>카드 우측 <IBtn label="삭제" variant="danger" /> 버튼으로 프로젝트를 삭제합니다.</>,
            sub: "삭제 시 모든 테이블·데이터가 함께 제거됩니다.",
          },
        ]}
      />
      <Tip>장르를 선택하면 수집형 RPG·방치형 RPG 등에 맞는 기본 테이블 구조가 자동으로 생성됩니다.</Tip>
    </>
  );
}

function SchemaContent() {
  return (
    <>
      <FlowDiagram
        title="테이블 추가 흐름"
        items={[
          { icon: Plus, label: "+ 버튼", desc: "좌측 패널 상단" },
          { label: "테이블 이름 입력", desc: "모달" },
          { icon: Table2, label: "테이블 생성", desc: "자동으로 id 컬럼 포함" },
          { icon: Plus, label: "컬럼 추가", desc: "하단 행 클릭" },
        ]}
      />
      <Divider />
      <ToolbarRow
        title="스키마 툴바 버튼"
        items={[
          { icon: Link2, label: "관계 설정", desc: "이 테이블의 컬럼을 다른 테이블 FK로 연결합니다." },
          { icon: Download, label: "CSV 내보내기", desc: "이 테이블의 컬럼 목록을 CSV로 내보냅니다." },
        ]}
      />
      <Divider />
      <StepList
        title="컬럼 편집"
        items={[
          {
            label: <>컬럼 행 우측 <IBtn icon={Pencil} label="편집" /> 버튼을 클릭합니다.</>,
            sub: "이름·타입·제약(min/max/필수/고유)을 변경할 수 있습니다.",
          },
          {
            label: <>타입을 <strong className="text-[#ededed]">enum</strong>으로 지정하면 타입 화면에서 선택지를 정의합니다.</>,
          },
          {
            label: <>위/아래 화살표로 컬럼 순서를 변경합니다.</>,
          },
          {
            label: <>우측 × 버튼으로 컬럼을 삭제합니다.</>,
            sub: "해당 컬럼의 모든 데이터가 함께 삭제됩니다.",
          },
        ]}
      />
      <Tip>하단 <IBtn icon={MessageSquare} label="대화" /> 탭에서 AI에게 "유저 ID 컬럼 추가해줘" 같이 자연어로 스키마를 수정할 수 있습니다.</Tip>
    </>
  );
}

function EditorContent() {
  return (
    <>
      <ToolbarRow
        title="툴바 버튼"
        items={[
          { icon: Undo2,     label: "실행 취소",   desc: "마지막 편집을 되돌립니다. (Ctrl+Z)" },
          { icon: Redo2,     label: "다시 실행",   desc: "되돌린 편집을 다시 적용합니다. (Ctrl+Shift+Z)" },
          { icon: Upload,    label: "CSV 임포트",  desc: "CSV 파일을 불러와 행을 일괄 추가합니다." },
          { icon: Download,  label: "내보내기",    desc: "CSV 또는 JSON 형식으로 저장합니다." },
          { icon: Save,      label: "스냅샷 저장", desc: "현재 상태를 버전으로 저장합니다." },
          { icon: GitCompare,label: "버전 비교",   desc: "저장된 스냅샷과 현재 데이터 차이를 확인합니다." },
          { icon: TrendingUp,label: "성장 곡선 생성", desc: "레벨별 수치를 수식으로 자동 채웁니다." },
          { icon: Sparkles,  label: "AI 밸런스 분석", desc: "AI가 이상값을 분석하고 권장값을 제시합니다." },
          { icon: Eye,       label: "컬럼 표시/숨김", desc: "보고 싶은 컬럼만 선택해 화면에 표시합니다." },
        ]}
      />
      <ShortcutGrid
        items={[
          { key: "⌘ Z",       desc: "실행 취소" },
          { key: "⌘ ⇧ Z",    desc: "다시 실행" },
          { key: "⌘ C",       desc: "셀 복사" },
          { key: "⌘ V",       desc: "붙여넣기" },
          { key: "Enter",     desc: "셀 편집 확정" },
          { key: "Tab",       desc: "다음 셀로 이동" },
        ]}
      />
      <Divider />
      <StepList
        title="이상값 셀 대응"
        items={[
          {
            label: <><span className="inline-block w-3 h-3 rounded-sm bg-red-500/40 border border-red-500 align-middle mr-1" /> 빨간 셀 = 위험 이상값, <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500 align-middle mr-1" /> 노란 셀 = 경고입니다.</>,
          },
          {
            label: <>이상값 셀을 클릭하면 하단 <IBtn icon={BarChart3} label="밸런싱 분석" /> 패널에 원인이 표시됩니다.</>,
          },
          {
            label: <><IBtn label="권장값 적용" variant="primary" /> 버튼으로 AI 제안값을 한 번에 반영합니다.</>,
          },
        ]}
      />
      <Tip>
        행 우측 <IBtn icon={StickyNote} /> 아이콘을 클릭해 해당 수치의 근거나 메모를 기록할 수 있습니다.
      </Tip>
    </>
  );
}

function TypesContent() {
  return (
    <>
      <FlowDiagram
        title="enum 타입 생성 → 컬럼 적용"
        items={[
          { icon: Plus, label: "새 타입", desc: "타입 화면에서" },
          { label: "이름 입력", desc: "예: grade" },
          { label: "값 추가", desc: "SSR, SR, R, N" },
          { icon: Table2, label: "스키마 컬럼 편집", desc: "타입 = grade 선택" },
          { icon: Database, label: "데이터 편집", desc: "드롭다운으로 선택" },
        ]}
      />
      <Divider />
      <StepList
        title="타입 관리"
        items={[
          { label: "타입 목록에서 항목을 선택하면 오른쪽에 상세 편집 패널이 열립니다." },
          { label: <>허용값 목록에 값을 추가·삭제해 선택지를 관리합니다.</> },
          {
            label: "타입이 연결된 컬럼이 있으면 삭제 시 경고가 표시됩니다.",
            sub: "연결된 컬럼의 데이터가 영향을 받을 수 있으니 먼저 컬럼 타입을 변경하세요.",
          },
        ]}
      />
      <Tip>등급·직업·속성처럼 반복 사용되는 값은 타입으로 만들면 일관성이 유지되고, 입력 오류도 줄어듭니다.</Tip>
    </>
  );
}

function BalanceContent() {
  return (
    <>
      <FlowDiagram
        title="이상값 분석 흐름"
        items={[
          { icon: Sparkles, label: "AI 분석 실행", desc: "툴바 버튼" },
          { label: "이상값 목록 확인", desc: "위험·경고 분류" },
          { label: "항목 클릭", desc: "데이터 화면으로 이동" },
          { icon: Pencil, label: "수치 수정", desc: "직접 편집" },
        ]}
      />
      <Divider />
      <SectionLabel>분석 패널 구성</SectionLabel>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { label: "이상값 목록", desc: "Danger(빨강) / Warn(노랑)으로 구분. 클릭하면 데이터 화면 해당 행으로 이동합니다." },
          { label: "레이더 차트", desc: "선택한 유닛들의 HP·ATK·DEF 등 능력치를 방사형으로 비교합니다." },
          { label: "상관계수", desc: "Pearson 계수로 두 컬럼 간 연관성을 분석합니다. ±1에 가까울수록 강한 상관관계입니다." },
          { label: "승률 매트릭스", desc: "유닛 간 1:1 전투 승률을 표로 보여줍니다. 몬테카를로 시뮬 기반입니다." },
          { label: "AI 리포트", desc: "Claude가 수치 전반을 분석하고 개선안을 제안합니다." },
        ].map(({ label, desc }) => (
          <div key={label} className="px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <div className="text-[11px] font-semibold text-[#ededed] mb-0.5">{label}</div>
            <div className="text-[10px] text-[#6b6b77] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
      <Tip>밸런스 점수가 80 미만이면 빨간색으로 표시됩니다. 이상값을 수정한 뒤 분석을 다시 실행해 점수 변화를 확인하세요.</Tip>
    </>
  );
}

function SimulationContent() {
  return (
    <>
      <SectionLabel>7개 시뮬레이션 탭</SectionLabel>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { tab: "저장된 시뮬", desc: "실제 DB 데이터로 컬럼 수식을 자동 도출합니다. 테이블·컬럼을 선택하면 가장 잘 맞는 곡선식을 찾아줍니다." },
          { tab: "스탯 계산기", desc: "레벨별 HP·ATK·DEF 등 최종 스탯을 비교합니다. 수식 파라미터를 직접 입력해 실시간으로 확인할 수 있습니다." },
          { tab: "전투 시뮬", desc: "몬테카를로 기법으로 유닛 간 전투 승률과 HP 추이를 시뮬합니다." },
          { tab: "가챠", desc: "소프트 천장을 포함한 가챠 확률 분포와 평균 소환 횟수를 계산합니다." },
          { tab: "DPS", desc: "빌드별 초당 데미지를 비교합니다. 스킬·크리 확률 등 파라미터를 직접 설정합니다." },
          { tab: "난이도", desc: "스테이지별 적 유닛을 설정하면 플레이어 기준 승률과 예상 플레이타임을 계산합니다." },
          { tab: "페이싱", desc: "N일간 레벨·스테이지·재화 타임라인을 예측합니다. 성장 곡선과 하루 시도 횟수를 설정합니다." },
        ].map(({ tab, desc }) => (
          <div key={tab} className="px-3 py-2.5 rounded-lg bg-[#16161e] border border-[#2a2a3a]">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-1.5 py-0.5 rounded bg-[#2a2a3a] border border-[#3a3a4a] text-[10px] text-[#a78bfa]">{tab}</span>
            </div>
            <div className="text-[10px] text-[#6b6b77] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
      <Divider />
      <ToolbarRow
        title="저장된 시뮬 툴바"
        items={[
          { icon: RotateCcw, label: "재실행", desc: "시뮬레이션을 처음부터 다시 실행합니다." },
          { icon: Copy, label: "수식 복사", desc: "도출된 수식 텍스트를 클립보드로 복사합니다." },
        ]}
      />
      <Tip>페이싱 시뮬로 콘텐츠 소진 속도와 페이 게이트 위치를 미리 확인해 보세요.</Tip>
    </>
  );
}

function EconomyContent() {
  return (
    <>
      <FlowDiagram
        title="경제 시뮬 설정 흐름"
        items={[
          { icon: Plus, label: "항목 추가", desc: "재화 종류" },
          { label: "수입·지출 입력", desc: "일일 금액" },
          { label: "성장률 설정", desc: "기간별 변화율" },
          { label: "인플레이션 설정", desc: "가치 하락률" },
          { icon: TrendingUp, label: "잔액 차트", desc: "LineChart 확인" },
        ]}
      />
      <Divider />
      <StepList
        title="차트 읽는 법"
        items={[
          {
            label: <><strong className="text-[#ededed]">실질 잔액</strong> 선은 인플레이션을 반영한 실제 구매력을 보여줍니다.</>,
          },
          {
            label: <><strong className="text-[#ededed]">명목 잔액</strong> 선은 누적된 절대 수치입니다.</>,
          },
          {
            label: <>두 선의 차이가 클수록 재화 인플레이션이 심한 게임 경제를 나타냅니다.</>,
            sub: "차이가 너무 크면 초반 재화 수급을 줄이거나 소비처를 늘리는 조정이 필요합니다.",
          },
        ]}
      />
      <Tip>인플레이션을 0으로 설정하면 순수 수입·지출 밸런스만 확인할 수 있습니다.</Tip>
    </>
  );
}

function MemoryContent() {
  return (
    <>
      <FlowDiagram
        title="AI 채팅으로 DB 조작"
        items={[
          { icon: MessageSquare, label: "대화 탭 열기", desc: "하단 탭" },
          { label: "자연어 입력", desc: "\"레벨 50 데이터 추가\"" },
          { icon: Sparkles, label: "AI 실행", desc: "MCP로 DB 조작" },
          { icon: Database, label: "즉시 반영", desc: "데이터 화면 새로고침" },
        ]}
      />
      <Divider />
      <SectionLabel>AI 채팅 활용 예시</SectionLabel>
      <div className="flex flex-col gap-1.5 mb-5">
        {[
          "영웅 테이블에 레벨 50 행 추가해줘",
          "HP 컬럼이 1000 이상인 유닛 보여줘",
          "이 테이블 구조 설명해줘",
          "ATK가 가장 높은 유닛 3개 알려줘",
        ].map((ex) => (
          <div key={ex} className="px-3 py-2 rounded-lg bg-[#1e1e28] border border-[#2a2a3a] text-[11px] text-[#9a9aa3] font-mono">
            &ldquo;{ex}&rdquo;
          </div>
        ))}
      </div>
      <Divider />
      <StepList
        title="프로젝트 메모"
        items={[
          { label: "메모 탭에서 기획 의도·결정 사항을 자유형식으로 기록합니다." },
          {
            label: "저장된 메모는 AI 채팅 시 자동으로 맥락으로 활용됩니다.",
            sub: "\"이 프로젝트는 방치형 RPG로, 재화 인플레이션 억제가 핵심\" 같은 메모가 AI 응답 품질을 높입니다.",
          },
        ]}
      />
      <Tip>AI 채팅은 MCP(Model Context Protocol)로 실제 DB에 직접 접근합니다. 민감한 데이터 수정 전에는 스냅샷을 먼저 저장하세요.</Tip>
    </>
  );
}

// ── 화면 메타 ────────────────────────────────────────────────────

const SECTIONS = [
  { id: "home"       as Screen, label: "프로젝트",   Icon: Home,        title: "프로젝트",   subtitle: "게임 프로젝트를 생성하고 관리하는 시작점입니다.",          Content: HomeContent       },
  { id: "schema"     as Screen, label: "스키마",     Icon: Table2,      title: "스키마",     subtitle: "테이블 구조(컬럼)를 설계하는 화면입니다.",                  Content: SchemaContent     },
  { id: "editor"     as Screen, label: "데이터",     Icon: Database,    title: "데이터",     subtitle: "수치 데이터를 직접 입력·편집하는 스프레드시트입니다.",        Content: EditorContent     },
  { id: "types"      as Screen, label: "타입",       Icon: Tags,        title: "타입",       subtitle: "컬럼에서 사용하는 선택지(enum) 목록을 관리합니다.",           Content: TypesContent      },
  { id: "balance"    as Screen, label: "밸런싱",     Icon: BarChart2,   title: "밸런싱",     subtitle: "테이블 수치의 이상값을 감지하고 밸런스를 분석합니다.",        Content: BalanceContent    },
  { id: "simulation" as Screen, label: "시뮬레이션", Icon: Play,        title: "시뮬레이션", subtitle: "수치를 시뮬레이션해 게임 플레이 감을 미리 예측합니다.",       Content: SimulationContent },
  { id: "economy"    as Screen, label: "경제",       Icon: Coins,       title: "경제",       subtitle: "재화 흐름(수입·지출)을 시뮬레이션합니다.",                   Content: EconomyContent    },
  { id: "memory"     as Screen, label: "메모리",     Icon: NotebookText,title: "메모리",     subtitle: "AI와 대화하며 DB를 자연어로 조작하고 기획 메모를 저장합니다.", Content: MemoryContent     },
];

// ── HelpModal ────────────────────────────────────────────────────

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  initialScreen?: Screen;
}

export function HelpModal({ open, onClose, initialScreen }: HelpModalProps) {
  const [active, setActive] = useState<Screen>(initialScreen ?? "home");

  useEffect(() => {
    if (open) setActive(initialScreen ?? "home");
  }, [open, initialScreen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const section = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const { Icon, title, subtitle, Content } = section;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1a1a22] border border-[#2a2a3a] rounded-xl w-[760px] max-h-[82vh] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌측 화면 목록 */}
        <div className="w-[152px] border-r border-[#2a2a3a] py-3 flex flex-col gap-0.5 flex-shrink-0">
          <div className="px-4 pb-2 text-[10px] font-semibold text-[#4a4a55] uppercase tracking-wider">
            사용 가이드
          </div>
          {SECTIONS.map(({ id, label, Icon: SIcon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`mx-2 px-3 py-2 rounded-md text-left flex items-center gap-2 text-[11px] transition-colors ${
                active === id
                  ? "bg-[#2a2a3a] text-[#c9c9d4]"
                  : "text-[#6b6b77] hover:bg-[#22222e] hover:text-[#9a9aa3]"
              }`}
            >
              <SIcon size={13} className="flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* 우측 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#2a2a3a] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Icon size={16} className="text-[#8b5cf6]" />
              <div>
                <div className="text-[14px] font-semibold text-[#ededed]">{title}</div>
                <div className="text-[11px] text-[#6b6b77] mt-0.5">{subtitle}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              title="닫기 (ESC)"
              className="text-[#6b6b77] hover:text-[#ededed] hover:bg-[#22222e] rounded-md p-1.5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 px-6 py-5 overflow-y-auto">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
