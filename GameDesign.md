# Two Hands Magic — Game Design Document

> Aktuální stav hry + vize cílového stavu. Základ pro refactoring.
> Otevřené otázky jsou explicitně označeny — neimplementuj bez rozhodnutí.

---

## 1. Přehled hry

Two Hands Magic je mobilní tahová akční hra. Hráč drží telefon oběma rukama a palci ovládá
magická kouzla namířená na nepřítele. Hraje se v portrétním režimu, celá interakce probíhá
dotykem.

**Klíčový záměr:** Hra, kde záleží na sestavě (buildu) — kombinace skillů, které spolu dobře
fungují, a schopnost hráče je efektivně použít jsou rozhodující pro výsledek.

---

## 2. Základní herní smyčka

```
[Nepřítel se zobrazí]
  → Hráč mačká touch pointy (palce)
  → Zaměřovač (laser reticle) se pohybuje
  → Skill se vystřelí jako projektil
  → Projektil zasáhne/mine nepřítele
  → HP nepřítele klesne → nepřítel umře
  → Level-up / výběr upgradu
  → Další nepřítel
```

**Aktuálně:** Jeden nepřítel na obrazovce naráz, 11 nepřátel = jeden run.

**Výhledově:** Více nepřátel současně (viz §8).

---

## 3. Vstupní mechanika

Hráč má 6 touch pointů — 3 vlevo, 3 vpravo. Každý slot je fixní pozice na obrazovce
(optimalizováno pro ovládání palcem).

| Slot    | Strana | Barva    | Perioda rotace |
|---------|--------|----------|----------------|
| slot 0  | vlevo  | zelený   | —              |
| slot 1  | vlevo  | fialový  | 600 ms         |
| slot 2  | vlevo  | oranžový | —              |
| slot 3  | vpravo | modrý    | 2800 ms        |
| slot 4  | vpravo | červený  | —              |
| slot 5  | vpravo | žlutý    | —              |

Každý slot nese jeden skill. Hráč drží prst na touch pointu → laser reticle se otáčí →
uvolní prst → skill se vystřelí. Délka držení i moment uvolnění určují, kam reticle míří.

---

## 4. Skill systém

### 4.1 Aktuální stav

Hra má 4 aktivní skilly + 2 legacy (slow_shot, fast_shot — z dřívějška):

| Skill           | Damage   | Charakter                          |
|-----------------|----------|------------------------------------|
| white_shot      | 2–4 HP   | Rapid, nejrychlejší                |
| fireball        | 10–14 HP | Pomalý, silný burst                |
| ice_crystal     | 3–5 HP   | Freeze efekt, pomalejší            |
| lightning_blast | 9–12 HP  | Silný, discharge efekt             |

Skilly jsou přiřazeny ke slotům v `DEFAULT_SKILL_CONFIG` (konstanty). Každý slot = jeden skill.
Skill type je union (`SkillType` v `types/index.ts`). Damage počítá `DamageSystem`.

**Problém (OCP):** Přidání nového skillu vyžaduje změny na minimálně těchto místech:
- `SkillType` (union)
- `constants.ts` (damage, perioda)
- `DamageSystem` (kalkulace)
- `GameStateMachine` (aplikace efektů)
- rendering (vizuál projektilu)
- game-design testy

### 4.2 Atributy skillu (aktuální + plánované)

| Atribut              | Stav        | Popis                                                         |
|----------------------|-------------|---------------------------------------------------------------|
| cast time            | implementováno | Rychlost pohybu zaměřovače (perioda rotace)                |
| damage               | implementováno | Min/max HP odečtené při zásahu                             |
| crit modifier        | implementováno | Násobič při zásahu do hlavy (CRIT zóna)                    |
| efekty               | částečně    | Freeze (ice_crystal), discharge (lightning)                   |
| cooldown             | **chybí**   | Čas než lze skill znovu použít po vystřelení                  |
| rozsah (spell area)  | implementováno | Poloměr projektilu, ovlivňuje hit-zone přesnost           |
| combo efekty         | **chybí**   | Efekty při kombinaci se stavem enemy nebo jiným skillem        |
| hit efekt            | implementováno | Grafika dopadu                                             |
| flight efekt         | implementováno | Grafika letu projektilu                                    |

### 4.3 Skill leveling (plánováno — není implementováno)

Atributy 1–5 se mění tím, jak hráč skill používá. Vznikne **leveling system** navázaný na
fight statistiky (DPS/accuracy per slot, které již sbíráme).

Princip: lepší hráč = rychlejší progress skillu = větší diferenciace buildů.

> **Otevřená otázka O1:** Jaká je přesná mechanika skill levelingu? Automaticky dle usage,
> nebo hráč investuje body? Jaký je cap? → viz §9.

### 4.4 Skill slots — konfigurace

