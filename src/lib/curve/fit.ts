// 곡선 피팅: 관측 점들로부터 base/factor 를 닫힌형(OLS / 로그선형화)으로 복원.
// 반복 최적화·의존성 없음. computeCurve(generate.ts)의 역연산.
import { CurveType } from "./generate";

export interface FitResult {
  base: number;
  factor: number;
  r2: number; // 회귀가 수행된 공간(변환공간)의 결정계수. 완전적합 → ≈1.
  // S-Curve 전용 (다른 타입에서는 undefined)
  range?: number;
  rate?: number;
  midpoint?: number;
}

interface OLS {
  slope: number;
  intercept: number;
  r2: number; // (x,y) 회귀공간의 결정계수
}

// 최소제곱 닫힌형: y = intercept + slope*x. n<2 → 기울기 0, intercept=평균, r2=0.
function ols(xs: number[], ys: number[]): OLS {
  const n = xs.length;
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? ys[0] : 0, r2: 0 };
  }
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) {
    return { slope: 0, intercept: my, r2: 0 };
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  // r2 = (설명된 분산)/(전체 분산). syy=0(모든 y 동일) → 완전적합으로 간주(1).
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export function fitCurve(points: { level: number; value: number }[], type: CurveType): FitResult {
  if (points.length < 2) {
    return { base: 0, factor: 0, r2: 0 };
  }

  if (type === "linear") {
    // value = base + factor*(level-1) → OLS, x=(level-1)
    const xs = points.map((p) => p.level - 1);
    const ys = points.map((p) => p.value);
    const f = ols(xs, ys);
    return { base: f.intercept, factor: f.slope, r2: f.r2 };
  }

  if (type === "quadratic") {
    // value = base + factor*(level-1)² → OLS, x=(level-1)²
    const xs = points.map((p) => (p.level - 1) ** 2);
    const ys = points.map((p) => p.value);
    const f = ols(xs, ys);
    return { base: f.intercept, factor: f.slope, r2: f.r2 };
  }

  if (type === "logarithmic") {
    // value = base + factor*ln(level) → OLS, x=ln(level)
    const xs = points.map((p) => Math.log(p.level));
    const ys = points.map((p) => p.value);
    const f = ols(xs, ys);
    return { base: f.intercept, factor: f.slope, r2: f.r2 };
  }

  if (type === "s_curve") {
    // 로지스틱 logit 선형화 닫힌형: value = base + range/(1+exp(-rate*(L-midpoint)))
    //   normalized p = (value-base)/range,  logit(p)=ln(p/(1-p)) = rate*L - rate*midpoint
    //   → OLS(x=level, y=logit): slope=rate, intercept=-rate*midpoint.
    // ★base/range를 극단값(min/max)으로 추정 — round-trip엔 정확, freehand 근사케이스는 근사.
    const base = Math.min(...points.map((p) => p.value));
    const range = Math.max(...points.map((p) => p.value)) - base;
    if (range <= 0) return { base, factor: 0, r2: 0, range: 0, rate: 0, midpoint: 0 };

    // 경계점(p<=0 or p>=1)은 logit 불가 → skip (fit.ts 기존 규율).
    const usable = points.filter((p) => {
      const norm = (p.value - base) / range;
      return norm > 0 && norm < 1;
    });
    if (usable.length < 2) return { base, factor: 0, r2: 0, range, rate: 0, midpoint: 0 };

    const xs = usable.map((p) => p.level);
    const ys = usable.map((p) => {
      const norm = (p.value - base) / range;
      return Math.log(norm / (1 - norm));
    });
    const f = ols(xs, ys);
    const rate = f.slope;
    const midpoint = rate !== 0 ? -f.intercept / rate : 0;
    return { base, factor: 0, r2: f.r2, range, rate, midpoint };
  }

  if (type === "power") {
    // value = base*level^factor → ln(value)=ln(base)+factor*ln(level)
    // log-log 회귀: x=ln(level), y=ln(value). factor=slope, base=exp(intercept).
    // value<=0 또는 level<=0 → ln 불가 → 해당 점 skip.
    const pts = points.filter((p) => p.value > 0 && p.level > 0);
    if (pts.length < 2) return { base: 0, factor: 0, r2: 0 };
    const xs = pts.map((p) => Math.log(p.level));
    const ys = pts.map((p) => Math.log(p.value));
    const f = ols(xs, ys);
    return { base: Math.exp(f.intercept), factor: f.slope, r2: f.r2 };
  }

  // exponential: value = base*factor^(level-1) → ln(value)=ln(base)+(level-1)*ln(factor)
  // semi-log 회귀: x=(level-1), y=ln(value). factor=exp(slope), base=exp(intercept).
  // value<=0 → ln 불가 → skip.
  const pts = points.filter((p) => p.value > 0);
  if (pts.length < 2) return { base: 0, factor: 0, r2: 0 };
  const xs = pts.map((p) => p.level - 1);
  const ys = pts.map((p) => Math.log(p.value));
  const f = ols(xs, ys);
  return { base: Math.exp(f.intercept), factor: Math.exp(f.slope), r2: f.r2 };
}
