# Two Hands Magic — Agent Instructions

Phaser 3 + TypeScript + Vite mobile game. Portrait-only, touch-first.
Reference implementation: `sites/laser-shot/index.html` (single-file canvas game with identical input mechanic).

---

## Architecture — Non-Negotiable Rules

### 1. Game logic lives in `src/game/` — zero Phaser dependency

All domain logic (entities, systems, state machine) must be pure TypeScript with **no Phaser imports**.
Verify before committing: `grep -r "from 'phaser'" src/game/` must return nothing.

```
src/
  game/           ← pure TS, fully unit-testable, no Phaser
    systems/      ← AimSystem, ProjectileSystem, InputManager, …
    entities/     ← Enemy, TouchPoint, Projectile, …
    GameStateMachine.ts
    constants.ts
  scenes/         ← Phaser scenes (rendering + input bridge only)
  types/          ← shared types, no logic
  tests/
    unit/         ← Vitest, tests for src/game/**
    e2e/          ← Playwright, full browser tests
    game-design/  ← Vitest, GameDesignSpec tests (see below)
    helpers/      ← testBridge.ts, Playwright page helpers
```

### 2. Scenes are thin bridges — no game logic

Phaser scenes do exactly three things:
1. Translate Phaser input events → `InputEvent[]`
2. Call `game.update(delta, inputs)` each frame
3. Render the state returned by `game.getState()`

If you find yourself writing `if (score > 10)` in a scene, stop — that belongs in `src/game/`.

### 3. Constants system (`src/game/constants.ts`)

- Every tunable value is exported from this single file
- Each constant has a JSDoc comment: **what it is**, **unit**, **what it affects**
- Derived constants use `PARENT_CONSTANT * MODIFIER`, never a standalone magic number
- Tests in `src/tests/unit/constants.test.ts` verify relationships

Example:
```ts
/** Base projectile travel speed. Affects time-to-hit and difficulty feel. Unit: cm/s */
export const PROJECTILE_SPEED_CM = 70

/** Speed for fireball skill. Slower = more telegraphed. */
export const FIREBALL_SPEED_CM = PROJECTILE_SPEED_CM * 0.8
```

---

## Testing Strategy

### Unit tests (Vitest) — `npm run test`

- All files in `src/tests/unit/` mirroring `src/game/` structure
- Coverage enforced at 100 % for `src/game/**`
- Run: `npm run test` / with coverage: `npm run test:coverage`

### E2E tests (Playwright) — `npm run test:e2e`

- Tests in `src/tests/e2e/`
- Mobile portrait viewport (390×844, iPhone 14 profile)
- Uses `window.__game` test bridge (injected in DEV builds only)

### Game Design tests — `npm run test:design`

- Tests in `src/tests/game-design/`
- Vitest tests that simulate player profiles against game logic
- See **Game Design Test Framework** section below
- **Full guide**: `src/tests/game-design/README.md`

---

## Test Bridge API (`window.__game`)

Available in DEV builds at `window.__game`. Use from Playwright via `page.evaluate()`.

```ts
window.__game.getState()           // → full GameState snapshot
window.__game.injectInput(event)   // → simulate InputEvent (touch down/move/up)
window.__game.advanceTime(ms)      // → step game loop deterministically
```

Playwright helper: `src/tests/helpers/gameApi.ts` wraps these calls.

Example Playwright test:
```ts
import { gameApi } from '../helpers/gameApi'

test('fireball hits enemy head', async ({ page }) => {
  await page.goto('/')
  const api = gameApi(page)
  await api.injectTouchDown({ pointerId: 0, x: 30, y: 780 })
  await api.advanceTime(600) // one rotation cycle
  await api.injectTouchUp({ pointerId: 0 })
  const state = await api.getState()
  expect(state.lastHit?.result).toBe('CRIT')
})
```

---

## Game Design Test Framework

