---
id: TASK-49.1
title: Zone editor — canvas tool pro malování hit masek Stone Gianta per frame
status: Done
assignee: []
created_date: '2026-05-29 07:28'
updated_date: '2026-05-29 07:53'
labels:
  - two-hands-magic
  - stone-giant
  - dev-tool
  - editor
dependencies: []
parent_task_id: TASK-49
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vytvoř standalone dev tool `sites/stone-giant-editor/` pro ruční kalibraci pixel-perfect hit zón Stone Gianta. Výstupem jsou color-coded PNG masky per frame, které pak game integration task spotřebuje.

## Co je Stone Giant

PixelLab AI-generovaný sprite (128×128px, 8 směrů). Pro hru potřebujeme hit masky k 17 framům dvou animací:

**idle** (10 framů) — Throw Heavy animace, framy 0–9:
`https://backblaze.pixellab.ai/file/pixellab-characters/10f15a6e-f984-4afa-8be1-b703bfaeb07e/457462cf-0337-47fe-89a4-a1c9cc6e51a3/animations/7ca1c28b-a1a0-46a7-b277-e80bba207b5a/south/{N}.png`

**throw** (7 framů) — Throw animace, framy 0–6:
`https://backblaze.pixellab.ai/file/pixellab-characters/10f15a6e-f984-4afa-8be1-b703bfaeb07e/457462cf-0337-47fe-89a4-a1c9cc6e51a3/animations/f199fe94-5395-4a96-a1df-21dcf766377a/south/{N}.png`

## Datový formát výstupních masek

Color-coded PNG, 128×128px (stejné rozměry jako sprite):
- průhledný pixel = miss
- `#ff0000` = crit (hlava)
- `#ffff00` = hit (torso)
- `#00ff00` = graze (končetiny/nohy)

Pojmenování výstupních souborů: `mask_idle_00.png` … `mask_idle_09.png`, `mask_throw_00.png` … `mask_throw_06.png`

## Fáze 0 — stažení framů

Před spuštěním editoru je třeba stáhnout framy lokálně do `sites/stone-giant-editor/frames/` pomocí `curl` nebo `wget`. Pojmenování: `idle_00.png` … `idle_09.png`, `throw_00.png` … `throw_06.png`. Buď jako setup skript (`download_frames.sh`), nebo přímo z terminálu.

Důvod: Canvas `getImageData()` blokuje CORS pro cross-origin obrázky — lokální soubory tento problém nemají.

## Požadavky na editor (statická HTML stránka, žádný build)

**Auto-předvyplnění masek:**
- Načti frame PNG, najdi bounding box neprůhledných pixelů (alpha > 0)
- Rozděl bounding box na třetiny: horní 1/3 = `#ff0000`, střední 1/3 = `#ffff00`, dolní 1/3 = `#00ff00`
- Pixely mimo bounding box zůstanou průhledné

**Canvas editor:**
- Levý panel: seznam framů (idle_00 … throw_06), kliknutím přepni aktivní frame
- Hlavní plocha: sprite frame jako podklad + maska v opacity ~0.5 jako overlay, obojí na canvas
- Nástroj štětec: klik/drag maluje vybranou zónu; pravý klik = průhledná (erase/miss)
- Přepínač aktivní zóny: klávesy 1/2/3/0 nebo tlačítka (1=crit červená, 2=hit žlutá, 3=graze zelená, 0=erase)
- Slider velikosti štětce (4–32px doporučeno, canvas je zobrazený 4× zvětšeně = 512px zobrazení pro 128px sprite)
- Undo: Ctrl+Z (min. 20 kroků)
- Tlačítko "Reset to auto" — přegeneruje automatické předvyplnění pro aktuální frame

**Export:**
- Tlačítko "Download mask" pod každým framem (nebo globální "Download current")
- Stáhne PNG masku aktuálního framu jako `mask_{animation}_{NN}.png`
- Maska obsahuje POUZE barevné/průhledné pixely — žádné bílé pozadí

## Technické poznámky

- Čistý HTML + vanilla JS, žádné závislosti, žádný build krok
- Canvas pracuje v nativním rozlišení 128×128, zobrazuje se CSS transformací 4× (nebo přes drawImage na větší canvas)
- `getImageData` / `putImageData` pro čtení pixelů spritu a zápis masky
- Soubor žije v `sites/stone-giant-editor/index.html`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Skript download_frames.sh stáhne všech 17 framů do sites/stone-giant-editor/frames/ se správným pojmenováním
- [x] #2 Editor se otevře v prohlížeči přes lokální HTTP server (python3 -m http.server) bez CORS chyb
- [x] #3 Auto-předvyplnění masky správně detekuje bounding box neprůhledných pixelů a rozdělí na 3 barevné zóny
- [x] #4 Štětec maluje na canvas v zónovacích barvách při klik+drag, pravý klik/erase maže na průhlednou
- [x] #5 Klávesy 1/2/3/0 přepínají aktivní zónu (crit/hit/graze/erase)
- [x] #6 Ctrl+Z undo funguje min. 20 kroků zpět
- [x] #7 Download mask exportuje korektní PNG 128×128 s průhledným pozadím a barevnými zónami
- [x] #8 Exported PNG je čitelný jako ImageData v canvas (správný alpha kanál) — ověř přečtením zpátky
<!-- AC:END -->
