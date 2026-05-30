# Retrospektiva: přidání nového skillu (task-61)

## Kontext

Task-61 přidal dva nové skilly: **Ice Crystal** (projektil + freeze) a **Lightning Blast** (instant hit + discharge vizuál). Implementace proběhla přes 6 podtasků (61.1–61.6).

---

## Kam všude se dělají změny

### 1. `src/types/index.ts`
- Přidání nové hodnoty do `SkillType` union
- Rozšíření `GameState` o nové stavové proměnné (např. `enemyFrozenUntilMs`, `lightningDischargeUntilMs/Result/Target`)

### 2. `src/game/constants.ts`
- Nová sekce konstant pro skill: speed, rotation period, damage min/max, efekt duration
- Rozšíření `DEFAULT_SKILL_CONFIG` (slot assignment)

### 3. `src/game/GameStateMachine.ts`
- Logika fire handleru (pro projektilové skilly: `projectileSystem.fire()`, pro instant: přímý hit)
- Stavové proměnné + jejich reset v `_resetBattle()`
- Vystavení do `getState()` snapshot
- Test-only metody (`_fireLightningBlastForTesting`, `_applyHitForTesting`)

### 4. `src/game/systems/ProjectileSystem.ts`
- `speedForSkill()` — přidání case pro nový skill typ (pro projektilové skilly)

### 5. `src/game/systems/DamageSystem.ts`
- Registrace damage min/max pro nový skill type

### 6. `src/game/entities/touchPoints.ts` / `constants.ts`
- Slot layout — přiřazení skillu do slotu (side + slotIndex)

### 7. `src/scenes/rendering/SkillRenderer.ts`
- `drawProjectile()` — nový case pro vizuál projektilu
- Nová metoda pro overlay efekt (frozen overlay, discharge line)

### 8. `src/scenes/BattleScene.ts`
- Volání nové overlay metody v `onRender()`

### 9. `src/tests/` (unit + game-design)
- Unit testy pro herní mechaniku v `gameStateMachine.test.ts`
- Případně game-design spec

### 10. `src/tests/helpers/testBridge.ts`
- Nová helper metoda pro manuální testování efektu z Playwright

---

## Co šlo dobře

- **Oddělení vrstev funguje.** Čistá hranice `src/game/` (pure TS) vs `src/scenes/` (Phaser/canvas) se drží bez průniků. Každý task šel vyvíjet a testovat izolovaně.
- **SkillRenderer jako single point.** Když byl pro ice crystal vytvořen `SkillRenderer`, lightning blast ho jednoduše rozšířil. Nevznikl duplicitní kód v BattleScene.
- **Constants jako single source of truth.** Balancing change (damage -50%) byl one-liner. Žádné magic numbers rozesety po souborech.
- **Test bridge.** Možnost zavolat `window.__game.fireLightningBlast('CRIT')` z Playwright umožnila okamžitý vizuální smoke test bez nutnosti hrát hru.
- **Taskování.** Každý podtask byl jasně ohraničený a šel commitnout samostatně.

---

## Co šlo špatně

- **Vizuální iterace vyžadovala více kol.** Pro ice crystal i lightning blast proběhlo po merge několik fix commitů (frozen overlay — 2 redesigny; lightning — segment count, tesla coil). Vizuální výsledek nebyl dostatečně specifikován v AC.
- **ProjectileSystem.speedForSkill() se zapomnělo.** Pro ice crystal chyběl case v `speedForSkill()` — byl doplněn až ve fixu v task-61.5, ne v task-61.2 kde vznikla logika. Odhaleno až při renderingu.
- **`getSkillColor()` neexistovala na začátku.** Barvy pro nové skilly chyběly v existující helper funkci — slot ring, laser a fight overview zobrazovaly fallback barvy. Muselo se dohánět ve fix commitu.
- **Ice crystal chybí idle animace v assetu.** Mechanika a render je hotová, ale sprite systém je nekompletní — zaznamenaný stav `ice-giant` (chybí idle) odráží podobný problém pro enemy skilly.
- **testBridge neměl helper pro lightning blast** — přidáváno dodatečně, ne jako součást task-61.6 AC.
- **Balancing přichází ad-hoc.** Damage hodnoty se ladí manuálně po subjektivním pocitu, ne na základě game design testu.

---

