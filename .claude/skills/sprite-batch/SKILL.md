---
name: sprite-batch
description: Batch generování enemy spritů přes PixelLab MCP podle scripts/sprite-gen/enemy-specs.json. Použij když má agent dogenerovat/doanimovat/integrovat enemy sprites — trigger "sprite-batch", "dogeneruj sprites", "zpracuj enemy specs".
---

# Sprite batch driver

Jsi driver sprite pipeline. **Závazný proces je v `PixelLab.md` (kořen repa) — načti ho CELÝ jako první.**
Zadání a stav per enemy: `scripts/sprite-gen/enemy-specs.json`. Šablona manifestu: `CLAUDE.md` → „Sprite & Character Asset System".

## Vstup (argumenty od uživatele)

Uživatel může v argumentech předat schválení předem, např.:
- „vše schváleno, u kandidátů ber doporučení / čísla: scarab=5, vulture=2, …"
- „jen backfill" / „jen Act III"

**Bez explicitního schválení v argumentech platí gate-y z PixelLab.md** — na gate 2 (base sprite / výběr kandidáta) a gate 3 (animace) pošli galerii/GIFy přes `SendUserFile` a ZASTAV se do odpovědi uživatele. Nikdy neschvaluj sám za uživatele.

## Algoritmus

1. Načti `PixelLab.md`, `enemy-specs.json`, `get_balance`.
2. Sestav work-list podle `status` každého enemy:
   - `todo` / `regenerate-*` → create (metoda dle specs; objekty s front-facing promptem + style_images dle PixelLab.md §1)
   - `base-generating` → poll → review/schválení
   - `base-review` → gate 2 (pokud není předschváleno)
   - `base-approved` → animace idle + attack (prompty ze specs)
   - `animating` → poll → gate 3
   - `anim-approved` → integrace (framy, manifest, masky) → `assets-integrated`
   - + sekce `backfill` (existující charactery, jen chybějící animace)
3. Pracuj po vlnách ≤8 souběžných jobů (Tier 1). Mezi vlnami background `sleep 120-240`, pak poll.
4. Zaseklý job (>10 min beze změny) nebo „crashed/heavy load" → pošli stejný request znovu (max 3×, pak nahlas uživateli).
5. **Po každé změně stavu okamžitě aktualizuj `enemy-specs.json`** (ID, status) — běh musí být idempotentní po přerušení.
6. Schvalování dávkuj: jedna galerie (montage / HTML s data-URI) na celou vlnu.
7. Na konci reportuj: hotové / čekající na uživatele / selhané + spotřeba generací (`get_balance`).

## Integrace (po gate 3)

Per enemy: framy → `src/assets/characters/{id}/frames/{anim}_{NN}.png` (00–08) → `manifest.json` (object: `"type": "object"`, direction `"unknown"`, zapiš animationId + groupId) → `python3 scripts/generate_masks.py src/assets/characters/{id}` → specs `assets-integrated`.
**Nesahej na `constants.ts` / `ENEMY_POOL`** — to patří do game-design fáze.
