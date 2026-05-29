---
id: TASK-51
title: AnimationController — pure TS animation state machine
status: Done
assignee: []
created_date: '2026-05-29 12:02'
labels:
  - game-logic
  - new-module
milestone: m-0
dependencies: []
references:
  - src/game/systems/ — adresar pro novy modul
  - src/assets/characters/*/manifest.json — zdrojova data pro AnimationDef
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Novy pure-TS modul `src/game/systems/AnimationController.ts` ktery ridi animacni stav pro libovolny sprite-based character. Zadna Phaser zavislost.

## Rozhrani

```ts
interface AnimationDef {
  frameCount: number
  frameDurationMs: number
  loop: boolean        // true = cyklicka (idle), false = one-shot (attack, death)
  freezeOnLast?: boolean  // true = po skonceni zustane na poslednim framu (death)
}

class AnimationController {
  constructor(animations: Record<string, AnimationDef>)

  /** Spusti animaci. Oneshot se po dokonceni vrati na default (prvni loop animaci). */
  play(animKey: string): void

  /** Posune frame timer. Volano z GameStateMachine.update(dt). */
  update(dtMs: number): void

  /** Aktualni stav pro rendering. */
  get currentAnimKey(): string
  get currentFrameIndex(): number

  /** True pokud prave bezi oneshot animace (attack, death). */
  get isPlaying(): boolean
}
```

## Pravidla

- **Default animace** = prvni animace v Record kde `loop === true`. Pokud zadna loop neexistuje, prvni animace celkove.
- `play()` na oneshot prerusi cokoliv. Po dokonceni oneshot se automaticky vrati na default.
- `play()` na loop nastavi novy default a zacne ho hrat.
- `freezeOnLast: true` = po dokonceni oneshot zustane na poslednim framu (pro death). Dalsi `play()` muze override.
- `update(dtMs)` posouva timer a frame index. Kdyz frame presahne frameDurationMs, posune se na dalsi frame.

## Manifest data

AnimationController dostane data z manifest.json (frameCount, frameDurationMs, loop). Mapovani:
- stone-giant: idle(10f, 150ms, loop) + attack(7f, 100ms, oneshot)
- plague-rat: idle(9f, 150ms, loop) + attack(9f, 100ms, oneshot)
- ice-giant: attack(9f, 100ms, oneshot) + throw(9f, 100ms, oneshot) — zadna loop, default = attack
- crystal-spider: attack(9f, 100ms, oneshot) + attack_mandible(9f, 100ms, oneshot) + bite(9f, 100ms, oneshot) — zadna loop, default = attack
- ember-wisp: attack(9f, 100ms, oneshot) — jedina animace, default = attack

## Co je OUT OF SCOPE

- Integrace do GameStateMachine (task 4)
- Integrace do BattleScene (task 5)
- Nacitani manifestu (task 2)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AnimationController je v src/game/systems/AnimationController.ts, pure TS bez Phaser importu
- [x] #2 loop animace cykli nekonecne, oneshot se po dokonceni vrati na default
- [x] #3 freezeOnLast oneshot zustane na poslednim framu
- [x] #4 Default animace = prvni loop animace; pokud zadna loop, prvni animace celkove
- [x] #5 play() behem jine oneshot ji prerusi a spusti novou
- [x] #6 update(0) nic nezmeni, update(frameDurationMs) posune frame
- [x] #7 Unit testy v src/tests/unit/animationController.test.ts pokryvaji: loop cycling, oneshot + return, freezeOnLast, play() override, no-loop default, edge cases (single frame, 0ms duration)
<!-- AC:END -->
