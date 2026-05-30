# PixelLab — generování sprites (instrukce)

> Načti tento soubor pokaždé, když pracuješ s **PixelLab MCP** nebo když **generuješ / zadáváš generování sprites**.
> Destilace ověřených zkušeností. Detaily game-side pipeline (manifest, loader, masky) jsou v `CLAUDE.md` → „Sprite & Character Asset System".

---

## 1. Než cokoliv vygeneruješ

1. **Načti aktuální docs** — `WebFetch https://api.pixellab.ai/mcp/docs`. Reference všech tools + parametrů; aktualizuje se s API. Nikdy nespoléhej na zapamatované parametry.
2. **Zkontroluj balance** — `get_balance` před větší dávkou.
3. **Project ID** naší hry: `10f15a6e-f984-4afa-8be1-b703bfaeb07e`.

---

## 2. Kamera / view — side-scroller konvence (DŮLEŽITÉ)

Hra je **side-scroller**. Nepřátelé musí být snímaní kamerou **v úrovni očí, zepředu** — NE shora (top-down).

| Nástroj | Parametr | Hodnota |
|---------|----------|---------|
| `create_character` | `view` | `"side"` (NE default `"low top-down"`) |
| `create_1_direction_object` | `view` | `"sidescroller"` |

- Směr animací zůstává **`south`** = postava čelem ke kameře.
- `view: "side"` + směr `south` = **čelní pohled v úrovni očí** (kamera nemíří shora). Přesně to chceme.
- `view` ovládá náklon kamery (top-down vs. eye-level), `direction` ovládá natočení postavy. Profil (doleva/doprava) by byl `east`/`west` — ten nepoužíváme.

---

## 3. Volba metody generování — character vs. object

Tři cesty, každá na jiný typ tvora:

| # | Metoda | Tool | Kdy |
|---|--------|------|-----|
| 1 | **Skeleton character** | `create_character` (`humanoid` / `quadruped` + template) | Jasný bipední / čtyřnohý tvor |
| 2 | **Single object** | `create_1_direction_object` → `animate_object` | Tvar, který se nevejde do humanoid/quadruped kostry |
| 3 | **Sada objektů + výběr** | `create_1_direction_object` (batch) → uživatel vybere → `animate_object` | Jako 2, ale chceme vybírat z víc variant |

Rozdíly:
- **Character (1)**: skeleton animace, vždy 8 směrů (v3/pro), kostra. Pro netypické tvary (pavouk) bývá horší.
- **Object (2/3)**: jediný směr, žádné plýtvání na rotace, volnější tvar bez kostry. Batch mód podle `size` vygeneruje víc kandidátů (≤42px→64, ≤85px→16, ≤170px→4) ve stavu `review`. V naší hře jsou objekty plnohodnotní nepřátelé (manifest `"type": "object"`).
- ⚠️ `create_character` **neumí** reference image — existující obrázek nejde proměnit ve skeleton-character.

### Rozhodovací pravidlo

- **Jasný humanoid** (bandita, gnoll, rytíř, ork, mág…) → **vždy metoda 1**, `body_type: humanoid`. Neptej se.
- **Jasný čtyřnožec** (medvěd, vlk, kanec, kočka, kůň…) → **vždy metoda 1**, `body_type: quadruped` + nejbližší `template` (bear/cat/dog/horse/lion). Neptej se.
- **Diskutabilní / netypický tvar** → **NEJDŘÍV se zeptej uživatele** (`AskUserQuestion`), navrhni doporučenou variantu 1/2/3 a nech rozhodnout. Bez odpovědi negeneruj.

Diskutabilní = nemá čistou humanoid/quadruped kostru nebo může vypadat víc způsoby: pavouk (8 nohou), elementál, beholder, drak (čtyřnohý vs. wyvern), ještěři/lizardi, cokoliv beztvarého/létajícího/vícenohého. Když váháš „je to jasné?" → ber to jako diskutabilní a zeptej se.

---

## 4. Proces generování jednoho spritu

