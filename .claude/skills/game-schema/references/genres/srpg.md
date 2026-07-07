# SRPG 전략 (srpg) — 스키마 사양

> 이 파일이 `srpg` 테이블·컬럼 사양의 단일 출처(SSOT)다. 충돌 시 이 파일이 우선한다.
> 핵심 = 성장률(growth rate). `growth_type` 미사용. units의 `growth_*`(%) 성장률을 `unit_levels`로 전개.

## 테이블 (6개 메타 + 1개 전개)

**units** — 유닛 (메타)
| 컬럼 | 타입 |
|------|------|
| id / name | |
| class_id | string (→ classes.id) |
| base_hp / base_atk / base_def | number |
| base_mov / base_range | number |
| growth_hp / growth_atk / growth_def | number (성장률 %) |

**unit_levels** — 전개 (성장률 기반 산출, `generate_curve` 변형 사용)
| 컬럼 | 타입 |
|------|------|
| id / unit_id | (unit_id → units.id) |
| level / hp / atk / def | number |

**classes** — 병종
| 컬럼 | 타입 |
|------|------|
| id / name | |
| tier | number |
| move_type | string (infantry/cavalry/flying) |
| promote_to_id | string (→ classes.id **자기참조**, 승급 대상) |

**weapons** — 무기
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (sword/lance/axe/bow/magic) |
| might / hit / weight | number |
| range_min / range_max | number |

**weapon_triangle** — 무기 상성표
| 컬럼 | 타입 |
|------|------|
| id / attacker_type / defender_type | |
| hit_bonus / damage_bonus | number |

**terrain** — 지형
| 컬럼 | 타입 |
|------|------|
| id / name | |
| def_bonus / avoid_bonus / move_cost | number |

**maps** — 맵
| 컬럼 | 타입 |
|------|------|
| id / name | |
| chapter_no / width / height / turn_limit | number |
| objective | string (rout/seize/survive) |

## 관계
```
units.class_id        → classes.id
unit_levels.unit_id   → units.id
classes.promote_to_id → classes.id  (자기참조 — promote_to_id가 NULL이면 최고 병종)
```
