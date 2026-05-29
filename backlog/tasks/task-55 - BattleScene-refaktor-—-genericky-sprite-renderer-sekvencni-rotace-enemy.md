---
id: TASK-55
title: BattleScene refaktor — genericky sprite renderer + sekvencni rotace enemy
status: Done
assignee:
  - '@agent'
created_date: '2026-05-29 12:04'
updated_date: '2026-05-29 15:32'
labels:
  - scene
  - rendering
  - refactor
milestone: m-0
dependencies:
  - TASK-54
references:
  - 'src/scenes/BattleScene.ts — 1900 radku, hlavni refaktor cil'
  - src/game/GameStateMachine.ts — nextEnemy() logika
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Prepsat BattleScene rendering: smazat proceduralni renderery (humanoid, beast, wisp, spider, blob, elemental, drake, treant, wraith), smazat stone-giant-specific animacni logiku, nahradit genrickym sprite rendererem ktery cte stav z AnimationControlleru. Implementovat sekvencni rotaci 5 enemy.

## Aktualni stav BattleScene.ts (~1900 radku)

### Co se smaze:
- `_stoneGiantAnim`, `_stoneGiantFrame`, `_stoneGiantAnimTimer` fieldy
- `_updateStoneGiantAnim(dtMs)` metoda
- `_drawStoneGiantSprite()` specificky renderer
- `_drawEnemyByShape()` dispatcher
- `_drawHumanoid()`, `_drawBeast()`, `_drawWisp()`, `_drawSpider()`, `_drawBlob()`, `_drawElemental()`, `_drawDrake()`, `_drawTreent()`, `_drawWraith()` — vsechny proceduralni renderery (~500 radku)
- `if (spriteKey === 'stone_giant')` branch v `_drawEnemySprite()`

### Co ho nahradi:
Jediny genericky `_drawEnemySprite()`:

```ts
_drawEnemySprite(ctx, state) {
  const manifest = this._charRegistry.get(state.enemyManifestId)
  const textureKey = `${manifest.spriteKey}_${state.enemyAnimKey}_${state.enemyFrameIndex}`
  const texture = this.textures.get(textureKey)
  const w = manifest.displayWidth  // (overridable per level v budoucnu)
  const h = w * (texture.height / texture.width)  // zachovat aspect ratio
  const anchorX = manifest.anchorX ?? 0.5
  const anchorY = manifest.anchorY ?? 0.6
  ctx.drawImage(texture.source.image, state.enemy.x - w * anchorX, state.enemy.y - h * anchorY, w, h)
}
```

### Sekvencni rotace enemy

Pool: 5 EnemyDef v constants.ts (stone-giant, plague-rat, ice-giant, crystal-spider, ember-wisp).
Po zabiti enemy → dalsi z pole, po 5. zpet na 1. Nekonecny cyklus.

GameStateMachine musi podporovat `nextEnemy()` ktery:
1. Inkrementuje index v poolu (modulo 5)
2. Vytvori novy Enemy s odpovidajicim AnimationControllerem
3. Resetuje HP, pozici, animaci

Level/XP/upgrade system zustava funkcni — hrac porad leveluje, ale enemy pool je fixne 5 characteru v cyklu.

## Co je OUT OF SCOPE

- Cistka starych konstant (task 6)
- Game design testy (task 7)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Zadny proceduralni renderer v BattleScene (grep -r '_drawHumanoid\|_drawBeast\|_drawWisp\|_drawSpider\|_drawBlob\|_drawElemental\|_drawDrake\|_drawTreent\|_drawWraith' src/scenes/ vraci prazdny vysledek)
- [ ] #2 Zadny stone-giant-specific kod v BattleScene (grep -r 'stoneGiant\|stone_giant' src/scenes/ vraci prazdny vysledek krom texture keys)
- [ ] #3 _drawEnemySprite() je genericky — funguje pro libovolny character z CharacterRegistry
- [ ] #4 Sprite anchor pouziva anchorX/anchorY z manifestu (default 0.5/0.6)
- [ ] #5 Sekvencni rotace: po zabiti enemy se objevi dalsi z poolu 5 characteru, po 5. znovu od 1.
- [ ] #6 Level/XP/upgrade system funguje beze zmen
- [ ] #7 Vsech 5 characteru se renderuje spravne (vizualni kontrola v prohlizeci)
- [ ] #8 E2E testy aktualizovany pro novy rendering
<!-- AC:END -->