Each scenario is a `GameDesignSpec` that describes expected outcomes for two player profiles:
- **Power user**: knows the game, executes optimally
- **Casual player**: learning, slower reaction time

Specs live in `src/tests/game-design/` and run via `npm run test:design`.

**Full guide**: `src/tests/game-design/README.md` — read it before writing any spec.

### Definition of Done for game design tests

A task that adds or modifies an enemy, a skill, a level, or a game screen **must** include a game design test. The test must:

1. Express **difficulty intent** in the test name — e.g. `'goblin dies after 1 slow CRIT + 1 fast CRIT'`
2. **Zero hardcoded numbers** in assertions — every value derived from `constants.ts`
3. Survive a game designer tweaking a constant — if the test breaks only because a number changed, rewrite it using the intent pattern
4. Cover both power user (optimal play) and casual player (suboptimal but wins eventually)

Quick reference — constants to use instead of magic numbers:

```ts
import {
  SLOW_SKILL_DAMAGE, FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER, HIT_DAMAGE_MULTIPLIER, GRAZE_DAMAGE_MULTIPLIER,
  ENEMY_GOBLIN_SCOUT, ENEMY_ORC_WARRIOR, ENEMY_STONE_TROLL,
} from '../../game/constants'

// Derived helpers (define at top of each test file)
const SLOW_CRIT = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
```

```ts
// Example spec (src/tests/game-design/battleScenario.spec.ts)
const spec: GameDesignSpec = {
  name: 'battle-encounter',
  description: 'Standard encounter vs single enemy',
  powerUser: {
    description: 'Fires 3 crits by timing laser rotation precisely',
    actions: [/* InputEvent sequences */],
    assertions: [
      { metric: 'timeToFirstCrit', maxMs: 700 },
      { metric: 'totalEncounterTime', maxMs: 3000 },
    ],
  },
  casualPlayer: {
    description: 'Fires randomly, gets at least one HIT',
    actions: [/* InputEvent sequences */],
    assertions: [
      { metric: 'atLeastOneHit', value: true },
      { metric: 'totalEncounterTime', maxMs: 10_000 },
    ],
  },
}
```

---

## Autonomous Agent Testing Protocol

When a task requires full agent E2E validation (standard DoD item):

1. `npm run test` — all unit tests must pass
2. `npm run test:coverage` — 100 % coverage on `src/game/**`
3. `npm run test:e2e` — Playwright suite must pass
4. `npm run test:design` — all game design specs must pass
5. Manual smoke via Playwright REPL:
   - Navigate to `http://localhost:5173`
   - Confirm game canvas renders (no console errors)
   - Use `window.__game.injectInput()` to simulate a full battle interaction
   - Capture screenshot and verify visually

---

## Task Description Template

Při vytváření nového tasku musí popis obsahovat tyto sekce (pokud se týkají):

```markdown
## Přehled
[Co task přidává / mění — 2–4 věty]

## Datová struktura
[Nové typy, rozhraní, rozšíření existujících — ukázka kódu]

## Herní mechaniky
[Jak se nová funkcionalita chová za běhu]

## UI
[Vizuální reprezentace — pozice, barvy, DOM elementy vs. canvas]

## GameState rozšíření
[Co přibude do GameState / Player / Enemy / …]

## Game Design testy
Testy ve `src/tests/game-design/` musí pokrývat:
- **Power user** — co silný hráč zvládne bez zranění / optimálně
- **Casual player** — jak long průměrný hráč encounter trvá, kolikrát ho zranění
- **Krajní případ** — co se stane pokud hráč vůbec neútočí (TTK enemy→player)

Čísla v testech se vždy odvozují od `constants.ts`, nikdy hardcoded.

## Konstanty
[Nové konstanty se jménem, hodnotou a JSDoc komentářem (unit, affects)]

## Co je OUT OF SCOPE
[Explicitní seznam věcí které tento task neřeší]
```

