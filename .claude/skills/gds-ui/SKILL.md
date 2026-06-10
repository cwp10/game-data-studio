---
name: gds-ui
description: Game Data Studio UI 컴포넌트 구현 가이드. 디자인 토큰, 8개 화면 구조(프로젝트·스키마·데이터·밸런싱·시뮬레이션·경제·타입·메모리), Tailwind 클래스 패턴, 공통 컴포넌트 패턴 제공. "UI 구현", "화면 수정", "컴포넌트 추가", "스타일 적용" 등 프론트엔드 작업 시 반드시 이 스킬을 사용한다. wireframe.html과 함께 사용하라.
---

## 디자인 토큰 (Tailwind 클래스)

### 색상 시스템
와이어프레임의 인라인 CSS 색상을 아래 매핑으로 Tailwind에 변환한다.

| 역할 | Hex | Tailwind custom 또는 arbitrary |
|------|-----|-------------------------------|
| Primary | `#185FA5` | `text-[#185FA5]`, `border-[#185FA5]` |
| Danger | `#A32D2D` | `text-[#A32D2D]` |
| Warning | `#854F0B` | `text-[#854F0B]` |
| Success | `#27500A` | `text-[#27500A]` |
| BG | `#f8f7f4` | `bg-[#f8f7f4]` |
| Border | `#e8e6e0` | `border-[#e8e6e0]` |
| Text | `#1a1a18` | `text-[#1a1a18]` |
| Muted | `#888` | `text-gray-500` |

### 배지 클래스 (grade별)
```tsx
const gradeClass = {
  SSR: 'bg-[#fbeaf0] text-[#72243E]',
  SR:  'bg-[#faeeda] text-[#633806]',
  R:   'bg-[#e6f1fb] text-[#0C447C]',
  N:   'bg-[#f1efe8] text-[#5F5E5A]',
}
```

### 이상값 셀 클래스
```tsx
const anomalyClass = {
  danger: 'text-[#A32D2D] font-medium',
  warn:   'text-[#854F0B] font-medium',
}
```

---

## 5개 화면 구조

### 공통 레이아웃
```tsx
// src/app/page.tsx 기준
<div className="flex h-screen bg-white">
  <Sidebar activeScreen={screen} onNavigate={setScreen} />
  <main className="flex-1 overflow-hidden">
    {screen === 'home'       && <ProjectHome />}
    {screen === 'schema'     && <SchemaEditor />}
    {screen === 'editor'     && <DataEditor />}
    {screen === 'balance'    && <BalancePanel />}
    {screen === 'simulation' && <SimulationView />}
  </main>
</div>
```

### Sidebar 아이콘 순서
```
⌂ home → ⊞ schema → ▤ editor → ▦ balance → ▷ simulation
(구분선)
⚙ settings
```

---

## 공통 컴포넌트 패턴

### 버튼
```tsx
// Primary
<button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-[#e6f1fb] border border-[#85b7eb] text-[#0C447C] rounded-md hover:bg-[#d4e8f7]">
  ＋ 새 프로젝트
</button>

// Default
<button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-white border border-[#d0cec8] text-[#555] rounded-md hover:bg-[#f8f7f4]">
  CSV
</button>

// Success
<button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-[#eaf3de] border border-[#97c459] text-[#27500A] rounded-md">
  ⎘ C# 복사
</button>
```

### Panel (좌측 목록 패널)
```tsx
<div className="w-44 border-r border-[#e8e6e0] bg-[#f8f7f4] flex flex-col">
  <div className="px-3 py-2.5 border-b border-[#e8e6e0] text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
    테이블
    <span className="cursor-pointer text-sm font-normal">＋</span>
  </div>
  {tables.map(t => (
    <div key={t.id}
      onClick={() => setSelected(t.id)}
      className={`px-3 py-2 text-xs cursor-pointer border-l-2 flex items-center gap-2
        ${selected === t.id
          ? 'bg-white text-[#1a1a18] font-medium border-l-[#185FA5]'
          : 'text-gray-500 border-l-transparent hover:bg-white'}`}
    >
      {t.name}
      <span className="ml-auto text-[10px] text-gray-400">{t.columnCount}</span>
    </div>
  ))}
</div>
```

