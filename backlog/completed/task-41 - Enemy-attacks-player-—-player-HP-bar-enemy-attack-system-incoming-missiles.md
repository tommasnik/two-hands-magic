---
id: TASK-41
title: 'Enemy attacks player — player HP bar, enemy attack system, incoming missiles'
status: Done
assignee: []
created_date: '2026-05-22 09:55'
labels:
  - feature
  - combat
  - player
  - enemy
  - ui
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Enemies začnou aktivně útočit na hráče. Hráč má vlastní HP bar a může zemřít — to triggeruje game over (restart od aktuálního levelu).

---

## Datová struktura

### `EnemyAttackDef` (nový typ v `src/types/index.ts`)

```ts
interface EnemyAttackDef {
  name: string              // display name (pro debug / budoucí UI)
  damage: number            // HP které odečte od hráče při zásahu
  cooldownMs: number        // jak dlouho po výstřelu čeká před dalším
  weight: number            // relativní pravděpodobnost výběru (0–1, suma nemusí být 1)
  projectileColor: string   // CSS barva orbu
  projectileSpeedCmS: number  // rychlost missileu, unit: cm/s (jako PROJECTILE_SPEED_CM)
  castPoint: { dx: number; dy: number }  // offset od středu enemy v px; odkud missile vyletí
}
```

`castPoint` je per-attack — různé útoky téhož enemy mohou mít různé origins (pravá ruka, levá ruka, ústa, …).

### `EnemyDef` rozšíření

Přidat volitelné pole `attacks?: EnemyAttackDef[]` do stávajícího `EnemyDef` interface. Enemies bez `attacks` neutočí (zpětná kompatibilita).

---

## Herní mechaniky

### Player HP
- Startuje na 30 HP (konstanta `PLAYER_MAX_HP` v `constants.ts`)
- Škálování s levely: **out of scope**
- HP se resetuje na začátku každého levelu

### Game Over
- Když `playerHp <= 0` → fáze `game_over`
- Game over = restart od aktuálního levelu (ne od levelu 1)
- BattleScene zobrazí "Game Over" text, pak zavolá restart

### Attack výběr
- Každý enemy má vlastní timery pro každý útok (nezávislé cooldowny)
- Jakmile uplyne cooldown útoku, provede se **weighted random výběr** ze všech útoků, jejichž cooldown vypršel
- Výběr: `Math.random()` porovnán s normalizovanými váhami dostupných útoků

### Missile chování
- Origin: `castPoint` z `EnemyAttackDef` — relativní offset od středu enemy (každý útok definuje svůj vlastní původ)
- Target: střed hráče = střed mezi levým a pravým skill kruhem (GAME_WIDTH / 2, LASER_ORIGIN_Y)
- Vizuál: pulzující orb s glow efektem + trail (analogické ke stávajícím projektilům hráče)
- Při dopadu: okamžitý damage (garantovaný, bez dodge mechaniky)

### Hit feedback (při zásahu hráče)
1. Screen flash — červený overlay, krátký fade-out (~300ms)
2. Floating damage number — červené číslo nad player HP barem

---

## UI

### Player HP bar
- Pozice: dole na obrazovce, **pod** touch pointy (mimo herní plochu)
- Analogická k enemy HP baru nahoře
- DOM element (ne Phaser canvas) — konzistentní s `#hud-hp-fill` / `#hud-enemy-name`
- Selector návrh: `#player-hp-fill`, `#player-hp-bar`

---

## Player entita

Přidat nový typ `Player` do `src/types/index.ts`:
```ts
interface Player {
  hp: number       // aktuální HP hráče. Unit: HP.
  maxHp: number    // max HP pro % výpočet baru. Unit: HP.
}
```

`GameStateMachine` drží `Player` instanci analogicky ke `Enemy`. Do `GameState` přidat:
```ts
player: Player
```

Všechny reference na `playerHp` / `playerMaxHp` v BattleScene a testech jdou přes `state.player.hp` / `state.player.maxHp`.

---

## Game Design testy (v `src/tests/game-design/`)

Každý enemy spec musí obsahovat:
- `"pokud hráč neutočí, enemy ho zabije za X sekund"` — testuje attack pressure
- `"power user enemy nestihne zranit"` — testuje, že lze vyhrát bez zranění
- `"casual player ho enemy jednou zraní"` — testuje, že casual pocítí damage pressure

Čísla v testech se odvozují od `constants.ts` (ne hardcoded), takže tweaky konstant testy automaticky zachytí.

---

## Konstanty (vše do `constants.ts`)

```ts
PLAYER_MAX_HP = 30
PLAYER_HP_BAR_HEIGHT_PX = ...
PLAYER_HIT_FLASH_DURATION_MS = 300
PLAYER_HIT_FLOAT_COLOR = '#ff2244'   // barva damage čísla při zásahu hráče
```

---

## Co je OUT OF SCOPE (pro tento task)

- Dodge / block mechaniky
- Healing / boosters
- HP škálování s levely
- Enemy attack animace (jiné než pohyb)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player HP bar je viditelný pod touch pointy po zahájení bitvy
- [x] #2 Player HP bar se zmenšuje při zásahu enemy missilem
- [x] #3 Při playerHp <= 0 přejde hra do fáze game_over a restartuje aktuální level
- [x] #4 Enemy missile (orb) letí z pozice enemy k centru hráče s pulzujícím glow efektem
- [x] #5 Každý EnemyAttackDef má vlastní cooldown timer — více útoků téhož enemy běží nezávisle
- [x] #6 Attack výběr používá weighted random ze útoků s vypršelým cooldownem
- [x] #7 Při zásahu hráče: screen flash (červený overlay) + floating damage number
- [x] #8 GameState obsahuje `player: Player` s `hp` a `maxHp` (Player entita v src/types)
- [x] #9 Všechny nové game-logic konstanty jsou v constants.ts s JSDoc komentářem (unit, affects)
- [x] #10 Game design testy pro Goblin Scout pokrývají: útok-bez-obrany TTK hráče, power user bez zranění, casual player s jedním zásahem
- [x] #11 100% unit test coverage na src/game/** zachována
- [x] #12 grep -r "from 'phaser'" src/game/ vrací prázdný výsledek (no Phaser v game logic)
<!-- AC:END -->
