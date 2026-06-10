---
name: balance-algo
description: 게임 수치 밸런싱·시뮬레이션 알고리즘 가이드. 이상값 감지(σ기반), 네이티브 TS 시뮬 엔진 패턴(Wilson CI·mulberry32 RNG·가챠 소프트 천장·DPS MC·expectedDamage 교차 앵커), Stage A 코어 구현 원칙 제공. "이상값 감지", "analyze_balance", "시뮬 코어 구현", "Wilson CI", "가챠 시뮬", "DPS 시뮬", "몬테카를로", "전투 시뮬" 요청 시 반드시 이 스킬을 사용한다.
---

## Stage A 원칙 — 코어 구현 시 반드시 지킨다

1. **의존성 0**: 코어 파일(`src/lib/simulation/*.ts`, `src/lib/gamefn/`)은 Next.js/DB/MCP에 의존하지 않는다.
2. **colocated test**: 모든 코어 파일에 `*.test.ts`를 함께 작성한다.
3. **결정적 앵커 필수**: MC 평균 ≈ 이론값 하나로 끝내지 않는다. 반드시 `불변식 단언`(예: maxPulls ≤ cap)을 함께 작성한다. 틀린 모델이 평균 수렴으로 우연히 통과하는 경우를 차단.
4. **재사용**: `rng.ts`(createRng/chance/randInt), `stats.ts`(wilsonCI), `gamefn`(damage/expectedDamage/dps) 재사용 — 재구현 금지.
5. **게이트**: `npm test` 녹색 + `npx tsc --noEmit` 0 확인 후 Stage B 진입.

---

## 이상값 감지 알고리즘

### 핵심 원칙
- 전체 평균이 아닌 **등급(grade)별 그룹 통계** 사용
- 그룹 내 평균 ± 2σ 초과 → warn, ± 3σ 초과 → danger
- 누락값(0, null, undefined) → 자동으로 danger

### 구현 (`src/lib/mcp/handlers/balance-handler.ts`)

```typescript
interface ColumnStats { column: string; mean: number; stddev: number; min: number; max: number; count: number }
interface Anomaly { row_id: string; row_data: Record<string, unknown>; column: string; value: number; severity: 'danger' | 'warn'; reason: string; expected_range: [number, number] }

function calcStats(values: number[]): Omit<ColumnStats, 'column'> {
  const valid = values.filter(v => !isNaN(v))
  const n = valid.length
  if (n === 0) return { mean: 0, stddev: 0, min: 0, max: 0, count: 0 }
  const mean = valid.reduce((a, b) => a + b, 0) / n
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  return { mean, stddev: Math.sqrt(variance), min: Math.min(...valid), max: Math.max(...valid), count: n }
}

// 밸런스 점수: 이상값 비율로 계산
const score = Math.max(0, Math.round(100 - (dangerCount * 10) - (warnCount * 3)))
```

---

## 네이티브 TS 시뮬 엔진 패턴

### mulberry32 시드 PRNG (`src/lib/simulation/rng.ts`)

```typescript
// XOR-shift 계열. 시드가 같으면 결과 동일(결정성) → 테스트 앵커 가능.
export function createRng(seed: number): () => number { ... }
export function chance(rng: () => number, p: number): boolean { return rng() < p }
export function randInt(rng: () => number, min: number, max: number): number { return Math.floor(rng() * (max - min + 1)) + min }
```

시드 독립성: 빌드별/시행별로 `createRng(seed + index)`로 분리 → 병렬 시행이 서로 영향 없음.

### Wilson 95% CI (`src/lib/simulation/stats.ts`)

```typescript
// k=성공, n=시행. 정규근사보다 작은 표본·극단 비율에서 안정적.
export function wilsonCI(k: number, n: number, z = 1.96): WilsonCI {
  if (n <= 0) return { center: 0, low: 0, high: 0 }
  const p = k / n, z2 = z * z, denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))
  return { center, low: Math.max(0, center - margin), high: Math.min(1, center + margin) }
}
// 앵커: wilsonCI(50, 100) → low ≈ 0.404, high ≈ 0.596 (손계산 단언)
```

### gamefn 순수 게임 함수 (`src/lib/gamefn/index.ts`)

```typescript
const DEF_CONST = 1200
export function damage(atk: number, def: number, defConst = DEF_CONST): number {
  return Math.max(1, Math.round(atk * (1 - def / (def + defConst))))
}
// 기대 데미지(크리 포함): base × (1 - r) + base × critMult × r
export function expectedDamage(atk, def, critRate = 0, critMult = 1.5): number { ... }
export function dps(perHitDmg, atkSpeed): number { return perHitDmg * Math.max(0, atkSpeed) }
export function ehp(hp, def): number { return hp * (def + DEF_CONST) / DEF_CONST }
export function ttk(targetHp, dpsVal): number { return dpsVal <= 0 ? Infinity : Math.ceil(targetHp / dpsVal) }
```

### 가챠 소프트 천장 (`src/lib/simulation/gacha.ts`)

```typescript
// per-pull 획득 확률 rate(i): i = 직전 획득 후 누적 뽑기 수(1-indexed)
//   i <= s  → p (base_rate)
//   s < i < N → 선형 램프: p + (1 - p) * (i - s) / (N - s)
//   i >= N  → 1.0 (하드 보장; 위 식에 i=N 대입 시 동일)
export function rate(i, baseRate, pityStart, pityCap): number { ... }

// 매 시행 독립 시드: createRng(seed + run)
// 앵커:
//   maxPulls <= pityCap  (★핵심 불변식 — 절대 넘지 않음)
//   baseRate=1 → avgPulls==1, maxPulls==1
//   rate(s) = p, rate(N) = 1.0 (단위 테스트)
//   같은 seed → 동일 결과
```

### DPS 빌드 비교 MC (`src/lib/simulation/dps.ts`)

```typescript
// gamefn.damage(atk, def) + chance(rng, critRate) 재사용
// 앵커:
//   mean ≈ gamefn.expectedDamage(atk, def, critRate, critMult)  (★독립 교차검증)
//   critRate=0 → min==max==base (분산 0)
//   critRate=1 → 모두 base × critMult
//   같은 seed → 동일 결과
```

### API action 라우팅 패턴 (`src/app/api/simulation/route.ts`)

```typescript
// POST 본문: { action: "montecarlo" | "gacha" | "dps", ...params }
export async function POST(request: Request) {
  const body = await request.json()
  if (body.action === 'montecarlo') { const result = runMonteCarlo(...); return NextResponse.json(result) }
  if (body.action === 'gacha')      { const result = runGachaSimulation(...); return NextResponse.json(result) }
  if (body.action === 'dps')        { const result = runDpsSimulation(...); return NextResponse.json(result) }
  // 기존 run/save/list 분기 보존
}
```

### AI 밸런싱 제안 포맷

```
현재 {value}은 {grade} 등급 평균({mean})의 {ratio}배입니다.
권장 범위: {mean - 2σ} ~ {mean + 2σ} (±1σ 기준)
수정 제안: {recommended_value} ({reason})
```
근거 없는 제안 금지. 반드시 통계 수치(평균, σ)와 함께 제시한다.

---

Unity C# 코드 산출이 필요한 경우 `references/csharp-formulas.md` 참조.