Hráč si může dávat skilly do slotů jak se mu hodí (drag & drop nebo výběr v menu).

> **Otevřená otázka O2:** Kde a jak hráč konfiguruje sloty? Je to v menu mimo boj,
> nebo i during combat? → viz §9.

> **Otevřená otázka O3:** Jak hráč skilly získává? Skill tree, milníky v kampani,
> náhodné lootem? → viz §9.

---

## 5. Skill interakce — klíčová sekce

Toto je **stěžejní část hry** a zatím není implementována.

### 5.1 Princip

Skilly se navzájem ovlivňují přes **stavy nepřítele** (enemy status) a přes **timing**
(kdy zasiluji který skill). Vytváří to hloubku: nestačí jen střílet, záleží na pořadí
a kombinaci.

### 5.2 Příklady interakcí

| Situace                                    | Výsledek                                           |
|--------------------------------------------|---------------------------------------------------|
| Enemy zmražen (ice_crystal) + lightning    | Lightning zasahuje opakovaně po dobu trvání ledu  |
| Enemy zmražen + fireball                   | Led se roztaví, žádný bonus damage                 |
| Dva skilly dopadnou ve stejnou dobu        | Combo bonus (zatím nedefinováno)                   |
| Enemy má status X + skill Y               | Efekt Z (per-interaction definice)                 |

### 5.3 Požadovaný systém

Musí vzniknout systém, který:
- Sleduje **aktivní stavy nepřítele** (frozen, burning, …)
- Při zasažení skillem zkontroluje, zda je enemy v nějakém stavu
- Aplikuje **interaction rules** (frozen + lightning = bonus)
- Poskytuje dostatek hooků pro **grafiku interakce** (jiný vizuál při combo)

> **Rozhodnutí O4:** Interaction rules se implementují tím, co je jednodušší (kód).
> Skutečný problém není data vs. kód — je to custom grafika per kombinace, která
> s rostoucím počtem skillů vytvoří bottleneck. Systém musí mít čisté hranice tak,
> aby bylo snadné ho přepsat nebo odstranit. YAGNI, žádné over-engineering.

> **Otevřená otázka O5:** Jaké jsou plánované enemy statusy? Jen frozen? Burning? Shocked?
> → viz §9.

---

## 6. Enemy systém

### 6.1 Aktuální stav

11 nepřátel definovaných v `ENEMY_POOL` (constants.ts). Každý `EnemyDef` obsahuje:
- `maxHp`, `name`, `manifestId` (sprite)
- `behavior` — pohybový pattern (static, lr_oscillate, zigzag, …)
- `behaviorGraph` — deklarativní graf stavů (animace + útoky), viz `EnemyAttacks.md`
- `hitZoneMap` — hit zóny (head → CRIT, torso → HIT, legs → GRAZE)
- `displayWidth` — velikost spritu

Chování je deklarativní a rozšiřitelné — přidání nového grafu = jen data, žádný kód
(tohle funguje dobře).

### 6.2 Kompozice enemy (cílový stav)

Enemy má být jednoduše konfigurovatelný ze standardních modulů:

```ts
// Příklad cílové konfigurace
const STONE_GIANT_VARIANT: EnemyDef = {
  name: 'Stone Giant — Berserker',
  hp: 100,
  behavior: BEHAVIOR_STATIC,
  attacks: [
    attack('stone_fist', { damage: 20, pattern: ATTACK_MELEE }),
    attack('boulder_throw', { damage: 10, pattern: ATTACK_RANGED }),
  ],
  resistances: { frozen: 'immune', burning: 'weak' },
}
```

Cíl: správce hry napíše nového enemy jako konfiguraci, bez zásahu do kódu systémů.

> **Otevřená otázka O6:** Jak konkrétně bude vypadat attack konfigurace? Přes
> `behaviorGraph` (existující), nebo nová vrstva nad tím? → viz §9.

### 6.3 Více nepřátel současně (výhledové)

Zatím neimplementujeme. Systém to ale musí umět přijmout — žádné předpoklady
o „jednom aktivním enemy" nesmí být hardcodovány.

---

## 7. Hráčská progrese

### 7.1 Aktuální stav

**Leveling:**
- 1 kill = 1 XP
- 12 levelů (threshold per level v constants)
- Level-up → game čeká na výběr upgradu

**Upgrade tree (aktuální):**
- 18 nodů ve 5 cestách
- Cesty: cast_time, crit, proj_speed, spell_area, quick_chain
- Node: id, title, description, requires[], applyTo(GlobalUpgradeState)
- OR-dependencies: stačí splnit jeden z requirements

### 7.2 Cílový stav

Upgrade tree bude pravděpodobně nahrazen klasickými atributy hráče:

