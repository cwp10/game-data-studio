// 히스토그램 빈 계산 — 순수 함수 (React 비의존, 단위 테스트 대상).
// 다중 시리즈를 "공유 빈"에 버킷팅: 모든 시리즈의 글로벌 min/max로 빈 경계를 한 번만 산출하고
// 각 시리즈를 동일 경계에 채운다. (시리즈별 제 min/max로 빈을 따로 잡으면 비교가 무의미해짐)

export interface BinResult {
  binEdges: number[];        // 길이 binCount+1 (경계). 데이터 없으면 빈 배열.
  seriesCounts: number[][];  // [시리즈][빈] — 각 행 길이 binCount.
}

// series: 시리즈별 값 배열. binCount: 빈 개수(>=1).
export function computeBins(series: number[][], binCount = 20): BinResult {
  const bins = Math.max(1, Math.floor(binCount));
  // 비숫자(NaN/Infinity) 제거 — LineChart와 동일 방어.
  const cleaned = series.map((vals) => vals.filter((v) => Number.isFinite(v)));
  const all = cleaned.flat();

  if (all.length === 0) {
    return { binEdges: [], seriesCounts: cleaned.map(() => []) };
  }

  const min = Math.min(...all);
  const max = Math.max(...all);

  // 전부 동일값(span 0) → 단일 빈. width 0 나눗셈/NaN 방지.
  if (min === max) {
    return {
      binEdges: [min, max],
      seriesCounts: cleaned.map((vals) => [vals.length]),
    };
  }

  const width = (max - min) / bins;
  const binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * width);

  const seriesCounts = cleaned.map((vals) => {
    const counts = new Array<number>(bins).fill(0);
    for (const v of vals) {
      // value === max 가 phantom bins번째 빈으로 새는 것 방지 → 마지막 빈에 귀속.
      const idx = Math.min(bins - 1, Math.floor((v - min) / width));
      counts[idx]++;
    }
    return counts;
  });

  return { binEdges, seriesCounts };
}
