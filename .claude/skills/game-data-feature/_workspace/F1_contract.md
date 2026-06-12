# F-1 진척도 페이싱 시뮬레이터 — Stage A 계약 (단일 출처)

Stage B(mcp-implementer + ui-builder)가 소비할 shape 계약. 타입은 글자 그대로 일치해야 한다.

- 코어: `src/lib/simulation/pacing.ts`
- 테스트: `src/lib/simulation/pacing.test.ts` (18 앵커/불변식)
- 의존성 0 (Next.js/DB/MCP 없음). 기존 코어만 재사용: `curve/generate(computeCurve)`, `simulation/combat(runMonteCarlo, Unit)`, `simulation/difficulty(StageInput)`.

## API action name

```
"pacing"
```

POST `/api/simulation` 본문: `{ action: "pacing", ...PacingInput }` → `PacingResult` 반환 (Stage B 구현).

## 함수 시그니처

```typescript
export function simulatePacing(input: PacingInput): PacingResult
```

## 타입 전문 (글자 그대로)

```typescript
import { type CurveParams } from "../curve/generate";
import { type StageInput } from "./difficulty"; // { label: string; enemy: Unit }

export interface PacingInput {
  // 플레이어 스탯 성장 곡선 (레벨 1~maxLevel)
  hpCurve: CurveParams;  // 레벨별 HP
  atkCurve: CurveParams; // 레벨별 ATK
  defCurve?: CurveParams; // 레벨별 DEF (선택, 없으면 0)

  // 레벨업 비용 곡선
  expCurve: CurveParams; // expCurve[L-1] = 레벨 L → L+1 승급에 필요한 exp
  expPerStage: number;   // 스테이지 클리어(승리)당 획득 exp

  // 스테이지 목록 (difficulty.StageInput 재사용 — enemy: Unit)
  stages: StageInput[];

  // 경제
  goldPerStage: number;          // 스테이지 승리당 획득 골드
  upgradeCostCurve: CurveParams; // upgradeCostCurve[L-1] = 레벨 L → L+1 승급 소모 골드

  // 시뮬레이션 파라미터
  days: number;          // 시뮬레이션 기간 (1~365, 범위 밖 clamp)
  attemptsPerDay: number; // 하루 스테이지 도전 횟수
  seed?: number;          // 미지정 시 0
}

export interface DayResult {
  day: number;          // 1-indexed
  level: number;        // 해당 일 *시작* 시 플레이어 레벨
  stageCleared: number; // 해당 일 종료 시 클리어한 최고 스테이지 인덱스 (0-indexed, 미클리어 = -1)
  gold: number;         // 해당 일 종료 시 보유 골드
  exp: number;          // 해당 일 종료 시 누적 exp (다음 레벨업까지 남은 잔여 exp)
  winRate: number;      // 해당 일 도전 스테이지 승률 (0~1)
}

export interface PacingResult {
  days: DayResult[];        // length = clamp(input.days, 1, 365)
  totalStagesCleared: number; // = 마지막 stageCleared + 1 (미클리어면 0)
  finalLevel: number;       // 마지막 일 종료 후 레벨 (당일 레벨업 반영)
  finalGold: number;        // 마지막 일 종료 후 보유 골드
}
```

## 알고리즘 결정 사항 (Stage B가 알아야 할 고정값/규칙)

PacingInput에 없는 전투 입력은 코어 상수로 고정 — Stage B도 동일 값을 가정해야 일관:

| 상수 | 값 | 의미 |
|------|----|----|
| `PLAYER_SPEED` | 10 | 플레이어 유닛 speed (적보다 빠름) |
| `MC_ITERATIONS` | 30 | 일별 승률 추정 몬테카를로 시행 수 |
| `CLEAR_WINRATE` | 0.5 | 이 승률 이상이면 스테이지 클리어 → 다음 진행 |

규칙:
- **도전 스테이지** = `min(highestCleared + 1, stages.length - 1)`. 마지막 스테이지에서 clamp → exp/gold 계속 유입.
- **미클리어 센티넬** = `-1` (`stageCleared`, 첫날 시작 상태). `totalStagesCleared = highestCleared + 1`.
- **일일 승리 수** = `Math.round(winRate × attemptsPerDay)`. RNG 재추출 없이 30-iter MC 승률에서 결정적 환산.
- **일별 시드** = `runMonteCarlo([player],[enemy], 30, seed + day)`. day마다 독립, 전체는 `seed`로 결정적.
- **`DayResult.level`** = 그 날 **시작** 레벨 (combat·레벨업 *전*에 기록). → day1.level === 1 보장.
- **레벨업 루프** (연속 허용): `while (accumExp >= expCurve[lv-1] && gold >= upgradeCostCurve[lv-1]) { 둘 다 차감; lv++ }`. 골드 부족이면 보류(break).
- **곡선 끝 가드**: 레벨이 곡선 길이를 넘으면 max-level 취급 (스탯은 마지막 값 clamp, 승급 비용 Infinity → 레벨업 중단). count는 도달 가능 레벨보다 충분히 크게.
- **enemy def/speed**: `StageInput.enemy: Unit`에 호출자가 직접 채운다 (코어가 강제하지 않음). 앵커 입력은 def=0, speed=5.

## 결정적 앵커 (seed=42, days=7, attemptsPerDay=10)

입력: 스테이지 5개 (hp 100→500, atk 10→50, def=0, speed=5), expPerStage=50, goldPerStage=100.
플레이어 곡선: hp linear(base 1000, factor 200), atk linear(base 200, factor 30), exp linear(base 50, factor 25), upgradeCost linear(base 30, factor 20).

검증되는 앵커 (테스트 단언):
- `days.length === 7`
- `day1.level === 1`
- `day7.level > day1.level`
- `day7.stageCleared >= day1.stageCleared` (전체 단조 증가)
- `finalGold >= 0` (모든 일자 gold >= 0)
- 같은 seed → 동일 결과 (byte-identical)
- `totalStagesCleared === 마지막 stageCleared + 1`

실제 산출 타임라인 (참고, 회귀 비교용):

| day | level | stageCleared | gold | exp | winRate |
|-----|-------|--------------|------|-----|---------|
| 1 | 1 | 0 | 650 | 0 | 1.000 |
| 2 | 6 | 1 | 1370 | 125 | 1.000 |
| 3 | 8 | 2 | 2010 | 150 | 1.000 |
| 4 | 10 | 3 | 2570 | 75 | 1.000 |
| 5 | 12 | 4 | 3320 | 250 | 1.000 |
| 6 | 13 | 4 | 3760 | 25 | 1.000 |
| 7 | 15 | 4 | 4450 | 125 | 1.000 |

final: `totalStagesCleared=5, finalLevel=16, finalGold=4450`
