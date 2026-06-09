---
name: balance-algo
description: 게임 수치 밸런싱 알고리즘과 Unity C# 시뮬레이션 수식 산출 가이드. "이상값 감지", "밸런싱 분석", "analyze_balance 구현", "시뮬레이션 수식", "run_simulation 구현", "C# 코드 생성" 등 밸런싱/시뮬레이션 요청 시 반드시 이 스킬을 사용한다.
---

## 이상값 감지 알고리즘

### 핵심 원칙
- 전체 평균이 아닌 **등급(grade) 별 그룹 통계** 사용
- 그룹 내 평균 ± 2σ 초과 → warn, ± 3σ 초과 → danger
- 누락값(0, null, undefined) → 자동으로 danger

### 구현

```typescript
// src/lib/mcp/handlers/balance-handler.ts

interface ColumnStats {
  column: string
  mean: number
  stddev: number
  min: number
  max: number
  count: number
}

interface Anomaly {
  row_id: string
  row_data: Record<string, unknown>
  column: string
  value: number
  severity: 'danger' | 'warn'
  reason: string
  expected_range: [number, number]
}

export async function handleAnalyzeBalance(args: {
  table_id: string
  columns: string[]       // 분석할 수치 컬럼
  group_by?: string       // 보통 'grade'
}) {
  const rows = getRows(args.table_id)
  const parsed = rows.map(r => ({ id: r.id, data: JSON.parse(r.data) }))

  const anomalies: Anomaly[] = []
  const statsMap: Record<string, ColumnStats> = {}

  for (const col of args.columns) {
    if (args.group_by) {
      // 그룹별 통계
      const groups = groupBy(parsed, r => String(r.data[args.group_by!]))
      for (const [groupKey, groupRows] of Object.entries(groups)) {
        const stats = calcStats(groupRows.map(r => Number(r.data[col])))
        statsMap[`${col}:${groupKey}`] = { column: col, ...stats }
        const found = detectAnomalies(groupRows, col, stats, groupKey)
        anomalies.push(...found)
      }
    } else {
      const stats = calcStats(parsed.map(r => Number(r.data[col])))
      statsMap[col] = { column: col, ...stats }
      anomalies.push(...detectAnomalies(parsed, col, stats))
    }
  }

  // 밸런스 점수: 이상값 비율로 계산
  const total = parsed.length * args.columns.length
  const dangerCount = anomalies.filter(a => a.severity === 'danger').length
  const warnCount   = anomalies.filter(a => a.severity === 'warn').length
  const score = Math.max(0, Math.round(100 - (dangerCount * 10) - (warnCount * 3)))

  return {
    content: [{ type: 'text' as const, text: `분석 완료: 이상값 ${dangerCount}건, 경고 ${warnCount}건, 밸런스 점수 ${score}` }],
    structuredContent: { anomalies, stats: statsMap, score, danger_count: dangerCount, warn_count: warnCount },
  }
}

function calcStats(values: number[]): Omit<ColumnStats, 'column'> {
  const valid = values.filter(v => !isNaN(v))
  const n = valid.length
  if (n === 0) return { mean: 0, stddev: 0, min: 0, max: 0, count: 0 }
  const mean = valid.reduce((a, b) => a + b, 0) / n
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  return { mean, stddev: Math.sqrt(variance), min: Math.min(...valid), max: Math.max(...valid), count: n }
}

function detectAnomalies(
  rows: Array<{ id: string; data: Record<string, unknown> }>,
  col: string,
  stats: Omit<ColumnStats, 'column'>,
  groupLabel?: string
): Anomaly[] {
  const result: Anomaly[] = []
  for (const row of rows) {
    const raw = row.data[col]
    const val = Number(raw)

    // 누락값
    if (raw === 0 || raw === null || raw === undefined) {
      result.push({
        row_id: row.id, row_data: row.data, column: col, value: val,
        severity: 'danger',
        reason: `누락값 의심 (0 또는 null)`,
        expected_range: [stats.mean - 2 * stats.stddev, stats.mean + 2 * stats.stddev],
      })
      continue
    }

    const zScore = stats.stddev > 0 ? Math.abs(val - stats.mean) / stats.stddev : 0
    if (zScore > 3) {
      result.push({
        row_id: row.id, row_data: row.data, column: col, value: val,
        severity: 'danger',
        reason: `${groupLabel ? groupLabel + ' 등급 ' : ''}평균(${Math.round(stats.mean)})의 ${(val / stats.mean).toFixed(1)}배 초과 (z=${zScore.toFixed(1)})`,
        expected_range: [stats.mean - 2 * stats.stddev, stats.mean + 2 * stats.stddev],
      })
    } else if (zScore > 2) {
      result.push({
        row_id: row.id, row_data: row.data, column: col, value: val,
        severity: 'warn',
        reason: `${groupLabel ? groupLabel + ' 등급 ' : ''}평균 ±2σ 경계값 (z=${zScore.toFixed(1)})`,
        expected_range: [stats.mean - stats.stddev, stats.mean + stats.stddev],
      })
    }
  }
  return result
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
```

