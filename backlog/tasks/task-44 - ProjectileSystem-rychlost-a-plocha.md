---
id: TASK-44
title: 'ProjectileSystem — rychlost projektilů a spell area'
status: Done
assignee: []
created_date: '2026-05-22'
labels:
  - game-logic
dependencies:
  - TASK-42
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zapojit `projectileSpeedMultiplier` a `spellAreaMultiplier` do `ProjectileSystem`.
Spell area vyžaduje přechod z hit detekce bod-vs-kruh na kruh-vs-kruh.

### `ProjectileSystem.ts` — rychlost

```typescript
// při fire():
const baseSpeed = SKILL_SPEED_MAP[skillType]  // 70 nebo 28 cm/s
const speed = baseSpeed * upgrades.projectileSpeedMultiplier
const flightTimeMs = (distancePx / (speed * PIXELS_PER_CM)) * 1000
```

### Přechod na kruh-vs-kruh hit detekci

Aktuálně: projektil je bod, testuje se `distToZoneCenter < zoneRadius`.
Nově: projektil má vlastní radius `r = PROJECTILE_BASE_RADIUS_CM * spellAreaMultiplier * PIXELS_PER_CM`.

Hit detekce: `distToZoneCenter < zoneRadius + projectileRadius`

```typescript
// constants.ts
export const PROJECTILE_BASE_RADIUS_CM = 0.15  // výchozí — laditelné

// ProjectileSystem nebo Enemy.getHitResult() dostane projectileRadius jako parametr
```

**Poznámky:**
- `PROJECTILE_BASE_RADIUS_CM` = 0.15 cm při `spellAreaMultiplier = 1.0` → nezměnitelná základní přesnost
- Spell area tier 1 (×1.20) → radius 0.18 cm, tier 3 (×1.60) → 0.24 cm
- Self-heal kouzla (budoucí) dostanou `spellAreaMultiplier = 1.0` (ignorují upgrade) — toto se řeší v task kde se přidají
- `fireball` má pomalejší projektil ale spell area rozšíří jeho explozi stejně jako ostatní

### Spell-specific area (volitelné rozšíření v tomto tasku)

Pokud je čas: skill-specific `areaApplicable: boolean` flag v budoucích `SkillDef` definicích.
V tomto tasku stačí globální multiplier pro všechny stávající spelly.

## Game Design testy

Scénáře v `src/tests/game-design/spellArea.spec.ts`:

- **Regrese bez upgradů**: `PROJECTILE_BASE_RADIUS_CM` tak malé (≤ 0.05 cm), aby výsledky hit detekce byly identické s existujícími testy — nesmí rozbít stávající game design testy
- **Spell area benefit pro casual**: simulovat 100 náhodných výstřelů u Goblin Scout; `spell_area_1` (×1.20) musí zvýšit hit rate oproti baseline (bez upgradu); kvantifikovat improvement
- **Projectile speed + TTK**: s `proj_speed_3` (×1.50) musí fireball doletit k enemy o ≥ 30 % rychleji → celkový encounter time pro power usera klesá
- **Near-miss boundary**: výstřel na vzdálenost `zoneRadius + projectileRadius - ε` → HIT; na `zoneRadius + projectileRadius + ε` → MISS
- Čísla odvozena od `PROJECTILE_BASE_RADIUS_CM`, `UPGRADE_NODES`, `PIXELS_PER_CM` z `constants.ts`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 S `proj_speed_2` (1.30×): fireball letí 1.30× rychleji (flightTimeMs je kratší)
- [x] #2 S `spell_area_1` (1.20×): projektil s radius 0.18 cm — výstřel těsně mimo hit zónu ale v nové ploše → HIT (ne MISS)
- [x] #3 Bez upgradů: chování identické s dnešním (PROJECTILE_BASE_RADIUS_CM ≤ 0.05 cm nerozbije existující testy)
- [x] #4 Unit testy v `ProjectileSystem.test.ts` nebo `Enemy.test.ts`
- [x] #5 Game design testy v `spellArea.spec.ts` procházejí (`npm run test:design`)
<!-- AC:END -->
