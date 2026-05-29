---
id: TASK-38
title: 'Přidat dva nové skilly: White Shot (levá) a Fireball (pravá)'
status: Done
assignee: []
created_date: '2026-05-14 19:31'
updated_date: '2026-05-14 19:54'
labels:
  - skills
  - vfx
  - balance
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Přidat dva nové SkillDef do hry s odlišnými projektily, barvami a damage profilem.

## Skill 1 — White Shot (levá ruka)
- Barva: bílá
- Strana: levá
- Cooldown: stejný jako aktuální rychlý skill
- Projektil: obyčejný (bullet/orb), bílý
- Damage: base 2–4, crit ×2, vs. zelená 50%

## Skill 2 — Fireball (pravá ruka)
- Barva: oranžová
- Strana: pravá
- Cooldown: 2 s (pomalejší)
- Projektil: malý fireball s particle efektem (oheň/jiskry při dopadu nebo za sebou)
- Damage: base 10–15, crit ×2, vs. zelená 50%

## Implementační poznámky
- Přidat obě SkillDef do skills configu (vedle stávajících)
- Pro fireball použít Phaser particles — emitter na projektilu nebo při impaktu
- Skill sloty přiřadit defaultně: White Shot → levý slot 1, Fireball → pravý slot 1
- Zkontrolovat, že damage konstanty sedí do balance (White Shot = rychlý DPS, Fireball = pomalý burst)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 White Shot SkillDef existuje: color white, levá strana, cooldown ≤ rychlý skill, base dmg 2–4, crit ×2, vs.green 50%
- [x] #2 Fireball SkillDef existuje: color orange, pravá strana, cooldown 2s, base dmg 10–15, crit ×2, vs.green 50%
- [x] #3 Fireball má particle efekt (emitter na projektilu nebo při impaktu)
- [x] #4 Oba skilly jsou viditelné a funkční v BattleScene
- [x] #5 Damage konstanty jsou v constants souboru, ne hardcoded inline
- [x] #6 Game design testy pokrývají oba skilly (kill scénář, damage range)
<!-- AC:END -->
