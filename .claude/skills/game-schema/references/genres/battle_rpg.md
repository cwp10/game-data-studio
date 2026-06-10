# 턴제/액션 RPG (battle_rpg) — 스키마 사양

> 단일 출처: `game-data-feature/_workspace/00_genre_contract.md §5.4`
> `character_levels`가 하이브리드 전개 테이블, `exp_curves`는 별도 일반 테이블(레벨업 경험치).

## 테이블 (7개 메타 + 1개 전개)

**characters** — 캐릭터 (메타)
| 컬럼 | 타입 |
|------|------|
| id / name / element / role | |
| base_hp / base_atk / base_def / base_spd / crit_rate | number |
| growth_type | string (linear/power/exponential) |

**character_levels** — 전개 (`generate_curve` 산출)
| 컬럼 | 타입 |
|------|------|
| id / character_id | (character_id → characters.id) |
| level / hp / atk / def / spd | number |

**skills** — 스킬
| 컬럼 | 타입 |
|------|------|
| id / character_id / name | (character_id → characters.id) |
| type | string (active/passive) |
| damage_ratio / sp_cost | number |
| element / target | string (target: single/all) |

**equipment** — 장비
| 컬럼 | 타입 |
|------|------|
| id / name / slot / stat_type / stat_value | |

**elements** — 속성 상성표
| 컬럼 | 타입 |
|------|------|
| id / attacker_element / defender_element | |
| multiplier | number (피해 배율) |

**enemies** — 적
| 컬럼 | 타입 |
|------|------|
| id / name / element | |
| hp / atk / def / spd | number |
| is_boss | boolean |

**chapters** — 챕터/스테이지
| 컬럼 | 타입 |
|------|------|
| id / name | |
| chapter_no / stage_no / recommend_level / exp_reward | number |
| enemy_id | string (→ enemies.id) |

**exp_curves** — 경험치 곡선 (일반 테이블, 전개 아님)
| 컬럼 | 타입 |
|------|------|
| id / level / exp_required | |

## 관계
```
character_levels.character_id → characters.id
skills.character_id           → characters.id
chapters.enemy_id             → enemies.id
```