```
1. create_character / create_1_direction_object   (view dle §2, params dle tasku)
2. PRE-CHECK base spritu  ── stáhni a vizuálně zkontroluj (get_character/get_object, include_preview)
                            └─ uprav action_description podle REÁLNÉHO vzhledu (póza, zbraň, barvy, proporce)
3. ⚠️ STOP — schválení base spritu UŽIVATELEM
                            └─ zobraz sprite, popiš ho, POČKEJ na explicitní potvrzení
                            └─ při zamítnutí přegeneruj a znovu si vyžádej potvrzení. Bez potvrzení NEanimuj.
4. animate idle    (south, v3, 8 frames, seamless loop)
5. animate attack  (south, v3, 8 frames)
6. download frames → src/assets/characters/{id}/frames/   (přejmenuj na {animKey}_{NN}.png)
7. manifest.json   (šablona v CLAUDE.md)
8. masks           (python3 scripts/generate_masks.py src/assets/characters/{id})
9. (volitelné) zpřesni masky v sprite-masks-editoru
```

**Výběr kandidátů (review stav) dělá VŽDY uživatel, nikdy agent.** Platí pro characters i objects. Agent kandidáty zobrazí (`include_preview`) a popíše; výběr potvrdí `select_object_frames`, zahození `dismiss_review`.

---

## 5. Jak psát prompty

### `description` (při create)
Kompletní statický vizuální popis postavy: materiály, barvy, proporce, srst/peří, zbraně, vybavení, textury, póza. Čím víc detailů, tím konzistentnější výsledek.

### `action_description` (při animate)
**Self-contained** — PixelLab generuje framy nezávisle, takže prompt musí nést vizuální informace nutné pro konzistenci, ne jen popis pohybu. `description` z create slouží jako vizuální kotva — v animaci ji není třeba opakovat celou.

### Délka promptu

Cílová délka: **40–70 slov (~250–450 znaků)**, tj. 2–3 věty.
Delší prompt konzistenci nezlepšuje — `description` z create už nese plný vizuál.

Struktura:
- **1 věta** — vizuální kotva: silueta + 1–2 materiály + zbraň. **NE** celý inventář výstroje.
- **1–2 věty** — pohyb: příprava → úder/drift → návrat.
- idle navíc: povinná věta o seamless loop.

**Anti-pattern**: opakovat kompletní soupisku výstroje (vesta + pláty + rukávy + kalhoty + boty + belt + pouches + kapuce + šátek…) v každém animačním promptu. Stačí 3–5 klíčových znaků.

Pravidla:
1. **Pre-check first** — popis odvoď od toho, co reálně vidíš na spritu, ne od idealizovaného zadání. Pokud sprite nemá zbraň ze zadání, uprav útok.
2. **Idle = seamless loop** — první a poslední frame vizuálně identické (póza i pozice). Do promptu VŽDY explicitně přidej větu:
   > „The animation forms a seamless loop — the first and last frames are visually identical in pose and position."
3. **Vizuální kotva** — uveď siluetu + 1–2 dominantní materiály + zbraň. Neopakuj celý inventář výstroje z `description`.
4. **Konzistence zbraní** — pokud postava drží zbraň (meč, sekera, dýka, oštěp…), attack MUSÍ útočit **touto** zbraní viditelnou na spritu. Žádný generic punch/slam. Zbraň na spritu je autoritativní, ne popis v zadání. Bestie útočí přirozeně (bite/pounce/gore/claw swipe).

### Šablona

**idle** (loop):
> „A [silueta + 1–2 materiály + zbraň], standing upright facing forward. [Drobné idle pohyby: dýchání, přešlapování, twitch uší/ocasu]. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

**attack** (one-shot):
> „The [silueta + zbraň] attacks — [příprava: coil/draw back/lower head], [úder směrem ke kameře], [recoil zpět do ready stance]."

---

## 6. Pojmenování animací

V manifestu i kódu se útočná animace **vždy** jmenuje `attack` (ne `throw`/`slash`/`bite`) — sémantický typ, ne vizuální popis. Tím je loader/renderer generický. Povinné: `idle` + `attack`. Volitelné: `hurt`, `death`.

| PixelLab popis | animKey |
|----------------|---------|
| sits/stands/breathing/idle | `idle` (loop: true) |
| attack/throw/lunge/bite/slash | `attack` (loop: false) |
| alternativní útok | `attack_<popis>` / `bite` / `throw` |

---

## 7. Quality escalation (když je výsledek špatný)

Animace: zkus další úroveň (nejdřív smaž předchozí):
1. **template** (1 gen/dir) — standardní walk/run/idle
2. **v3** (1 gen/dir) — custom `action_description`, levné re-roll → **náš default**
3. **pro** (20–40 gen/dir) — nejvyšší kvalita, cross-direction reference. ⚠️ Pro `pro` mode: první volání BEZ `confirm_cost`, ukaž cenu uživateli, teprve po potvrzení `confirm_cost: true`.
