---
id: TASK-7
title: Projectile & skill system
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:16'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat systém projektilů/skillů. Aktuálně placeholder skill type 'fireball'. Projektil létá z touch pointu k cíli (reticle pozici v okamžiku release), rychlostí danou PROJECTILE_SPEED_CM. Hit detection se provádí při dopadu, nikoli podél trajektorie (viz laser-shot).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ProjectileSystem.fire(origin, target, skillType): přidá projektil do interní fronty
- [ ] #2 ProjectileSystem.update(dt): posouvá projektily, vrací seznam ProjectileHitEvent pro každý dopad
- [ ] #3 Projektil obsahuje: id, origin, target, skillType, progress (0–1), alive
- [ ] #4 Hit detection: při progress >= 1 zkontroluj kolizi s enemy a vrať HitResult
- [ ] #5 Unit testy: projektil dosáhne cíle za správný čas (PROJECTILE_SPEED_CM / vzdálenost)
- [ ] #6 Unit testy: více projektilů najednou se nezaseknou
- [ ] #7 Unit testy: projektil co mine enemy vrátí MISS
- [ ] #8 SkillType je rozšiřitelný enum/union – přidání nového skillu nevyžaduje změnu v ProjectileSystem
<!-- AC:END -->
