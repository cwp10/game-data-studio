# 방치형 RPG (idle_rpg) — 스키마 사양

> 단일 출처: `game-data-feature/_workspace/00_genre_contract.md §5.2`

## 테이블 (6개 메타 + 1개 전개)

**heroes** — 영웅 (메타) — 공식 우선 패턴
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id / name | | |
| class | string | warrior/mage/archer/healer |
| base_dps | number | 기본 초당 피해 |
| unlock_level | number | |
| upgrade_cost_gold | number | |
| growth_type | string | linear/power/exponential/logarithmic/quadratic/s_curve |
| growth_base | number | 공식 base 파라미터 (레벨 1 기준값) |
| growth_factor | number | 공식 factor 파라미터 (성장 가파름) |

**hero_levels** — 선택적 미리보기 (공식 우선 패턴)
> 실제 스탯은 `heroes.growth_type/growth_base/growth_factor`와 `eval_formula` MCP 도구로 온디맨드 계산.
> `hero_levels`는 초반 구간 QA 또는 CSV export가 필요할 때 `generate_curve`로 선택적으로 생성.

| 컬럼 | 타입 |
|------|------|
| id / hero_id | string (hero_id → heroes.id) |
| level | number |
| dps / upgrade_cost | number |

**buildings** — 건물/시설
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (production/combat/storage) |
| level | number |
| gold_per_hour / upgrade_cost / upgrade_time_sec | number |

**enemies** — 몬스터
| 컬럼 | 타입 |
|------|------|
| id / name | |
| zone | number |
| hp / dps / gold_drop / exp_drop | number |

**quests** — 퀘스트
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (daily/weekly/story) |
| requirement_type | string (kill/collect/reach) |
| requirement_value / reward_gold / reward_gem | number |

**economy_config** — 경제 파라미터
| 컬럼 | 타입 |
|------|------|
| id / key | |
| value | number |
| description | string |

**offline_rewards** — 방치 보상 테이블
| 컬럼 | 타입 |
|------|------|
| id | |
| hours_offline | number |
| gold_reward | number |
| efficiency | number (0~1) |

## 관계
```
hero_levels.hero_id → heroes.id
```

## 공식 우선 워크플로우

### A. 직접 편집
```
heroes 행 입력: growth_type=power, growth_base=100, growth_factor=1.5
→ DataEditor 미리보기 버튼(TrendingUp) 클릭
→ Lv1=100, Lv10=3162, Lv100=100000, Lv1000=3.16M 즉시 확인
```

### B. 앵커 포인트 → 공식 역산
```
fit_curve { points:[{level:1,value:100},{level:1000,value:5000000}], type:"power" }
→ { base:100, factor:1.8, r2:1.0 }
→ heroes 행 growth_base=100, growth_factor=1.8 저장
→ eval_formula로 전 구간 검증
```

### eval_formula 사용 예시
```json
{
  "type": "power",
  "base": 100,
  "factor": 1.5,
  "levels": [1, 10, 100, 1000, 10000, 100000]
}
```
출력: `[{level:1,value:100}, {level:10,value:3162}, ...]` — DB 쓰기 없음
