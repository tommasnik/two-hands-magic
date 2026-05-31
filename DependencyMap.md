# Two Hands Magic — Dependency Map

> Soupis závislostí systémů. Pomáhá rozhodovat, co lze oddělit a v jakém pořadí.
> Platí pro cílový stav (viz GameDesign.md §10), ne jen pro aktuální kód.

---

## 1. Systémová mapa (přehled)

```
[TouchInput]
    │
    ▼
[InputManager] ──────────────────────────────────┐
    │                                             │
    ▼                                             ▼
[AimSystem]                               [SlotState]
    │                                             │
    ▼                                             ▼
[ProjectileSystem] ◄── [SkillModule] ◄── [SkillSlotConfig]
    │                        │
    │                        ├── [DamageSystem]
    │                        ├── [EffectSystem]     (plánováno)
    │                        └── [InteractionSystem] (plánováno)
    │
    ▼
[HitZoneSystem] ◄── [MaskHitDetector]
    │
    ▼
[DamageSystem] ──► [PlayerState]
    │
    └──► [EnemyState] ◄── [EnemyBehaviorRunner]
                │               │
                │          [DeliverySystem]
                │
                └──► [StatusEffectState]  (plánováno)
                          │
                          └──► [InteractionSystem]  (plánováno)

[GameStateMachine]  ◄── orchestruje vše výše
    │
    ├── [PhaseManager]  (loading / battle / fight_overview / game_over)
    ├── [FightStatistics]
    ├── [PlayerProgression]  (XP, level-up, upgrade tree)
    └── [CampaignManager]  (pořadí enemíů, podmínky výhry)
```

---

## 2. Závislosti per systém

### 2.1 SkillModule (cílový stav, neexistuje jako modul)

**Závisí na:**
- `constants/{skill-name}` — damage, castTime, spell area, speed
- `types` — SkillType, AttackSpec, EffectSpec

**Závisí na něm:**
- `ProjectileSystem` — vytváří projektil dle parametrů skillu
- `DamageSystem` — čte damage min/max, crit modifier
- `EffectSystem` — aplikuje efekty (freeze, discharge) — plánováno
- `InteractionSystem` — čte interaction rules — plánováno
- `SlotRenderer` — čte vizuální klíče pro rendering

**Kde je teď problém:**
SkillType je union v `types/index.ts`. Přidání skillu = rozšíření unionu + switch/case
v DamageSystem, GameStateMachine a renderer. OCP porušen na 4+ místech.

---

### 2.2 DamageSystem

**Závisí na:**
- `SkillModule` (nebo konstanty skillu) — damage hodnoty, crit modifier
- `GlobalUpgradeState` — multipliery z upgradů (critDamageMultiplier, spellAreaMultiplier)
- `HitZoneResult` — CRIT / HIT / GRAZE / MISS
- `ChainBonus` — quick_chain upgrade efekt

**Závisí na něm:**
- `GameStateMachine` — volá `calculateDamage()` při každém zásahu
- `FightStatistics` — čte výsledky pro DPS/accuracy metriky

**Interakce (budoucí):**
- `InteractionSystem` bude DamageSystem rozšiřovat o bonus damage při combo stavech

---

### 2.3 EnemyBehaviorRunner

**Závisí na:**
- `BehaviorGraph` — deklarativní konfigurace uzlů + hran (v `enemyGraphs.ts`)
- `RNG` — injektovaný (deterministické testy)
- `EnemyState` — HP pro guardy (enemyHpBelow, enemyHpAbove)

**Závisí na něm:**
- `GameStateMachine` — volá `runner.tick(dt)` každý frame
- `DeliverySystem` — runner spawní delivery na release framu

**Izolace:** Runner je pure TS, bez Phaser, plně unit-testovatelný. ✅

---

### 2.4 DeliverySystem

**Závisí na:**
- `AttackSpec` — damage, visualKey, kind (orb/overlay), flight params
- `EnemyPosition` — odkud orb startuje
- `PlayerPosition` — cíl

**Závisí na něm:**
- `GameStateMachine` — volá `update()`, odebírá `DeliveryHitEvent`
- `DeliveryVisualRegistry` (Phaser) — dostává snapshot pro rendering

**Izolace:** Pure TS, Phaser-free. ✅

---

### 2.5 PlayerProgression (upgrade tree + leveling)

**Závisí na:**
- `FightStatistics` — XP zdroj (kills)
- `constants/upgrades` — UPGRADE_NODES definice

**Závisí na něm:**
- `DamageSystem` — čte `GlobalUpgradeState.critDamageMultiplier`, atd.
- `AimSystem` — čte `castTimeMultiplier`
- `ProjectileSystem` — čte `projectileSpeedMultiplier`, `spellAreaMultiplier`
- `GameStateMachine` — řídí flow level-up (pendingLevelUp gate)

**Budoucí závislost:**
- Skill leveling bude číst `FightStatistics` per-slot a mutovat skill atributy
- Player atributy (STR/DEX/VIT) ovlivní více systémů než jen `GlobalUpgradeState`

---

### 2.6 GameStateMachine

**Závisí na VŠEM:**
- InputManager, AimSystem, ProjectileSystem
- EnemyBehaviorRunner, DeliverySystem
- DamageSystem, HitZoneSystem, MaskHitDetector
- PlayerProgression, FightStatistics
- CampaignManager (pořadí nepřátel)

**Závisí na něm:**
- `BattleScene` — volá `update(dt, inputs)`, čte `getState()`
- E2E testy — přes `window.__game` bridge

