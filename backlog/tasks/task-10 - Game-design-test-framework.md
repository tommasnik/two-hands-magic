---
id: TASK-10
title: Game design test framework
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:20'
updated_date: '2026-05-13 12:33'
labels:
  - game-design
  - testing
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vytvořit framework pro testování herního designu. Každý herní scénář je popsán jako GameDesignSpec s očekávaným chováním pro dva hráčské profily: power user a casual player. Specifikace jsou strojově ověřitelné a spouštějí se automaticky. Toto umožňuje zadávat design záměry jako 'tento encounter trvá casualovi 10s, power gamerovi 3s' a mít z toho test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GameDesignSpec typ v src/tests/game-design/types.ts: { name, description, powerUser: { actions, assertions }, casualPlayer: { actions, assertions } }
- [ ] #2 Action typ: { type: 'injectInput'|'wait', payload } – sekvence kroků hráče
- [ ] #3 Assertion typ: { metric: string, maxMs?: number, minMs?: number, value?: unknown } – co ověřujeme
- [ ] #4 GameDesignRunner v src/tests/game-design/runner.ts: spouští spec against GameStateMachine (bez Phaser)
- [ ] #5 První spec: src/tests/game-design/battleEncounter.spec.ts – power user dostane CRIT do 700ms, encounter do 3s; casual player dostane alespoň HIT do 10s
- [ ] #6 Power user profil definován jako: zná rotační periody, čeká na správný okamžik, pak release
- [ ] #7 Casual player profil: random timing, random drag
- [ ] #8 npm run test:design spouští všechny game-design specs
- [ ] #9 README v src/tests/game-design/README.md vysvětluje jak přidávat nové specs a hráčské profily
<!-- AC:END -->