## Body k vylepšení (z lightning blast zkušenosti)

1. **Vizuální AC mají obsahovat referenční popis nebo sketch.** "Klikatá čára" bez specifikace počtu segmentů vedlo ke dvěma iteracím po merge.
2. **Checklist pro nový skill** — šablona v CLAUDE.md s explicitním polem „zkontroluj `speedForSkill()`, `DamageSystem`, `getSkillColor()`, `DEFAULT_SKILL_CONFIG`" eliminuje zapomenuté kroky.
3. **testBridge helper** pro vizuální efekty patří do AC, ne jako doplněk.
4. **Balancing task** — damage/duration hodnoty mít jako samostatné AC s game-design testem (power user TTK), ne doplňovat post-hoc.

---

## Srovnání: Ice Crystal vs Lightning Blast

### Ice Crystal

| Oblast | Rozsah |
|--------|--------|
| Mechanika | Projektil + freeze efekt (blokuje behavior runner, holdFrame) |
| GameState | +`enemyFrozenUntilMs` |
| Render | Hex shard projektil + frozen crystal column overlay |
| Iterace vizuálu | **3 fix commity** — star burst → 5 sloupců → 1 velký 3D sloupec |
| Unit testy | Ano — freeze mechanic, refreeze, holdFrame |
| Game-design testy | Nepřímo (twoSkillConfig.spec.ts) |
| Složitost mechaniky | Vyšší — interakce s behavior runnerem, stun systémem, animací |

### Lightning Blast

| Oblast | Rozsah |
|--------|--------|
| Mechanika | Instant hit, žádný projektil — discharge state v GameState |
| GameState | +`lightningDischargeUntilMs/Result/Target` |
| Render | Klikatá čára, tesla coil (3 paths, cycling 150ms) |
| Iterace vizuálu | **2 fix commity** — segment count, jump interval |
| Unit testy | Ano — discharge duration mapping, routing |
| Game-design testy | Chybí |
| Složitost mechaniky | Nižší — instant hit, žádná interakce se systémy animace |

### Klíčové rozdíly a co z nich plyne

**Ice Crystal byl mechanicky složitější** — freeze musel interagovat s behavior runnerem, stun systémem a animacemi. Přesto byl vizuální výsledek horší na první pokus (3 iterace overlay). Důvod: mechanická složitost absorbovala pozornost, vizuální spec zůstala vágní.

**Lightning Blast byl mechanicky jednodušší** (instant hit existoval jako pattern z white_shot), ale vizuální efekt byl nový (čára vs. projektil). Iterace byly kratší (2 fix commity), protože kontext byl čerstvý a uživatel byl přítomen v session.

**Oba skilly chybí game-design testy** pro vizuální trvání. Existují unit testy pro mechaniku, ale není specifikováno např. „casual player si všimne freeze efektu" nebo „discharge je viditelný dost dlouho na GRAZE".

---

## Dodatečné body k vylepšení (ze srovnání)

5. **Vizuální iterace lze zkrátit synchronním review.** Oba skilly potřebovaly redesign overlay po merge. Řešení: screenshot před commitem jako součást AC (jako AC #6 u task-61.6), ale s uživatelským schválením před mergem, ne po.
6. **Game-design testy pro discharge/freeze duration.** Aktuálně: CRIT=600ms, HIT=300ms, GRAZE=150ms — tato čísla nejsou nijak ověřena. Test by mohl simulovat, že hráč vidí efekt dost dlouho na to, aby pochopil výsledek.
7. **Skill šablona v backlogu.** Task-61 byl rozdělen na 6 podtasků ručně. Template s fixními podtasky (1. types/constants, 2. mechanic, 3. render, 4. balance test) by urychlil přípravu dalšího skillu.
8. **`ProjectileSystem.speedForSkill()` → generická mapa.** Místo switch/case s case per skill: `const SKILL_SPEEDS: Partial<Record<SkillType, number>> = { ice_crystal: ICE_CRYSTAL_SPEED_CM, ... }` — přidání nového skillu nevyžaduje modifikaci funkce, jen přidání záznamu.
9. **Freeze a discharge jako generický efekt.** Oba jsou „timed overlay state" s reset při death/level. Mohlo by existovat generické `timedEffects: { [key: string]: { untilMs: number } }` v GameState, místo per-skill proměnných.
