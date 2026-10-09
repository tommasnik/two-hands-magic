# PixelLab — generování enemy spritů (operativní návod)

> Definitivní proces ověřený na 24 enemies (2026-07-20). Nahrazuje všechny starší návody.
> Cíl per enemy: **south-facing base sprite + `idle` + `attack` animace** (9 framů, south).
> **Zadání všech enemies žijí v `scripts/sprite-gen/enemy-specs.json`** — descriptions,
> idle/attack prompty, PixelLab IDs, stav. Ten soubor je source of truth; tento dokument je proces.

Project ID: `10f15a6e-f984-4afa-8be1-b703bfaeb07e`

---

## Kdy se model ptá uživatele (jediné 3 gate-y)

Vše ostatní běží autonomně, bez doptávání.

| Gate | Kdy | Jak |
|------|-----|-----|
| 1. Metoda | Jen u enemy, který NENÍ ve specs a má netypický tvar | `AskUserQuestion` s doporučením |
| 2. Base sprite | **VŽDY** před animací | Pošli preview/galerii (`SendUserFile`). Characters: schválit/zamítnout. Objects: uživatel vybere číslo kandidáta — buď odpoví číslem (→ `select_object_frames`), nebo si vybere sám v PixelLab UI s tagem (→ najdi přes `list_objects(tags="...")`) |
| 3. Animace | Po vygenerování idle+attack | Pošli GIFy. Po schválení integruj |

Zamítnutí = uprav prompt podle připomínky a generuj znovu. Nikdy neanimuj neschválený base.

---

## 1. Volba metody (rozhodni sám podle tvaru)

- **Humanoid** (2 nohy, 2 ruce — i kostlivec, golem, démon s křídly)
  → `create_character(mode="v3", view="side", body_type="humanoid", size=<tier>)`
- **Vše ostatní** (čtyřnožec, hejno, elementál, had, drak, stín, létavec)
  → `create_1_direction_object(view="sidescroller", style_images=[<ref>])`
  - ⚠️ v3 quadrupedy neumí; standard mód je zakázán (plochý, stylově nekonzistentní výsledek)
  - `style_images`: schválený v3 sprite tematicky blízké palety (Demon Lord pro ohnivé, Glacier Colossus pro ledové…), příprava:
    `convert <sprite>.png -trim +repage -resize 128x128 -background none -gravity center -extent 128x128 -colors 48 -strip PNG8:ref.png` → base64
  - `size` NEZADÁVEJ spolu se style_images — output size určuje největší style image (128 → 4 kandidáti)
  - base64 ref ověř roundtripem (PIL `verify()`) — poškozený stream API odmítne

Size tiery (native px; in-game velikost řeší `displayWidth` v manifestu):
S 64–96 (havěť, imp) · M 128 (humanoidi) · L 160–192 (yeti, velcí tvorové) · XL 208–256 (bossové, kolosové)

## 2. Prompty — pravidla

Vše anglicky. Hotové texty per enemy → `enemy-specs.json` (`description`, `idle`, `attack`).

**description (create)** — 40–80 slov, statický vizuál: silueta, materiály, barvy, zbraň, póza.
- Objekty **VŽDY**: „facing the viewer head-on, front view, chest and head pointed straight at the camera". **NIKDY** „side view" — vygeneruje profil otočený doprava.
- Objekty přidej styl-fráze: „rich shading ramps", „strong rim light", „high-contrast detailed pixel art".

**idle (animace)** — 1 věta vizuální kotva + drobné pohyby (dýchání, plápolání, přešlapování) + **povinně**:
> "The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

**attack (animace)** — příprava → úder **na kameru** → recoil. Údery směrem k hráči piš explicitně:
„lunges forward snapping its jaws shut right at the viewer, head growing large as it strikes at the camera".
Zbraň/anatomie viditelná na spritu je autoritativní (pre-check reálného vzhledu před psaním promptu).

## 3. Generování — dávky a limity

- **Tier 1 = max 8 souběžných jobů.** Posílej po vlnách; na `429` počkej 2–3 min (background `sleep`) a pošli další vlnu.
- Job spadlý na „heavy load" → pošli **stejný create znovu** (stane se běžně).
- Doba: characters ~3–5 min, objekty ~30–90 s. Stav: `get_character` / `get_object` (s `include_preview=false` kvůli kontextu).
- **Každé ID okamžitě zapiš do `enemy-specs.json`** (`pixellab.characterId`/`objectId`, `status`).
- Ceny: v3 character 3–9 gen (dle size), objekt ~20–25 gen, animace 8 gen/směr. `get_balance` před velkou dávkou.