**Problém:** GSM dělá příliš mnoho. Je to orchestrátor, ale absorbuje i logiku,
která by měla být v subsystémech. Refactoring cíl: GSM = jen koordinace volání,
žádná inline herní logika.

---

### 2.7 BattleScene (Phaser)

**Závisí na:**
- `GameStateMachine.getState()` — čte stav pro rendering
- `InputManager` — předává Phaser touch eventy
- `DeliveryVisualRegistry` — renderuje delivery efekty
- `SkillRenderer`, `EnemyRenderer`, `HUDRenderer` — (cílový stav, zatím inline)

**Závisí na něm:**
- Nic (leaf node renderingu)

**Problém:** 1040 řádků. Mixuje rendering EnemyDef sprite logiku, HUD, delivery vizuály,
skill projekily. Cíl: split na Renderer submoduly (viz GameDesign.md §10.3).

---

## 3. Závislosti na `constants.ts`

constants.ts (1029 řádků) importují tyto moduly:

| Modul                | Co importuje                                   |
|----------------------|------------------------------------------------|
| DamageSystem         | SKILL_DAMAGE_*, CRIT_DAMAGE_MULTIPLIER, …      |
| AimSystem            | SKILL_ROTATION_PERIOD_MS, AIM_GAIN, …          |
| ProjectileSystem     | PROJECTILE_SPEED_CM, FIREBALL_SPEED_CM, …      |
| EnemyBehaviorRunner  | ENEMY_* dwell/cooldown hodnoty                 |
| BattleScene          | GAME_WIDTH, GAME_HEIGHT, TP_* pozice           |
| TouchPoints          | TP_GREEN, TP_VIOLET, … (6 touch pointů)        |
| upgrades.ts          | UPGRADE_NODES + efektové konstanty             |
| enemyGraphs.ts       | enemy-specific dwell a damage hodnoty          |
| GameStateMachine     | PLAYER_MAX_HP, XP thresholds, …               |

**Cíl refactoringu:** Rozdělit na domény. Každý modul importuje jen svou doménu.
Viz GameDesign.md §10.2.

---

## 4. Plánované nové systémy a jejich závislosti

### 4.1 StatusEffectSystem (plánováno)

```
StatusEffectSystem
  závisí na: EnemyState (kde ukládá aktivní statusy)
  závisí na něm: InteractionSystem, DamageSystem, EnemyRenderer (vizuál statusu)
```

Aktivní statusy enemy: `frozen`, `burning`, `shocked`, …
Každý status má: duration, vizuální efekt, efekt na damage přijatý.

### 4.2 InteractionSystem (plánováno)

```
InteractionSystem
  závisí na: StatusEffectSystem (aktivní stavy enemy)
             SkillModule.interactions (interaction rules per skill)
             DamageSystem (může modifikovat damage)
  závisí na něm: GameStateMachine (volá při každém zásahu)
                 EffectRenderer (volá pro vizuál combo)
```

Rules jsou data (`{ enemyStatus: 'frozen', skillType: 'lightning_blast', result: ... }`).
Žádný switch/case per skill v systémovém kódu.

### 4.3 CooldownSystem (plánováno)

```
CooldownSystem
  závisí na: SkillSlotConfig (cooldown hodnota per skill)
             PlayerProgression (cooldown multiplier z atributů)
  závisí na něm: InputManager (blokuje slot pokud cooldown běží)
                 HUDRenderer (zobrazuje cooldown progress)
```

### 4.4 SkillLevelingSystem (plánováno)

```
SkillLevelingSystem
  závisí na: FightStatistics (usage per slot)
             SkillModule (mutable atributy: damage, castTime, …)
  závisí na něm: DamageSystem (čte aktuální skill level atributy)
                 AimSystem (čte aktuální castTime)
```

### 4.5 CampaignManager (plánováno)

```
CampaignManager
  závisí na: constants/levels (Level[] konfigurace)
             EnemyDef registry (lookup per enemy ID)
  závisí na něm: GameStateMachine (kdo je teď na řadě)
```

---

## 5. Dependency-free jádro (invarianty)

Tyto části **nesmí přibírat závislosti** — jsou základem unit-testability:

| Modul                 | Proč musí být izolovaný                        |
|-----------------------|------------------------------------------------|
| EnemyBehaviorRunner   | Pure TS, testy bez Phaser, deterministické RNG |
| DeliverySystem        | Pure TS, fire-and-forget model                 |
| DamageSystem          | Pure funkce: vstup → výstup                    |
| HitZoneSystem         | Čistá geometrie / maska lookup                 |
| AimSystem             | Čistá fyzika rotace                            |

**Pravidlo:** Žádný z těchto modulů nesmí importovat Phaser ani jiný systém
(jen typy a konstanty).

---

## 6. Pořadí refactoringu (navrhovaná priorita)

Pořadí je od nejmenšího blast-radius k největšímu:

1. **Split constants.ts** — nulové funkční riziko, jen přesun. Nejdřív.
2. **Skill jako modul** — vytvoří jasné hranice pro OCP. Před přidáváním nových skillů.
3. **StatusEffectSystem** — prerequisita pro interaction. Před combo mechanikou.
4. **InteractionSystem** — po StatusEffectSystem.
5. **CooldownSystem** — nezávislý, lze kdykoli.
6. **Split BattleScene** — vizuální refactoring, největší riziko regrese.
7. **Split GameStateMachine** — nejtěžší, nejdůležitější, nakonec.
8. **Level konfigurace** — po stabilizaci EnemyDef modulů.
