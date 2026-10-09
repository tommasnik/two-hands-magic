# Acts — kampaňový koncept (potvrzeno 2026-07-20)

> 4 acty à la Diablo 2, každý ~10 nepřátel (8 běžných + 1 elitní + 1 boss).
> Cíl: south-facing `idle` + `attack` animace pro všechny. Generování → `PixelLab.md`.
> Obtížnost škáluje per-act multiplikátorem HP/damage; uvnitř actu se míchají pohybové
> patterny a delivery typy.

## Velikostní tiery spritů (native px při generování)

Native size ovlivňuje detail spritu; in-game velikost řeší `displayWidth`.
v3 mód umí až 256 px. Referenční existující: goblin 88, bandit 124, orc 184, treant 248.

| Tier | Native px | Kdo |
|------|-----------|-----|
| S — havěť | 64–96 | krysy, swarmy, imp, scarab, wisp |
| M — humanoid | 128 | mummy, skeleton, jackal, cultist, witch, revenant, demoness, harpy |
| L — velký tvor | 160–192 | yeti, hellhound, bear, frost wolf, orc |
| XL — elitní/boss | 208–256 | kolosové, giganti, drake, demon lord, golemové |

## Act I — Temný hvozd (les, farmy, banditské tábory)

| # | Enemy | Role | Metoda | Size | Stav |
|---|-------|------|--------|------|------|
| 1 | Farm Rat | fodder | quadruped | — | ✅ hotovo |
| 2 | Insect Swarm | fodder | object | — | ✅ hotovo |
| 3 | Barn Spider | fodder | object | — | ✅ hotovo |
| 4 | Wild Boar | běžný | quadruped | — | ✅ hotovo |
| 5 | Wolf | běžný | quadruped | — | ✅ hotovo |
| 6 | Goblin Scout | běžný | humanoid | — | ✅ hotovo |
| 7 | Bandit | běžný | humanoid | — | ✅ hotovo |
| 8 | Forest Bear | běžný | quadruped (bear) | L | 🟡 v PixelLabu (7d5053c5), chybí animace |
| 9 | Plague Rat | elitní | — | — | ✅ hotovo |
| 10 | Ancient Treant | **boss** | — | — | ✅ hotovo |

## Act II — Spálené pustiny (poušť, hrobky, ruiny)

| # | Enemy | Role | Metoda | Size | Stav | Vizuální kotva |
|---|-------|------|--------|------|------|----------------|
| 1 | ~~Scarab Swarm~~ | — | — | — | ❌ zrušen (žádný kandidát neschválen) | Act II má zatím 9 nepřátel; náhrada TBD |
| 2 | Carrion Vulture | fodder | object | S–M | 🆕 | prašivý sup, holý krk, potrhaná křídla |
| 3 | Sand Cobra | běžný | object | M | 🆕 | vztyčená písková kobra s roztaženou kápí |
| 4 | Jackal Raider | běžný | humanoid | M (128) | 🆕 | šakalí hlava, kožené pláty, zahnutá šavle |
| 5 | Skeleton Archer | běžný | humanoid | M (128) | 🆕 | zažloutlé kosti, rozpadlý luk, toulec |
| 6 | Mummy | běžný | humanoid | M (128) | 🔄 pilot | potrhané obvazy, jantarové oči, zlatý límec |
| 7 | Orc Warrior | běžný | — | — | ✅ hotovo (přesun) | |
| 8 | Sand Elemental | běžný | object | L | 🆕 | vířící sloup písku s kamennými pěstmi |
| 9 | Stone Giant | elitní | — | — | ✅ hotovo (přesun) | |
| 10 | Tomb Colossus | **boss** | humanoid | XL (224+) | 🆕 | obří kamenný strážce hrobky, zlaté hieroglyfy |

## Act III — Mrazivé štíty (ledovce, zamrzlé průsmyky)

| # | Enemy | Role | Metoda | Size | Stav | Vizuální kotva |
|---|-------|------|--------|------|------|----------------|
| 1 | Frost Wolf | fodder | quadruped (dog) | L | 🆕 | bílo-modrá srst, ledové ostny na hřbetě |
| 2 | Snow Harpy | fodder | object | M | 🆕 | bledá harpyje, zmrzlá péřová křídla |
| 3 | Frozen Revenant | běžný | humanoid | M (128) | 🆕 | zmrzlá mrtvola válečníka, ojíněná zbroj |
| 4 | Crystal Spider | běžný | — | — | ✅ hotovo, doplnit idle | |
| 5 | Yeti | běžný | humanoid | L (160) | 🆕 | mohutný bílý yeti, dlouhé paže, modrá kůže |
| 6 | Ice Elemental | běžný | object | L | 🆕 | levitující shluk ledových krystalů |
| 7 | Winter Witch | běžný | humanoid | M (128) | 🆕 | bledá čarodějka, rampouchová hůl, vlající plášť |
| 8 | Frost Drake | běžný | object | XL | 🆕 | ledový drak bez předních nohou (wyverna) |
| 9 | Ice Giant | elitní | — | — | ✅ hotovo, doplnit idle | |
| 10 | Glacier Colossus | **boss** | humanoid | XL (224+) | 🆕 | kolos z ledovcového ledu, vmrzlé balvany |

## Act IV — Pekelná citadela (obsidián, láva, démoni)

| # | Enemy | Role | Metoda | Size | Stav | Vizuální kotva |
|---|-------|------|--------|------|------|----------------|
| 1 | Ember Wisp | fodder | — | — | ✅ hotovo (přesun) | |
| 2 | Imp | fodder | humanoid | S (96) | 🆕 | malý rudý ďáblík, ostny, dlouhý ocas |
| 3 | Hellhound | běžný | quadruped (dog) | L | 🆕 | černý pes, hořící hříva, žhnoucí oči |
| 4 | Fire Cultist | běžný | humanoid | M | 🟡 v PixelLabu (03fd4e3f, Fire Mage), chybí animace |
| 5 | Shadow Fiend | běžný | object | M | 🆕 | beztvarý stín s drápy a bílýma očima |
| 6 | Bone Colossus | běžný | humanoid | XL (208) | 🆕 | obr sešitý z kostí, chybějící čelist |
| 7 | Mirror Knight | běžný | — | — | ✅ hotovo (přesun) | |
| 8 | Blade Demoness | běžný | humanoid | M (128) | 🆕 | démonka s čepelemi místo předloktí |
| 9 | Iron Golem | elitní | — | — | ✅ hotovo (přesun) | |
| 10 | Demon Lord | **boss** | humanoid | XL (256) | 🆕 | rohatý vládce démonů, složená křídla, ohnivý meč |

## Bilance

- ✅ hotových: 16 (vč. přesunů mezi acty)
- 🟡 jen doanimovat: Forest Bear, Fire Cultist (Fire Mage)
- 🔧 doplnit idle: Ice Giant, Crystal Spider
- 🆕 nových: 22 (pilot: Mummy)

## Pipeline (potvrzený proces)

1. **Base sprites** — jednodušší model generuje po dávkách (per act), v3 mód, `view: "side"`,
   size dle tieru. Uživatel **vždy** schvaluje base sprite / vybírá kandidáty objektů.
2. **Animace** — po schválení paralelní agenti: south `idle` (seamless loop) + `attack`,
   v3, 8 frames. Prompty dle `PixelLab.md` §5.
3. **Integrace** — download framů, `manifest.json`, `generate_masks.py`, registrace
   v `constants.ts` + loader.
