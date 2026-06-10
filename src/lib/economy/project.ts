// 재화 수입/지출을 일자별로 투영 (경제 시뮬레이션 코어, UI와 분리)
export interface EcoEntry {
  amount: number;
  every: number; // 며칠마다 발생 (1=매일)
  growth?: number; // per-entry 복리 성장률 (기본 0). 발생 시마다 amount 복리 증감.
}

export interface EcoResult {
  balSeries: number[];
  incSeries: number[]; // 누적 수입
  spSeries: number[];  // 누적 지출
  cumInc: number;
  cumSp: number;
  net: number;
  finalBalance: number;
  realBalSeries: number[]; // 인플레 반영 실질잔액 (inflation=0 이면 balSeries 와 동일)
}

export function projectEconomy(
  sources: EcoEntry[],
  sinks: EcoEntry[],
  days: number,
  start: number,
  inflation = 0
): EcoResult {
  const N = Math.max(1, Math.min(Math.floor(days), 365));
  // d일째 발생 금액. 발생 조건 (d-1)%every===0 일 때, 발생 횟수 floor((d-1)/every) 만큼 복리.
  // growth 미지정 시 (1+0)^k = 1 → 기존과 byte-identical.
  const dayAmt = (list: EcoEntry[], d: number) =>
    list.reduce((s, x) => {
      const every = Math.max(1, x.every);
      if ((d - 1) % every !== 0) return s;
      const occ = Math.floor((d - 1) / every);
      return s + x.amount * Math.pow(1 + (x.growth ?? 0), occ);
    }, 0);

  let bal = start;
  let cumInc = 0;
  let cumSp = 0;
  const balSeries: number[] = [];
  const incSeries: number[] = [];
  const spSeries: number[] = [];
  const realBalSeries: number[] = [];

  for (let d = 1; d <= N; d++) {
    const inc = dayAmt(sources, d);
    const sp = dayAmt(sinks, d);
    bal += inc - sp;
    cumInc += inc;
    cumSp += sp;
    balSeries.push(bal);
    incSeries.push(cumInc);
    spSeries.push(cumSp);
    realBalSeries.push(bal / Math.pow(1 + inflation, d - 1));
  }

  return { balSeries, incSeries, spSeries, cumInc, cumSp, net: cumInc - cumSp, finalBalance: bal, realBalSeries };
}
