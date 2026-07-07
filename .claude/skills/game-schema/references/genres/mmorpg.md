# MMORPG (mmorpg) — 스키마 사양

> 이 파일이 `mmorpg` 테이블·컬럼 사양의 단일 출처(SSOT)다. 충돌 시 이 파일이 우선한다.

## 테이블 (8개 메타 + 1개 전개)

**classes** — 직업 (메타)
| 컬럼 | 타입 |
|------|------|
| id / name | |
| role | string (tank/dps/healer) |
| base_hp / base_atk / base_def | number |
| resource_type | string (mp/rage 등) |
| growth_type | string (linear/power/exponential) |

**class_levels** — 전개 (`generate_curve` 산출)
| 컬럼 | 타입 |
|------|------|
| id / class_id | (class_id → classes.id) |
| level | number |
| hp / atk / def / mp | number |

**skills** — 스킬
| 컬럼 | 타입 |
|------|------|
| id / class_id / name | (class_id → classes.id) |
| type / damage_ratio / cooldown / mp_cost / range | |

**equipment** — 장비
| 컬럼 | 타입 |
|------|------|
| id / name | |
| slot | string (weapon/armor/accessory) |
| grade / stat_type / stat_value | |
| enhance_max | number |

**enhance_table** — 강화 테이블
| 컬럼 | 타입 |
|------|------|
| id | |
| enhance_level / success_rate / cost_gold / stat_bonus | number |

**monsters** — 몬스터
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (normal/elite/raid) |
| hp / atk / def / exp / gold | number |

**dungeons** — 던전/레이드
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (dungeon/raid) |
| recommend_cp | number |
| boss_monster_id | string (→ monsters.id) |
| party_size | number |

**market_items** — 거래소
| 컬럼 | 타입 |
|------|------|
| id / equipment_id | (equipment_id → equipment.id) |
| base_price / supply / demand | number |

**pvp_tiers** — PvP 티어
| 컬럼 | 타입 |
|------|------|
| id / tier_name | |
| mmr_min / mmr_max / reward_gold | number |

## 관계
```
class_levels.class_id     → classes.id
skills.class_id           → classes.id
dungeons.boss_monster_id  → monsters.id
market_items.equipment_id → equipment.id
```
