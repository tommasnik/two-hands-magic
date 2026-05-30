# Enemy Attack & Behavior Framework

> Architektura systému, kterým **každý nepřítel útočí na hráče**. Cíl: enemy = deklarativní
> konfigurace (graf stavů) — žádný per-enemy branching v kódu. Jeden mechanismus řídí
> animace, útoky i jejich sekvence/větvení současně.

Tento dokument je závazný kontrakt. Implementace ho má naplnit, ne reinterpretovat.
Pokud při implementaci narazíš na rozpor s tímto dokumentem, **zastav a zeptej se** — neměň
design potichu.

---

## 1. Proč a co nahrazuje

Dnes existuje `EnemyAttackSystem` — **bezstavový weighted-random picker** s nezávislými
cooldowny (`EnemyAttackDef[]`). Umí jen „vyber ready útok dle váhy, vypal missile". Neumí:

- per-útok animaci (natvrdo `enemy.playAnimation('attack')`),
- sekvence a větvení (curse → fireball, idle → attack → jiný attack → combat idle),
- podmíněné přechody (pod 50 % HP útoč jinak),
- melee (jen letící orby),
- načasování zásahu na frame animace.

Framework tohle nahrazuje **orientovaným grafem stavů per enemy** (`EnemyBehaviorRunner`).
Staré `EnemyDef.attacks[]` a weighted-picker logika v `EnemyAttackSystem` **se odstraní**
(nikdo je v `ENEMY_POOL` nepopuluje, žádná zpětná kompatibilita se nedrží).

Co se **recykluje** ze `EnemyAttackSystem`: let projektilů (flight-time), `MissileHitEvent`
a stun-pauza — vyčleněné do samostatné delivery vrstvy (viz §4).

---

## 2. Vrstvy a hranice (zero-Phaser pravidlo platí)

```
src/game/  (pure TS, žádný Phaser)
  systems/
    EnemyBehaviorRunner.ts   ← „mozek": graf, exit triggery, guardy, výběr hran, release-frame
    DeliverySystem.ts        ← in-flight deliveries (orb let / overlay connect timing), hit eventy
  enemyGraphs.ts             ← graf konfigurace všech 11 nepřátel (data)
  constants.ts               ← pojmenované číselné konstanty (damage, cooldown, dwell, speed)
  GameStateMachine.ts        ← orchestrace: tick runner+delivery, aplikace zásahů, řízení anim

src/scenes/ (+ rendering/)  (Phaser-side)
  rendering/DeliveryVisualRegistry.ts  ← visualKey → DeliveryVisual
  rendering/visuals/*.ts                ← jednotlivé vizuály (procedurální i spritesheet)
  BattleScene.ts                        ← JEN deleguje na registry, žádná render logika navíc
```

**Tvrdé pravidlo:** `game/` nikdy neimportuje Phaser. Delivery v `game/` nese pouze
`visualKey: string` (čistá data). Veškerá kresba žije v render vrstvě a `BattleScene`
neobsahuje žádný `case`/kreslení per vizuál — pouze iteruje deliveries a deleguje.

---

## 3. State-graph (jádro)

Každý enemy má `BehaviorGraph`: pojmenované uzly + počáteční uzel. Runner drží právě jeden
aktivní uzel; když uzel skončí (exit trigger), vyhodnotí hrany a přejde do dalšího.

### 3.1 Uzel (`BehaviorNode`)

```ts
interface BehaviorNode {
  /** Klíč uzlu (unikátní v rámci grafu). */
  id: string
  /** Která sprite-animace nepřítele se v tomto uzlu přehrává. */
  animKey: string
  /**
   * Fallback když animKey v manifestu chybí (crystal-spider, ice-giant nemají idle):
   * drž jediný frame jiné animace. animKey se pak interpretuje jako 'hold'.
   */
  holdFrame?: { animKey: string; frameIndex: number }
  /** Co uzel ukončí a spustí vyhodnocení hran. */
  exitTrigger: ExitTrigger
  /** Volitelný útok vyslaný na release framu. Uzel bez attack = čistá animace/idle. */
  attack?: AttackSpec
  /** Hrany do dalších uzlů. Prázdné = terminální (graf se restartuje do start uzlu). */
  edges: Edge[]
}
```

### 3.2 Exit trigger (hybrid — viz rozhodnutí)

```ts
type ExitTrigger =
  | { kind: 'animationComplete' }   // one-shot anim uzel skončí dohráním (attack/cast)
  | { kind: 'afterMs'; ms: number } // loop/idle uzel: dwell po daný čas
  | { kind: 'condition'; guard: Guard } // skončí jakmile guard začne platit
```

