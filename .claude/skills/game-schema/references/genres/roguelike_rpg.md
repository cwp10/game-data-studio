# 로그라이크 RPG (roguelike_rpg) — 스키마 사양

> 단일 출처: `game-data-feature/_workspace/00_genre_contract.md §5.5`
> 성장 축 = 런/층 스케일링 + 아이템 시너지. 전개 테이블 = `floor_scaling`(층별 배율, `floor_no` 키 — **FK 아님**).

## 테이블 (8개 메타 + 1개 전개)

**characters** — 캐릭터 (메타)
| 컬럼 | 타입 |
|------|------|
| id / name | |
| base_hp / base_atk / base_speed | number |
| starting_item_id | string (→ items.id) |

**items** — 아이템
| 컬럼 | 타입 |
|------|------|
| id / name | |
| rarity | string (common/rare/epic/legendary) |
| effect_type / effect_value | |
| synergy_tag | string |

**synergies** — 시너지
| 컬럼 | 타입 |
|------|------|
| id / synergy_tag | |
| pieces_required / bonus_value | number |
| bonus_type | string |

**enemies** — 적
| 컬럼 | 타입 |
|------|------|
| id / name | |
| hp / atk | number |
| behavior | string |
| is_elite | boolean |

**floors** — 층
| 컬럼 | 타입 |
|------|------|
| id / floor_no | |
| room_type | string (combat/elite/shop/boss/treasure) |
| enemy_count | number |

**floor_scaling** — 층별 스탯 배율 (`floor_no` 키, **FK 아님**)
| 컬럼 | 타입 |
|------|------|
| id / floor_no | |
| hp_mult / atk_mult | number |

**events** — 이벤트
| 컬럼 | 타입 |
|------|------|
| id / name | |
| floor_min / probability | number |
| reward_type / risk_type | string |

**shop_items** — 상점 아이템
| 컬럼 | 타입 |
|------|------|
| id / item_id | (item_id → items.id) |
| base_price / appear_rate | number |

**run_modifiers** — 런 변경자
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (boon/curse) |
| stat_affected / modifier | |

## 관계
```
characters.starting_item_id → items.id
shop_items.item_id          → items.id
```
> 주의: `floor_scaling.floor_no`는 `floors.floor_no`와 값이 같아도 FK 아님. `set_relation` 호출 금지.
