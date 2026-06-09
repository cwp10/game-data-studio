// 재화 수입/지출을 일자별로 투영 (경제 시뮬레이션 코어, UI와 분리)
export interface EcoEntry {
  amount: number;
  every: number; // 며칠마다 발생 (1=매일)
}

export interface EcoResult {
  balSeries: number[];
  incSeries: number[]; // 누적 수입
  spSeries: number[];  // 누적 지출
  cumInc: number;
  cumSp: number;
  net: number;
  finalBalance: number;
}

export function projectEconomy(sources: EcoEntry[], sinks: EcoEntry[], days: number, start: number): EcoResult {
  const N = Math.max(1, Math.min(Math.floor(days), 365));
  const dayAmt = (list: EcoEntry[], d: number) =>
    list.reduce((s, x) => s + ((d - 1) % Math.max(1, x.every) === 0 ? x.amount : 0), 0);

  let bal = start;
  let cumInc = 0;
  let cumSp = 0;
  const balSeries: number[] = [];
  const incSeries: number[] = [];
  const spSeries: number[] = [];

  for (let d = 1; d <= N; d++) {
    const inc = dayAmt(sources, d);
    const sp = dayAmt(sinks, d);
    bal += inc - sp;
    cumInc += inc;
    cumSp += sp;
    balSeries.push(bal);
    incSeries.push(cumInc);
    spSeries.push(cumSp);
  }

  return { balSeries, incSeries, spSeries, cumInc, cumSp, net: cumInc - cumSp, finalBalance: bal };
}
