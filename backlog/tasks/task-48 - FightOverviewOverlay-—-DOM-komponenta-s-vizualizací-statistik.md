---
id: TASK-48
title: FightOverviewOverlay — DOM komponenta s vizualizací statistik
status: Done
assignee: []
created_date: '2026-05-27 11:23'
updated_date: '2026-05-27 13:40'
labels:
  - two-hands-magic
  - ui
  - visualization
dependencies:
  - TASK-46
  - TASK-47
references:
  - src/scenes/BattleScene.ts
  - src/types/index.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vytvořit DOM overlay komponentu která zobrazí statistiky boje po každém souboji.

## Layout (mobil, portrait)

```
┌─────────────────────────────┐
│  ⚔️  FIGHT OVERVIEW          │
│  Goblin Scout  •  4.2s      │
├─────────────────────────────┤
│  FIREBALL                   │
│  [████░░░░░░░░░░░░] 12 shots│
│   crit  hit  graze  miss    │
│  Total dmg: 142             │
│  Avg idle: 0.8s             │
├─────────────────────────────┤
│  WHITE SHOT                 │
│  [██████████░░░░░░] 31 shots│
│  Total dmg: 68              │
│  Avg idle: 0.3s             │
├─────────────────────────────┤
│       [ Next enemy → ]      │
└─────────────────────────────┘
```

## Stacked bar komponenta

Horizontální bar rozdělený na 4 segmenty proporcionálně k počtu výstřelů daného typu:
- **Crit** — zlatá/žlutá `#FFD700`
- **Normal hit** — oranžová `#FF8C00`  
- **Graze** — modrá `#4A9EFF`
- **Miss** — šedá `#555`

Bar zobrazuje poměr hit typů vizuálně. Vedle baru: celkový počet výstřelů.

Legenda (barevné tečky + label) pod barem nebo inline.

## Efficiency metrika — Avg idle time

- Zobrazit průměr `touchGaps` v sekundách (1 des. místo)
- Label: "Avg idle" nebo "Reaction time"
- Až přijde cooldown: `idleTime = gap - cooldownMs` — tato metrika pak bude přesnější. Architektura to podporuje protože `touchGaps` ukládá raw hodnoty.
- Pokud `touchGaps.length === 0` (skill nebyl nikdy znovu vystřelen), zobrazit "—"

## Implementace

- Čistá HTML/CSS, žádný React (ostatní overlaye jsou také DOM)
- CSS class `fight-overview-overlay` s `position: absolute`, full-screen, tmavé pozadí s průhledností
- Animace: slide-up nebo fade-in (CSS transition)
- Tlačítko "Next enemy" / "Play again" volá `window.__game.completeFightOverview()` nebo přes BattleScene callback
- Komponenta přijímá `FightStats` snapshot + `enemyName` + `durationMs`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Stacked bar se zobrazuje pro každý skill slot (levý i pravý)
- [x] #2 Segmenty Crit/Normal/Graze/Miss mají správné barvy a proporce
- [x] #3 Total damage per skill je zobrazen
- [x] #4 Avg idle time je zobrazen v sekundách; zobrazí '—' pokud skill nebyl 2x použit
- [x] #5 Název enemyho a doba trvní souboje jsou viditelné
- [x] #6 Tlačítko Next enemy / Play again funguje
- [x] #7 Overlay má CSS animaci při vstupu
- [x] #8 Správně zobrazuje i skilly s 0 výstřely (nezrenderovat bar, nebo zobrazit prázdnou lištu)
<!-- AC:END -->
