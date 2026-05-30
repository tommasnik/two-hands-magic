---
id: TASK-61
title: 'Nové player skilly: Ice Crystal & Lightning Blast'
status: To Do
assignee: []
created_date: '2026-05-30 18:50'
labels:
  - skills
  - combat
  - gameplay
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Přidání dvou nových hráčských skillů + změna layoutu na 2+2 (2 sloty na každé straně).

**Ice Crystal** — pomalý ledový shard (20 cm/s, ~2000ms rotation), malý damage (3–5 HP). Při HIT zmrazí nepřítele na 1s, při CRIT na 2s. GRAZE = 60% damage, bez freeze.

**Lightning Blast** — okamžitý blesk (instant hit), vysoký damage (18–25 HP), ~1200ms rotation. Klikatá žlutá čára z bottom-center k targetu. Vizuál trvá dle hit zone: CRIT=600ms, HIT=300ms, GRAZE=150ms. GRAZE = 60% damage.

**Layout** — left: white_shot (slot 0) + ice_crystal (slot 1) / right: fireball (slot 0) + lightning_blast (slot 1). Infrastruktura pro 2+2 existuje, stačí rekonfigurovat DEFAULT_SKILL_CONFIG.

## Co je OUT OF SCOPE
- Game design testy
- Upgrade systém pro nové skilly
- Enemy resistance/immunity vůči konkrétním skillům
- Animace hurt/death reakce na freeze
<!-- SECTION:DESCRIPTION:END -->