## 4. Stažení preview / framů — CDN URL vzory

```
# character rotace:
https://backblaze.pixellab.ai/file/pixellab-characters/{projectId}/{characterId}/rotations/south.png
# character animace (i = 0..8):
https://backblaze.pixellab.ai/file/pixellab-characters/{projectId}/{characterId}/animations/{animationId}/south/{i}.png
# object kandidáti (review):
https://backblaze.pixellab.ai/file/pixellab-characters/objects/{projectId}/{objectId}/rotations/frame_{n}.png
# object hotový + animace:
https://backblaze.pixellab.ai/file/pixellab-characters/objects/{projectId}/{objectId}/rotations/unknown.png
https://backblaze.pixellab.ai/file/pixellab-characters/objects/{projectId}/{objectId}/animations/{animationId}/unknown/{i}.png
```

Galerie pro schvalování: `montage -label '%t' *.png -tile 4x -geometry 200x200+8+8 -background '#222' -fill white sheet.png`
GIF preview animací: `convert -delay 15 -loop 0 -dispose Background idle_{0..8}.png idle.gif` (attack `-delay 10`).

## 5. Animace (po schválení base — gate 2)

- **Character**: `animate_character(character_id, mode="v3", frame_count=8, directions=["south"], animation_name="idle"|"attack", action_description=<prompt ze specs>)`
- **Object**: `animate_object(object_id, mode="v3", frame_count=8, display_name="idle"|"attack", animation_description=<prompt>)` — **BEZ `directions`** (1-dir objekt)
- Výstup = 9 framů (reference frame 0 + 8 generovaných).
- Špatná animace → vygeneruj novou skupinu s upraveným promptem (staré skupiny nevadí, manifest odkazuje na konkrétní `animationId`).

## 6. Integrace do hry (po schválení animací — gate 3)

1. Framy → `src/assets/characters/{id}/frames/{anim}_{NN}.png` (NN = 00–08)
2. `manifest.json` — šablona v `CLAUDE.md` (Sprite & Character Asset System). Objekt: `"type": "object"`, `source.objectId`, animace `direction: "unknown"`. Zapiš `animationId` + `animationGroupId` pro re-download.
3. Masky: `python3 scripts/generate_masks.py src/assets/characters/{id}` (zelené auto-masky; zpřesnění zón dělá člověk v `npm run masks-editor`)
4. `constants.ts` / `EnemyDef` / `ENEMY_POOL` — **nedělej** v rámci asset pipeline; patří do game-design fáze actů.
5. Aktualizuj `enemy-specs.json`: `status: "assets-integrated"`.

## 7. Checklist nového enemy (kopíruj a odškrtávej)

```
[ ] enemy je ve specs (jinak: doplň záznam — description/idle/attack dle §2, metoda dle §1)
[ ] create (v3 character | object + style_images)  → zapiš ID do specs
[ ] počkej na completed (poll ~2-4 min, retry na heavy load)
[ ] stáhni preview → pošli uživateli → GATE 2 (schválení / výběr kandidáta)
[ ] object: select_object_frames / najdi vybraný přes list_objects(tags=...)
[ ] animate idle + attack (v3, 8 frames, south / bez directions)
[ ] stáhni framy → GIFy → pošli uživateli → GATE 3
[ ] framy do assets/ + manifest.json + generate_masks.py
[ ] specs: status assets-integrated
```

## 8. Skriptovatelnost (pro orchestraci více enemies)

- Driver čte `enemy-specs.json`, filtruje podle `status`, posílá vlny po ≤8 jobech.
- Čekání: background `sleep 120-240` → poll → další vlna. Nikdy aktivní smyčka bez spánku.
- Schvalování dávkuj: jedna galerie (HTML/montage) pro celou vlnu, ne po jednom obrázku.
- Stavový automat per enemy: `todo → base-generating → base-review → base-approved → animating → anim-review → assets-integrated`. Po každém přechodu zapiš specs (idempotentní restart).
- Paralelní subagenti: každý dostane 1–3 enemies + tento soubor; sdílený limit 8 jobů platí pro celý účet — orchestrátor přiděluje sloty.
