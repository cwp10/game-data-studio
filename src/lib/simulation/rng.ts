// 시드 가능한 PRNG (mulberry32, 공개 표준 구현). Math.random 은 시드 불가 → 테스트 결정성 위해 자체 구현.
export type Rng = () => number;

// 같은 seed → 같은 0~1 수열. 32비트 정수 시드.
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [min, max] 정수 (양끝 포함).
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// 확률 p(0~1) 성공 여부.
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}