| Atribut | Co ovlivňuje                          |
|---------|---------------------------------------|
| STR     | HP hráče                              |
| DEX     | Crit modifier                         |
| INT     | Rychlost castingu (jak rychle míří laser) |
| ENERGY  | Velikost kouzla (spell area)          |

Level-up = hráč přidá body do atributů → všechna kouzla se změní proporcionálně.

> **Rozhodnutí O7:** Atributy budou STR / DEX / INT / ENERGY (viz tabulka níže).
> Ale zatím se nad aktuální upgrade progresí postaví abstrakce — systém se pak může
> přepsat na tento model bez změny klientského kódu. Počítej se změnou mapping.

> **Otevřená otázka O8:** Koexistuje skill leveling (§4.3) s player atributy?
> Jak se vzájemně ovlivňují? → viz §9.

---

## 8. Campaign / Level struktura

### 8.1 Aktuální stav

Jeden run = 11 nepřátel v pevném pořadí (`ENEMY_POOL`). Každý nepřítel = jeden level.
Po každém nepříteli = level-up + výběr upgradu.

### 8.2 Cílový stav (konfigurovatelné levely)

```ts
// Příklad cílové konfigurace
const CAMPAIGN: Level[] = [
  { id: 1, enemies: [GOBLIN_SCOUT], modifiers: [] },
  { id: 2, enemies: [ORC_WARRIOR], modifiers: [{ type: 'buffed', multiplier: 1.2 }] },
  { id: 3, enemies: [STONE_GIANT, PLAGUE_RAT], modifiers: [] }, // dva naráz (výhledové)
]
```

Správce hry konfiguruje levely čistě jako data. Systém to spustí bez zásahu do kódu.

> **Otevřená otázka O9:** Jak se levely odemykají? Sekvenčně, nebo je tam meta-vrstva
> (mapa světa, branching)? → viz §9.

---

## 9. Otevřené otázky

| ID  | Stav       | Otázka                                                                 | Dopad                     |
|-----|------------|------------------------------------------------------------------------|---------------------------|
| O1  | otevřeno   | Mechanika skill levelingu (auto/manual, cap, scaling)                  | Skill modul design        |
| O2  | otevřeno   | Kde/jak hráč konfiguruje sloty (menu, in-combat?)                      | UI architektura           |
| O3  | otevřeno   | Jak hráč skilly získává (skill tree, milníky, loot)                    | Progression systém        |
| O4  | rozhodnuto | Interaction rules v kódu, čisté hranice, snadná výměna                | Interaction systém design |
| O5  | rozhodnuto | Statusy: frozen (hotovo), stun/cursed/slowed (brzy), další přibudou   | Status systém scope       |
| O6  | otevřeno   | Jak vypadá attack konfigurace v enemy (behaviorGraph vs. nová vrstva)  | Enemy modul design        |
| O7  | rozhodnuto | STR/HP, DEX/crit, INT/cast speed, ENERGY/area; zatím abstrakce nad UT | Leveling redesign         |
| O8  | otevřeno   | Koexistence skill levelingu s player atributy                          | Progression komplexita    |
| O9  | otevřeno   | Meta struktura kampaně (sekvenční, mapa světa, branching)              | Campaign systém design    |

---

## 10. Cílový stav — architektura (vize refactoringu)

### 10.1 Skill jako self-contained modul

```
src/game/skills/
  fireball/
    index.ts         ← SkillModule: { type, damage, castTime, effects, visuals }
    effects.ts       ← AppliesEffect: burning (future)
    interactions.ts  ← InteractionRule[]: { enemyStatus, result }
  ice_crystal/
    ...
  lightning_blast/
    ...
```

Přidání nového skillu = nová složka. Žádné změny ve stávajícím kódu.

### 10.2 Constants rozděleny po doménách

```
src/game/constants/
  canvas.ts          ← rozměry, pixel density
  input.ts           ← touch sensitivity, max touches
  player.ts          ← HP, leveling thresholds
  skills/
    fireball.ts      ← damage, speed, area
    ice_crystal.ts
    ...
  enemies/
    stone-giant.ts
    plague-rat.ts
    ...
  upgrades.ts        ← upgrade tree
```

### 10.3 BattleScene rozdělena

```
src/scenes/
  BattleScene.ts          ← orchestrátor (thin), deleguje na:
  renderers/
    EnemyRenderer.ts      ← sprite, animace, hit zones
    SkillRenderer.ts      ← projektily, delivery vizuály
    HUDRenderer.ts        ← HP, sloty, score
    BackgroundRenderer.ts
```

### 10.4 Level a Enemy konfigurace

```
src/game/
  levels/
    campaign.ts      ← Level[] konfigurace
    modifiers.ts     ← LevelModifier typy
  enemies/
    stone-giant.ts   ← EnemyDef (data)
    plague-rat.ts
    ...
```