- One-shot animace (`loop: false`) → `animationComplete`.
- `idle`/`combat_idle` (loop) → `afterMs(dwell)`, kde `dwell` je pojmenovaná konstanta.
- `condition` umožní „čekej v idle dokud nenastane X".

### 3.3 Hrana (`Edge`) — váhy + volitelný guard

```ts
interface Edge {
  /** Cílový uzel. */
  to: string
  /** Relativní váha pro vážený random mezi hranami, jejichž guard platí. */
  weight: number
  /** Volitelná podmínka; když chybí = 'always' (vždy způsobilá). */
  guard?: Guard
}
```

**Vyhodnocení při exitu uzlu:** vezmi hrany, jejichž `guard` platí (nebo chybí) →
mezi nimi vážený random dle `weight`. Sekvence se modelují strukturou grafu
(dedikovaný uzel s jedinou `always` hranou), větvení podle stavu guardem.

### 3.4 Guard (malá typovaná sada)

```ts
type Guard =
  | { kind: 'always' }
  | { kind: 'enemyHpBelow'; pct: number }   // pct v 0..1
  | { kind: 'enemyHpAbove'; pct: number }
  | { kind: 'attackCountAtLeast'; n: number } // kolik útoků enemy už vyslal
```

Sada je **úmyslně malá**. Rozšiřovat jen po dohodě. (Pozn.: guardy závislé na status
efektech hráče — např. „je curse aktivní" — nejsou součástí scope, viz §7.)

### 3.5 Příklad grafu (mage: curse → fireball, jen ilustrace tvaru)

```ts
{
  start: 'idle',
  nodes: {
    idle:          { animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: MAGE_IDLE_DWELL_MS },
                     edges: [{ to: 'cast_curse', weight: 1 }] },
    cast_curse:    { animKey: 'cast_spell', exitTrigger: { kind: 'animationComplete' },
                     attack: { /* effect-only — viz §7, zatím neimplementováno */ },
                     edges: [{ to: 'cast_fireball', weight: 1 }] }, // 'always'
    cast_fireball: { animKey: 'cast_fireball', exitTrigger: { kind: 'animationComplete' },
                     attack: { /* ORB, dmg, releaseFrame */ },
                     edges: [{ to: 'combat_idle', weight: 1 }] },
    combat_idle:   { animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: MAGE_RECOVER_MS },
                     edges: [{ to: 'idle', weight: 1 }] },
  },
}
```

---

## 4. Delivery (sjednocený model útoku)

Útok není „okamžité odečtení HP". Na **release framu** sprite-animace uzlu se vyemituje
**delivery** — objekt s vlastním vizuálem a trajektorií, **nezávislý na sprite animaci**
nepřítele. Damage/efekt se aplikuje až když delivery **„dosedne" (connect)** na hráče.

```ts
interface AttackSpec {
  /** HP odečtené hráči na connect. 0 pro effect-only. Unit: HP. */
  damage: number
  /** Index framu animace uzlu, na kterém se delivery vyšle. */
  releaseFrame: number
  /** Druh doručení. */
  kind: 'orb' | 'overlay' | 'effect'   // 'effect' = hook, zatím bez implementace (§7)
  /** Klíč vizuálu pro render vrstvu (čistá data, žádný Phaser). */
  visualKey: string
  /** Jen pro 'orb': rychlost letu. Unit: cm/s. */
  projectileSpeedCmS?: number
  /** Jen pro 'orb': offset od středu enemy, odkud orb vyletí. Unit: px. */
  castPoint?: { dx: number; dy: number }
  /** Jen pro 'overlay': v jakém okamžiku své animace overlay „kousne" (connect). Unit: ms. */
  overlayConnectMs?: number
}
```

### 4.1 Tři druhy doručení

| kind      | Trajektorie / vizuál                                   | Kdy padne dmg                         |
|-----------|--------------------------------------------------------|---------------------------------------|
| `orb`     | Letící orb enemy → hráč za flight-time (dnešní missile)| na dosednutí (progress ≥ 1)           |
| `overlay` | Efektová anim **přímo u hráče** (zuby klapnou, GameBoy)| na `overlayConnectMs` během anim      |
| `effect`  | Žádný damage, jen status efekt (curse)                 | — **mimo scope, jen hook** (§7)       |

### 4.2 `DeliverySystem` (pure TS)

Vyčleněná missile-mechanika z dnešního `EnemyAttackSystem`:

- `spawn(delivery)` — runner volá na release framu.
- `update(dt, ...)` — posune orb po trajektorii / odpočítá overlay connect; emituje
  `DeliveryHitEvent { damage }` v okamžiku connect.
- `getActive()` — serializovatelný snapshot pro render vrstvu (obsahuje `visualKey`,
  `kind`, pozici/progress, cíl).
- Deliveries jsou **fire-and-forget**: nový útok může začít, zatímco starý orb ještě letí.
  Stav delivery je nezávislý na stavu grafu.

---

## 5. Render vrstva (Phaser-side, mimo BattleScene)

```ts
interface DeliveryVisual {
  spawn(snapshot, scene): void
  update(snapshot, dtMs): void
  onConnect(snapshot): void   // efekt klapnutí/dopadu
  destroy(): void
}
```

- `DeliveryVisualRegistry`: `visualKey` → instance `DeliveryVisual`.
- Implementace mohou být **procedurální** (canvas primitiva — dva trojúhelníky = zuby,
  scale/alpha pop) **i spritesheet** (přehraje frame sekvenci). Scéna nerozlišuje.
- `BattleScene` v render kroku: `for (d of deliveries) registry.get(d.visualKey).render(d)`.
  **Žádná kresba/větvení per vizuál ve scéně.** Nový vizuál = jeden soubor v `rendering/visuals/`,
  registrace v registry, nula změn v BattleScene.

---

## 6. Runtime detaily

- **Stun** (crit-stun upgrade): zmrazí **celý graf** — `runner.tick()` = no-op (frame freeze
  aktuálního uzlu i jeho exit-trigger časovače). Žádné vyhodnocení hran. Po skončení stunu
  pokračuje z místa. Již letící deliveries letí dál nezávisle.
- **Chybějící idle** (crystal-spider, ice-giant): klidový uzel použije `holdFrame`
  (drží `attack[0]` po dobu `dwell`). Žádné nové assety, žádný zásah do manifestů.
- **Úvodní grace okno:** start v `idle` s `afterMs(dwell)` dává hráči okno před prvním útokem
  (nahrazuje dnešní „reset cooldownu na plnou délku").
- **Restart grafu:** terminální uzel (bez hran) → runner skočí zpět do `start`.
- **`attackCount`:** runner inkrementuje při každém vyslaném `attack` (pro guard).

---

## 7. Mimo scope (explicitně)

- **Status efekty / curse** (`damageTakenMultiplier`, debuffy na hráči). `kind: 'effect'`
  a effect-only delivery zůstávají jako **hook v modelu**, ale bez implementace. Žádný
  `StatusEffectSystem`. Až přijde, napojí se na `_applyPlayerHit` (násobení dmg) a na guardy.
- **Game-design specs** pro útoky. **Vědomá odchylka od DoD v CLAUDE.md** — pro tento
  framework se píší **pouze unit testy** (viz §8). Pocit obtížnosti se neověřuje specs.
- **Dogenerování chybějících idle animací** v PixelLabu (řeší se holdFrame fallbackem).
- **Tuning hodnot** (které z 11 jsou melee vs ranged, konkrétní damage/cooldown/dwell):
  implementace navrhne defaulty dle archetypu, ladí se v `constants.ts` později.

---

## 8. Testy

**Pouze unit testy** (Vitest), 100 % coverage na nový `src/game/**` kód:

- `EnemyBehaviorRunner`: exit triggery (animationComplete / afterMs / condition), vyhodnocení
  guardů, vážený výběr hran (deterministický přes injektované RNG), release-frame spawn,
  inkrementace attackCount, stun freeze (tick = no-op), holdFrame fallback, restart grafu.
- `DeliverySystem`: orb flight-time a connect, overlay connect timing, fire-and-forget
  (více souběžných deliveries), `DeliveryHitEvent` damage.

Žádné `src/tests/game-design/` specs pro tuto featuru.

---

## 9. Konfigurace per enemy

- Grafy všech 11 nepřátel žijí v **`src/game/enemyGraphs.ts`** (pure TS, data).
  `EnemyDef.behaviorGraph` (v `constants.ts`) odkazuje import.
- **Žádná hardcoded čísla v grafech.** Damage, cooldown/dwell, projectile speed = pojmenované
  konstanty v `constants.ts` s JSDoc (what / unit / affects). Graf je jen referencuje.
- **Rozsah:** nakonfigurovat **všech 11**. Většina = jednoduchý `idle → attack → idle`
  (orb nebo overlay dle archetypu). crystal-spider (attack/mandible/bite) a ice-giant
  (attack/throw) = bohatší multi-attack graf z jejich extra animací.
