---
id: TASK-52
title: Genericky manifest loader — runtime nacitani vsech characteru
status: Done
assignee:
  - '@agent'
created_date: '2026-05-29 12:02'
updated_date: '2026-05-29 12:24'
labels:
  - scene
  - loader
milestone: m-0
dependencies:
  - TASK-51
references:
  - src/scenes/LoadingScene.ts — aktualni hardcoded loader
  - src/assets/characters/*/manifest.json — 5 manifestu k nacteni
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Prepsat LoadingScene z hardcoded stone-giant loaderu na genericky system ktery cte manifest.json vsech 5 characteru a nacte vsechny framy + masky.

## Aktualni stav

LoadingScene.ts (~45 radku) ma hardcoded for-loopy pro stone_giant_idle_0..9, stone_giant_attack_0..6, a odpovidajici masky. Jen 1 character ze 5 se nacita.

## Novy design

### CharacterRegistry (pure TS, `src/game/CharacterRegistry.ts`)

```ts
interface CharacterManifest {
  id: string           // 'stone-giant'
  spriteKey: string    // 'stone_giant'
  displayWidth: number
  anchorX?: number     // default 0.5
  anchorY?: number     // default 0.6
  animations: Record<string, {
    frameCount: number
    frameDurationMs: number
    loop: boolean
    hasMasks: boolean
  }>
}

class CharacterRegistry {
  register(manifest: CharacterManifest): void
  get(id: string): CharacterManifest
  getAll(): CharacterManifest[]
  getAnimationDefs(id: string): Record<string, AnimationDef>  // pro AnimationController
}
```

### LoadingScene refaktor

LoadingScene importne vsechny manifest.json soubory (Vite JSON import), iteruje pres character registry a genericky nacte:
- Framy: `src/assets/characters/{id}/frames/{animKey}_{NN}.png` → Phaser key `{spriteKey}_{animKey}_{N}`
- Masky: `src/assets/characters/{id}/masks/{animKey}_{NN}.png` → Phaser key `{spriteKey}_mask_{animKey}_{N}`

Nacita VSECH 5 characteru najednou (cca 160 textur celkem).

### Manifest fix

4 z 5 characteru maji `hasMasks: false` v manifestu, ale masky na disku EXISTUJI (auto-generated zelene masky). Opravit manifesty: nastavit `hasMasks: true` u plague-rat, ice-giant, crystal-spider, ember-wisp.

## 5 characteru k nacteni

| Character | spriteKey | Framy | Masky | Animace |
|---|---|---|---|---|
| stone-giant | stone_giant | 17 (10+7) | 17 | idle(10f,150ms,loop), attack(7f,100ms) |
| plague-rat | plague_rat | 18 (9+9) | 18 | idle(9f,150ms,loop), attack(9f,100ms) |
| ice-giant | ice_giant | 18 (9+9) | 18 | attack(9f,100ms), throw(9f,100ms) |
| crystal-spider | crystal_spider | 27 (9+9+9) | 27 | attack(9f,100ms), attack_mandible(9f,100ms), bite(9f,100ms) |
| ember-wisp | ember_wisp | 9 | 9 | attack(9f,100ms) |

## Co je OUT OF SCOPE

- MaskHitDetector integrace (task 3)
- Enemy/GameStateMachine integrace (task 4)
- BattleScene rendering (task 5)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CharacterRegistry v src/game/CharacterRegistry.ts, pure TS bez Phaser importu
- [ ] #2 Vsech 5 manifestu opraveno: hasMasks: true kde masky na disku existuji
- [ ] #3 LoadingScene genericky nacita vsechny framy a masky vsech 5 characteru z manifestu
- [ ] #4 Zadny hardcoded character-specific kod v LoadingScene
- [ ] #5 Phaser texture keys dodrzuji konvenci: {spriteKey}_{animKey}_{frameIndex} pro framy, {spriteKey}_mask_{animKey}_{frameIndex} pro masky
- [ ] #6 Unit testy pro CharacterRegistry: register, get, getAll, getAnimationDefs, validace chybejiciho manifestu
- [ ] #7 Po nacteni LoadingScene prechazi na BattleScene (zachovane chovani)
<!-- AC:END -->