### 데이터 테이블
```tsx
<table className="w-full border-collapse text-xs">
  <thead>
    <tr>
      <th className="px-2.5 py-1.5 text-left text-[11px] font-medium text-gray-500 border-b border-[#e8e6e0] bg-[#f8f7f4]">
        컬럼명
      </th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row, i) => (
      <tr key={row.id} className="hover:bg-[#fafaf8]">
        <td className="px-2.5 py-1.5 border-b border-[#f0ede8] text-[#1a1a18]">
          {row.data.name}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### 이상값 셀 (데이터 에디터)
```tsx
function AnomalyCell({ value, severity }: { value: number; severity: 'danger' | 'warn' | null }) {
  if (!severity) return <span>{value.toLocaleString()}</span>
  return (
    <span className={severity === 'danger' ? 'text-[#A32D2D] font-medium' : 'text-[#854F0B] font-medium'}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${severity === 'danger' ? 'bg-[#E24B4A]' : 'bg-[#EF9F27]'}`} />
      {value.toLocaleString()}
    </span>
  )
}
```

### 메트릭 카드 (밸런싱 패널)
```tsx
function MetricCard({ label, value, variant }: { label: string; value: string | number; variant?: 'danger' | 'warn' | 'success' }) {
  const colorClass = { danger: 'text-[#A32D2D]', warn: 'text-[#854F0B]', success: 'text-[#27500A]' }
  return (
    <div className="bg-[#f8f7f4] rounded-lg p-3">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-medium ${variant ? colorClass[variant] : 'text-[#1a1a18]'}`}>{value}</div>
    </div>
  )
}
```

### SimulationView 유형 탭

SimulationView는 단일 화면이 아닌 `type` 상태로 분기하는 다중 유형 패턴이다.

```tsx
type SimType = 'saved' | 'stat' | 'combat' | 'gacha' | 'dps'
// 추가 유형은 이 union에 추가하고 아래 조건 렌더를 확장한다

{type === 'saved'  && <SavedSimPanel />}
{type === 'stat'   && <StatCalculator />}
{type === 'combat' && <CombatSimPanel />}
{type === 'gacha'  && <GachaSimPanel />}
{type === 'dps'    && <DpsSimPanel />}
```

유형 탭 버튼은 상단 툴바에 배치. 새 유형 추가 시 탭 목록과 조건 렌더만 확장하면 된다.

### Histogram (자체 SVG, 공유 빈)

Histogram은 외부 차트 라이브러리 없이 자체 SVG로 구현한다. 다중 시리즈를 공유 빈(global bins)으로 비교할 때는 `computeBins`로 먼저 빈 경계를 계산한 뒤 각 시리즈를 같은 빈에 할당한다.

```tsx
// src/components/chart/bins.ts — 순수함수
export interface Bin { start: number; end: number; counts: number[] }
export function computeBins(allValues: number[][], binCount = 20): Bin[]
// allValues: [[시리즈A 값들], [시리즈B 값들], ...]
// 전체 min/max로 공유 빈 경계 생성 → 시리즈별 count 배열

// src/components/chart/Histogram.tsx
// props: bins: Bin[], seriesColors: string[], width/height
// SVG bar chart: 다중 시리즈를 같은 빈 내에서 나란히(grouped) 또는 쌓아서(stacked) 렌더
```

### LineChart (HP 추이)

전투 시뮬 HP 추이에 사용. SVG polyline 기반.

```tsx
// props: traces: HpTracePoint[], width/height
// HpTracePoint: { turn: number; attackerHp: number; defenderHp: number }
// x축: turn, y축: HP, 두 라인(attacker/defender) 색상 구분
// hpTrace.length >= 2 시에만 렌더 (1턴 즉사 시 생략)
```

---

## API 호출 패턴

```tsx
// 표준 fetch 패턴
const [data, setData] = useState<Row[]>([])
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetch(`/api/rows?table_id=${tableId}`)
    .then(r => r.json())
    .then(json => { if (json.error) throw new Error(json.error); setData(json.rows) })
    .catch(err => setError(err.message))
}, [tableId])

// 에러 표시
{error && (
  <div className="text-xs text-[#A32D2D] p-2">{error}</div>
)}
```

---

## 타입 배지

```tsx
const typeBadge = {
  number:  'bg-[#e6f1fb] text-[#0C447C]',
  string:  'bg-[#eaf3de] text-[#27500A]',
  boolean: 'bg-[#faeeda] text-[#633806]',
}

<span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadge[col.type]}`}>
  {col.type}
</span>
```

---

## 주의사항

- `wireframe.html`의 레이아웃을 정확히 재현한다 — 디자인 임의 변경 금지
- Tailwind arbitrary value(`[]`) 사용 허용 — 와이어프레임 색상값이 Tailwind 기본 팔레트에 없음
- 상태는 각 화면 컴포넌트 내에서 관리 (전역 상태 관리 라이브러리 불필요)
- 프로젝트 전환(다른 프로젝트 선택)은 URL params 또는 부모 상태로 처리