> Sekce "Game Design testy" je **povinná** pro každý task který přidává nebo mění: enemy, skill, combat mechaniku, level, nebo game over podmínku.

---

## Sprite & Character Asset System

Generický systém pro organizaci, pojmenování a načítání character spritů, animací a hit-zone masek.

### Adresářová struktura

```
src/assets/characters/{character-id}/
  manifest.json              ← popis charu, animací, masek (strojově čitelný)
  frames/
    {anim}_{NN}.png          ← vizuální sprite framy (idle_00.png, attack_00.png, …)
  masks/
    {anim}_{NN}.png          ← hit-zone masky, 1:1 k framům (stejné jméno, jiný adresář)
```

**character-id** = kebab-case, shodný s adresářem (např. `stone-giant`, `goblin-scout`).

### manifest.json

Každý character MÁ manifest. Loader ho čte a genericky načte všechny framy + masky.

```json
{
  "id": "stone-giant",
  "spriteKey": "stone_giant",
  "displayWidth": 200,
  "source": {
    "tool": "pixellab",
    "characterId": "457462cf-0337-47fe-89a4-a1c9cc6e51a3",
    "projectId": "10f15a6e-f984-4afa-8be1-b703bfaeb07e"
  },
  "animations": {
    "idle": {
      "frameCount": 10,
      "frameDurationMs": 150,
      "loop": true,
      "hasMasks": true,
      "source": {
        "animationId": "7ca1c28b-a1a0-46a7-b277-e80bba207b5a",
        "direction": "south"
      }
    },
    "attack": {
      "frameCount": 7,
      "frameDurationMs": 100,
      "loop": false,
      "hasMasks": true,
      "source": {
        "animationId": "f199fe94-5395-4a96-a1df-21dcf766377a",
        "direction": "south"
      }
    }
  }
}
```

Pole:
- **id**: kebab-case identifikátor = název adresáře
- **spriteKey**: Phaser texture key prefix (snake_case) — používá se v `EnemyDef.spriteKey`
- **displayWidth**: šířka sprite v px při renderingu. Musí odpovídat `EnemyDef.displayWidth`
- **source**: metadata odkud sprite pochází (PixelLab IDs pro opětovné stažení)
- **animations**: mapa `animKey → config`
  - **frameCount**: počet framů
  - **frameDurationMs**: délka jednoho framu v ms
  - **loop**: `true` = cyklická animace (idle), `false` = one-shot (attack, hurt, death)
  - **hasMasks**: `true` = existují hit-zone masky v `masks/` se shodným pojmenováním
  - **source**: PixelLab animation ID + direction pro download

### Standardní animace

| animKey  | Typ       | Popis                              | Masky |
|----------|-----------|------------------------------------|-------|
| `idle`   | loop      | Výchozí stav, nepřítel stojí       | ano   |
| `attack` | one-shot  | Útočná animace (throw, slash, …)   | ano   |
| `hurt`   | one-shot  | Reakce na zásah (optional)         | ne    |
| `death`  | one-shot  | Umírání (optional)                 | ne    |

`idle` a `attack` jsou povinné. `hurt` a `death` jsou volitelné rozšíření.

Důležité: v manifestu i v kódu se attack animace vždy jmenuje **`attack`** (ne `throw`, `slash` atd.) — jde o sémantický typ, ne o vizuální popis. Tím je loader a renderer generický.

### Pojmenování souborů

Framy:  `frames/{animKey}_{frameIndex:02d}.png` → `frames/idle_00.png`, `frames/attack_04.png`
Masky:  `masks/{animKey}_{frameIndex:02d}.png`  → `masks/idle_00.png`, `masks/attack_04.png`

Frame index je vždy **zero-padded na 2 cifry** (00–99).

### Phaser texture keys

Konvence pro registraci textur v Phaser:

| Typ       | Vzor                                  | Příklad                    |
|-----------|---------------------------------------|----------------------------|
| Frame     | `{spriteKey}_{animKey}_{frameIndex}`  | `stone_giant_idle_3`       |
| Mask      | `{spriteKey}_mask_{animKey}_{frameIndex}` | `stone_giant_mask_idle_3` |

`frameIndex` v klíči je **bez paddingu** (číslo, ne string) — shodné s aktuálním kódem.

### Mask systém — barvy hit zón

Masky jsou PNG obrázky kde barva pixelu kóduje hit zónu:

| Barva               | RGB podmínka           | Zóna       | Hit výsledek |
|---------------------|------------------------|------------|-------------|
| Průhledná (alpha=0) | `a == 0`               | `none`     | miss        |
| Červená             | `R > 200 && G < 50`   | `head`     | CRIT        |
| Žlutá               | `R > 200 && G > 200`  | `torso`    | HIT         |
| Zelená              | `G > 200 && R < 50`   | `leftLeg`  | GRAZE       |

Masky se malují v **stone-giant-editor** (`sites/stone-giant-editor/`) — canvas tool pro ruční painting zón přes sprite framy.

### PixelLab → Hra pipeline

#### Bulk stažení všech assetů z PixelLabu

Kompletní postup pro stažení a kategorizaci všeho z PixelLabu:

1. **Připoj se k PixelLabu** přes MCP tools:
   - `list_characters(limit=50)` — seznam všech characterů
   - `list_objects(limit=50)` — seznam všech objektů
   - `get_character(id)` / `get_object(id)` — detaily včetně animací a frame URLs

2. **Rozpoznej skupiny (groups)**: PixelLab groupuje character states dohromady (např. Ice Giant idle + Ice Giant mid-throw). Hlavní character je `idle` state, ostatní jsou alternativní pózy (mid-throw, body-stretched, mid-jump). V manifestu zapiš `source.groupStates` pro mapování.

3. **Stáhni framy** — curl z PixelLab CDN paralelně:
   - Characters: `https://backblaze.pixellab.ai/file/pixellab-characters/{projectId}/{characterId}/animations/{animationId}/{direction}/{frameIndex}.png`
   - Objects: `https://backblaze.pixellab.ai/file/pixellab-characters/objects/{projectId}/{objectId}/animations/{animationJobId}/{direction}/{frameIndex}.png`
   - Přejmenuj na konvenci: `{animKey}_{NN}.png` (NN = zero-padded 00–99)
   - Characters → `src/assets/characters/{character-id}/frames/`
   - Objects používané jako characters (enemy sprites) → `src/assets/characters/{character-id}/frames/` (PixelLab je vede jako "objects", ale v naší hře jsou to characters)
   - Ostatní objects (dekorace, prostředí, …) → `src/assets/objects/{object-id}/frames/`

4. **Vytvoř manifest.json** — pro každý character/object. Manifest obsahuje:
   - `id`, `spriteKey`, `displayWidth`, `source` (s PixelLab IDs pro re-download)
   - `animations` mapa: pro každou animaci `frameCount`, `frameDurationMs`, `loop`, `hasMasks`, `source.animationId`
   - Pro PixelLab objekty použité jako characters: `"type": "object"` a `source.objectId` místo `characterId`, ale soubory žijí v `src/assets/characters/`

5. **Generuj základní masky** — skript `scripts/generate_masks.py`:
   ```bash
   python3 scripts/generate_masks.py --all              # všechny bez masek
   python3 scripts/generate_masks.py src/assets/characters/plague-rat  # jeden
   python3 scripts/generate_masks.py --all --force       # přepsat existující
   ```
   Skript vezme všechny framy, viditelné pixely (alpha > threshold) udělá zelené (GRAZE zóna). Výsledek je základní maska — pro přesnější zonaci (red=CRIT, yellow=HIT) se pak použije mask editor.

