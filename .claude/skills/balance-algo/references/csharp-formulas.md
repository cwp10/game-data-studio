# C# 수식 패턴 라이브러리 (보조 참고용)

> 이 파일은 Unity C# 코드 산출 요청 시만 로드한다.
> 기본 구현 경로는 네이티브 TS 엔진 — C# 산출은 "Unity 게임에서 직접 쓸 코드"를 요청할 때만 사용.

## 전투 피해 (ATK vs DEF)
```csharp
float defCoef = def / (def + 1200f);  // 1200은 조정 가능한 상수
int baseDmg = Mathf.Max(1, Mathf.RoundToInt(atk * (1f - defCoef)));

bool isCrit = Random.value < critRate;
int finalDmg = isCrit ? Mathf.RoundToInt(baseDmg * 1.5f) : baseDmg;

int hitsToKill = Mathf.CeilToInt(hp / (float)finalDmg);
```

## 경험치 성장 곡선 (지수형)
```csharp
int RequiredExp(int level) => Mathf.RoundToInt(baseExp * Mathf.Pow(growthRate, level - 1));
// baseExp: 1레벨 경험치, growthRate: 1.15~1.25 사이가 표준
```

## 가챠 확률 (소프트 천장)
```csharp
float GetActualRate(int pityCount, float baseRate, int pityStart, int pityMax) {
    if (pityCount >= pityMax) return 1f;
    if (pityCount <= pityStart) return baseRate;
    return baseRate + (1f - baseRate) * (float)(pityCount - pityStart) / (pityMax - pityStart);
}
```
TS 구현의 `rate(i)` 함수와 동일한 소프트 천장 모델. TS가 정본, C#은 참고.

## 방치형 골드 생산
```csharp
long OfflineGold(long goldPerHour, float hoursOffline, float efficiencyRate = 0.5f) {
    float cappedHours = Mathf.Min(hoursOffline, 12f);  // 12시간 캡
    return Mathf.RoundToInt(goldPerHour * cappedHours * efficiencyRate);
}
```