---

## 시뮬레이션 수식 도출

### 흐름
```
입력 테이블/컬럼 선택
  → JOIN 연산 (relations 테이블 참조)
  → 통계 분석 (평균, 분포)
  → 수식 패턴 선택
  → Unity C# 코드 산출
  → 검증 케이스 생성
```

### 수식 패턴 라이브러리

**전투 피해 (ATK vs DEF)**
```csharp
// 방어 계수 기반 피해 공식
float defCoef = def / (def + 1200f);  // 1200은 조정 가능한 상수
int baseDmg = Mathf.Max(1, Mathf.RoundToInt(atk * (1f - defCoef)));

// 치명타
bool isCrit = Random.value < critRate;
int finalDmg = isCrit ? Mathf.RoundToInt(baseDmg * 1.5f) : baseDmg;

// 필요 공격 횟수
int hitsToKill = Mathf.CeilToInt(hp / (float)finalDmg);
```

**경험치 성장 곡선 (지수형)**
```csharp
// 레벨업 필요 경험치
int RequiredExp(int level) => Mathf.RoundToInt(baseExp * Mathf.Pow(growthRate, level - 1));
// baseExp: 1레벨 경험치, growthRate: 1.15~1.25 사이가 표준
```

**가챠 확률 (천장 포함)**
```csharp
float GetActualRate(int pityCount, float baseRate, int pityMax) {
    float pityBonus = pityCount >= pityMax * 0.7f
        ? (float)(pityCount - pityMax * 0.7f) / (pityMax * 0.3f) * (1f - baseRate)
        : 0f;
    return Mathf.Clamp01(baseRate + pityBonus);
}
```

**방치형 골드 생산**
```csharp
long OfflineGold(long goldPerHour, float hoursOffline, float efficiencyRate = 0.5f) {
    float cappedHours = Mathf.Min(hoursOffline, 12f);  // 12시간 캡
    return Mathf.RoundToInt(goldPerHour * cappedHours * efficiencyRate);
}
```

### run_simulation 구현 구조

```typescript
export async function handleRunSimulation(args: {
  project_id: string
  name: string
  input_tables: string[]  // table_id 목록
  formula_type: 'combat' | 'exp_curve' | 'economy' | 'custom'
  description: string
}) {
  // 1. 테이블 데이터 수집
  const tableData = args.input_tables.map(tid => ({
    table: getTable(tid),
    rows: getRows(tid).map(r => ({ id: r.id, ...JSON.parse(r.data) })),
    columns: getColumns(tid),
  }))

  // 2. 통계 분석
  const stats = analyzeForSimulation(tableData)

  // 3. 수식 도출 (Claude가 컨텍스트에서 직접 추론)
  // 핸들러는 데이터+통계를 구조화해서 반환, Claude가 수식 결정
  const context = {
    formula_type: args.formula_type,
    tables: tableData,
    stats,
    suggested_constants: deriveSuggestedConstants(stats),
  }

  // 4. 검증 케이스 생성
  const testCases = generateTestCases(tableData, stats)

  return {
    content: [{ type: 'text' as const, text: `시뮬레이션 컨텍스트 준비 완료. 수식을 도출하여 C# 코드를 생성하세요.` }],
    structuredContent: { context, test_cases: testCases },
  }
}
```

---

## AI 밸런싱 제안 포맷

Claude가 analyze_balance 결과를 받아 제안할 때 이 포맷을 사용한다:

```
현재 {value}은 {grade} 등급 평균({mean})의 {ratio}배입니다.
권장 범위: {mean - 2σ} ~ {mean + 2σ} (±1σ 기준)
수정 제안: {recommended_value} ({reason})
```

근거 없는 제안 금지. 반드시 통계 수치(평균, σ)와 함께 제시한다.