6. **Přidej character do constants.ts** — `EnemyDef` s `spriteKey`, `maskConfig`, `displayWidth`
7. **Zaregistruj v loaderu** — LoadingScene přečte manifest a načte framy + masky

#### Pojmenování animací z PixelLabu

| PixelLab popis | Mapování na animKey | Poznámka |
|----------------|---------------------|----------|
| sits/stands/breathing/idle | `idle` | loop: true |
| attack/throw/lunge/bite | `attack` | loop: false, primární útok |
| alternativní útok | `attack_mandible`, `bite`, `throw` | extra animace s popisným názvem |
| z jiného group state | zapiš `source.characterId` v manifestu | frame URL používá characterId toho state |

#### Postup při vytváření jednoho nového character spritu

1. **Vytvoř character v PixelLab** → zapiš `projectId` a `characterId`
2. **Vytvoř animace v PixelLab** (idle, attack) → zapiš `animationId` pro každou
3. **Stáhni framy** — curl z CDN (viz URL vzor výše), přejmenuj na `{animKey}_{NN}.png`
4. **Vytvoř manifest.json** podle šablony výše
5. **Generuj masky** — `python3 scripts/generate_masks.py src/assets/characters/{id}`
6. **(Volitelné) Zpřesni masky** v stone-giant-editor — red/yellow/green zóny
7. **Přidej do constants.ts a loaderu**

### Inventář assetů

```
src/assets/
  characters/
    stone-giant/        128x128  idle(10f) + attack(7f) + idle_v2(9f)   masky: kompletní (ručně malované)
    plague-rat/         180x180  idle(9f) + attack(9f)                  masky: zelené (auto-generated)
    ice-giant/          124x124  attack(9f) + throw(9f)                 masky: zelené — chybí idle animace
    crystal-spider/     224x224  attack(9f) + mandible(9f) + bite(9f)   masky: zelené — chybí idle animace
    ember-wisp/         256x256  attack(9f)                             masky: zelené — 1-direction, PixelLab object použitý jako character
```

PixelLab project ID: `10f15a6e-f984-4afa-8be1-b703bfaeb07e`

### Mapování na EnemyDef

```ts
// constants.ts
export const ENEMY_STONE_GIANT: EnemyDef = {
  spriteKey: 'stone_giant',        // → manifest.spriteKey
  displayWidth: 200,               // → manifest.displayWidth
  maskConfig: {                    // → odvozeno z manifest.animations
    idle:   { frameCount: 10, prefix: 'mask_idle_' },
    attack: { frameCount: 7,  prefix: 'mask_attack_' },
  },
  // … ostatní fieldy
}
```

Budoucí cíl: `maskConfig` a frame konstanty se budou **generovat z manifest.json** — ne duplikovat ručně.

### Co je aktuálně hardcoded (k refaktoru)

| Místo                  | Problém                                          |
|------------------------|--------------------------------------------------|
| `LoadingScene.ts`      | For-loop smyčky specificky pro Stone Giant        |
| `BattleScene.ts:1605`  | `if (spriteKey === 'stone_giant')` branch          |
| `constants.ts`         | `STONE_GIANT_*` konstanty mimo manifest           |

Implementační task by měl: přečíst manifesty, genericky načíst framy/masky, a genericky renderovat animované sprity bez per-enemy branching.

---

## Backlog Workflow

See root `CLAUDE.md` for full Backlog.md CLI reference.
Backlog lives at `sites/two-hands-magic/backlog/`.

Run backlog commands from `sites/two-hands-magic/`:
```bash
backlog task list --plain
backlog task 1 --plain
backlog task edit 1 -s "In Progress" -a @agent
```

---

## Key Commands

```bash
npm run dev            # Vite dev server → http://localhost:5173
npm run build          # TypeScript check + Vite build
npm run test           # Vitest unit + game-design tests
npm run test:coverage  # With 100 % coverage enforcement
npm run test:e2e       # Playwright (starts dev server automatically)
npm run test:design    # Game design specs only
```
