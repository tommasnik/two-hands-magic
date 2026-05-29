---
id: TASK-58
title: >-
  Mask editor — overlay toggle, animation playback, copy from any frame, done
  tracking
status: Done
assignee: []
created_date: '2026-05-29 18:46'
updated_date: '2026-05-29 19:11'
labels:
  - tooling
  - mask-editor
dependencies: []
references:
  - tools/sprite-masks-editor/index.html
  - tools/sprite-masks-editor/server.cjs
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Rozšíření sprite mask editoru (`tools/sprite-masks-editor/index.html`) o 4 nové featury pro produktivnější editaci hit-zone masek.

## Feature 1: Overlay toggle
- Globální checkbox "Show mask overlay" v toolbaru
- Toggluje viditelnost mask canvasu (z-index 2, opacity 0.5)
- Funguje při editaci i při playbacku
- Painting funguje i když je overlay skrytý (blind paint povolený)
- Shortcut: **O**

## Feature 2: Animation playback
- Play/Stop tlačítko + speed slider v existujícím toolbaru
- Speed slider: **0.25x–3x** multiplier na `frameDurationMs` z manifestu, default 1x
- Při playbacku je painting **zakázaný** (prevence accidental edits)
- Playback cykluje přes framy aktuální animace pomocí `setInterval`/`requestAnimationFrame`
- Respektuje overlay toggle (preview s/bez masek)
- Shortcut: **Space** = play/stop

## Feature 3: Copy from any frame (clipboard)
- Copy-paste metaphor: Shift+Click na frame v sidebaru = copy source mask do clipboardu
- Navigace na target frame → **Shift+V** = paste
- Cross-animation copy podporován (clipboard přežívá switch animace)
- Vizuální indikátor na source frame v sidebaru ("copied" highlight)
- Existující "Copy from Prev" (Shift+C) zůstává jako fast shortcut
- Clipboard drží deep copy ImageData

## Feature 4: Done tracking (per-frame)
- Per-frame granularita — každý frame nezávisle označitelný jako done
- Storage: `masksEdited` array v `manifest.json` per-animation:
  ```json
  "animations": {
    "idle": {
      "frameCount": 10,
      "masksEdited": ["idle_00", "idle_03", "idle_07"]
    }
  }
  ```
- Trigger: manuální toggle (shortcut **D**) + auto-mark po Trim akci
- Vizuál: checkmark icon (✓) na frame buttonu v sidebaru, odlišný od zeleného "mask" badge
- Server API endpoint pro uložení manifestu při změně statusu

## Implementační poznámky
- Vše v jednom souboru `tools/sprite-masks-editor/index.html` (embedded JS/CSS)
- Server `tools/sprite-masks-editor/server.cjs` potřebuje nový endpoint pro zápis manifestu (aktuálně read-only)
- Keyboard shortcuts: O (overlay), Space (play/stop), Shift+V (paste), D (done toggle)
- Existující shortcuts: Shift+C (copy prev), Shift+T (trim), Ctrl+Z (undo), 0-3 (zones)

## Co je OUT OF SCOPE
- Cross-character copy (pouze v rámci jednoho characteru)
- Batch mark-as-done (pouze per-frame)
- Export/import masek
- Undo pro done toggle
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Overlay checkbox v toolbaru toggluje viditelnost mask canvasu (klávesa O)
- [x] #2 Play/Stop tlačítko spouští animaci framů aktuální animace, speed slider 0.25x–3x
- [x] #3 Painting je zakázaný během playbacku
- [x] #4 Shift+Click na frame v sidebaru zkopíruje mask do clipboardu, Shift+V pastne na aktuální frame
- [x] #5 Clipboard funguje cross-animation v rámci jednoho characteru
- [x] #6 Klávesa D togglene done status aktuálního framu, Trim akce auto-markne jako done
- [x] #7 Done status se ukládá do masksEdited array v manifest.json
- [x] #8 Checkmark icon na done framech v sidebaru, vizuálně odlišný od mask badge
- [x] #9 Server endpoint pro zápis manifest.json
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementace 4 nových featur v sprite mask editoru

### Změny v souborech:
- `tools/sprite-masks-editor/index.html` — všechny 4 featury (CSS + HTML + JS)
- `tools/sprite-masks-editor/server.cjs` — nový POST endpoint `/api/characters/:charId/manifest` pro zápis manifest.json

### Feature 1: Overlay toggle
- Checkbox "Overlay" v toolbaru, shortcut O
- Toggluje opacity mask canvasu (0.5 → 0)

### Feature 2: Animation playback
- Play/Stop tlačítko + Speed slider (0.25x–3x)
- Painting zakázaný během playbacku
- Shortcut: Space

### Feature 3: Copy from any frame (clipboard)
- Shift+Click na frame v sidebaru = copy mask do clipboardu
- Shift+V = paste na aktuální frame
- Clipboard přežívá switch animace (cross-animation copy)
- Vizuální dashed outline na source frame

### Feature 4: Done tracking
- Klávesa D togglene done na aktuálním framu
- Trim akce auto-markne jako done
- Ukládá se do `masksEdited` array v manifest.json per-animation
- Checkmark (✓) na done framech v sidebaru

### Testováno na stone-giant: overlay, playback, clipboard copy/paste, done tracking + manifest persistence.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Otestovat všechny 4 featury v browseru na reálném characteru (stone-giant)
<!-- DOD:END -->
