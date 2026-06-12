// F-1 진척도 페이싱 시뮬레이터 (Stage A 코어, 의존성 0).
// "N일차에 몇 레벨/스테이지/재화" 타임라인 산출.
// 기존 코어 재사용: computeCurve(곡선) + runMonteCarlo(전투 승률) + Unit(combat).
// 새 전투/곡선 수학 없음 — 일별 루프로 조합·누적만 한다.
import { computeCurve, type CurveParams } from "../curve/generate";
import { runMonteCarlo, type Unit } from "./combat";
import { type StageInput } from "./difficulty";

export interface PacingInput {
  // 플레이어 스탯 성장 곡선 (레벨 1~maxLevel)
  hpCurve: CurveParams; // 레벨별 HP
  atkCurve: CurveParams; // 레벨별 ATK
  defCurve?: CurveParams; // 레벨별 DEF (선택, 없으면 0)

  // 레벨업 비용 곡선
  expCurve: CurveParams; // expCurve[L-1] = 레벨 L → L+1 승급에 필요한 exp
  expPerStage: number; // 스테이지 클리어(승리)당 획득 exp

  // 스테이지 목록 (difficulty.StageInput 재사용 — enemy: Unit)
  stages: StageInput[];

  // 경제
  goldPerStage: number; // 스테이지 승리당 획득 골드
  upgradeCostCurve: CurveParams; // upgradeCostCurve[L-1] = 레벨 L → L+1 승급 소모 골드

  // 시뮬레이션 파라미터
  days: number; // 시뮬레이션 기간 (1~365)
  attemptsPerDay: number; // 하루 스테이지 도전 횟수
  seed?: number;
}

export interface DayResult {
  day: number; // 1-indexed
  level: number; // 해당 일 *시작* 시 플레이어 레벨
  stageCleared: number; // 해당 일 종료 시 클리어한 최고 스테이지 인덱스 (0-indexed, 미클리어 = -1)
  gold: number; // 해당 일 종료 시 보유 골드
  exp: number; // 해당 일 종료 시 누적 exp
  winRate: number; // 해당 일 도전 스테이지 승률 (0~1)
}

export interface PacingResult {
  days: DayResult[]; // length = input.days
  totalStagesCleared: number;
  finalLevel: number;
  finalGold: number;
}

// 고정 파라미터 (PacingInput에 없는 전투 입력 — Stage B도 동일 값 사용).
const PLAYER_SPEED = 10; // 플레이어 선공 (적보다 빠름 가정)
const MC_ITERATIONS = 30; // 일별 승률 추정 시행 수 (빠른 추정)
const CLEAR_WINRATE = 0.5; // 이 승률 이상이면 스테이지 클리어 → 다음 스테이지 진행

// 곡선 배열에서 레벨(1-indexed) 값 조회. 범위 초과 시 마지막 값으로 clamp (max-level 취급).
function curveAt(arr: number[], level: number): number {
  if (arr.length === 0) return 0;
  const idx = Math.min(Math.max(0, level - 1), arr.length - 1);
  return arr[idx];
}

// 레벨 L → L+1 승급 비용 조회. 곡선 끝을 넘으면 Infinity (더 이상 레벨업 불가 = max level).
function costAt(arr: number[], level: number): number {
  if (level - 1 >= arr.length) return Infinity;
  return arr[level - 1];
}

// 현재 레벨의 플레이어 Unit 구성 (곡선에서 스탯 조회).
function buildPlayer(
  level: number,
  hp: number[],
  atk: number[],
  def: number[],
): Unit {
  return {
    name: "player",
    hp: curveAt(hp, level),
    atk: curveAt(atk, level),
    def: def.length ? curveAt(def, level) : 0,
    speed: PLAYER_SPEED,
  };
}

export function simulatePacing(input: PacingInput): PacingResult {
  const seed = input.seed ?? 0;
  const days = Math.max(1, Math.min(Math.floor(input.days), 365));
  const attempts = Math.max(0, Math.floor(input.attemptsPerDay));

  // 곡선 1회 사전 계산 (일별 재계산 불필요).
  const hp = computeCurve(input.hpCurve);
  const atk = computeCurve(input.atkCurve);
  const def = input.defCurve ? computeCurve(input.defCurve) : [];
  const expReq = computeCurve(input.expCurve);
  const upgradeCost = computeCurve(input.upgradeCostCurve);

  const stages = input.stages;
  const maxStageIdx = stages.length - 1;

  let level = 1;
  let gold = 0;
  let accumExp = 0;
  let highestCleared = -1; // 아직 아무 스테이지도 클리어 못함

  const results: DayResult[] = [];

  for (let d = 1; d <= days; d++) {
    const startLevel = level; // 해당 일 시작 레벨 (combat/레벨업 *전*에 기록)

    let winRate = 0;

    if (stages.length > 0) {
      // 도전 스테이지 = 최고 클리어 + 1 (마지막 스테이지에서 clamp → exp/gold 계속 유입).
      const targetIdx = Math.min(highestCleared + 1, maxStageIdx);
      const target = stages[targetIdx];

      const player = buildPlayer(startLevel, hp, atk, def);

      // 일별 독립 시드 (seed + day) → 결정적. runMonteCarlo 내부에서 시행별 분리.
      const mc = runMonteCarlo([player], [target.enemy], MC_ITERATIONS, seed + d);
      winRate = mc.winRate;

      // 실제 일일 승리 횟수 = 승률 × 도전 횟수 (RNG 재추출 없이 결정적 환산).
      const wins = Math.round(winRate * attempts);

      // 승리 보상 누적.
      accumExp += wins * input.expPerStage;
      gold += wins * input.goldPerStage;

      // 클리어 판정 → 단조 증가 (한 번 오른 highestCleared는 내려가지 않음).
      if (winRate >= CLEAR_WINRATE && targetIdx > highestCleared) {
        highestCleared = targetIdx;
      }
    }

    // 레벨업 루프 (연속 허용): exp·gold 둘 다 충족 시에만 승급. 골드 부족이면 보류(break).
    while (true) {
      const need = curveAt(expReq, level);
      const cost = costAt(upgradeCost, level);
      if (accumExp < need || gold < cost || !isFinite(cost)) break;
      accumExp -= need;
      gold -= cost;
      level += 1;
    }

    results.push({
      day: d,
      level: startLevel,
      stageCleared: highestCleared,
      gold,
      exp: accumExp,
      winRate,
    });
  }

  return {
    days: results,
    totalStagesCleared: highestCleared + 1, // -1 → 0개, idx 4 → 5개
    finalLevel: level,
    finalGold: gold,
  };
}
