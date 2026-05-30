import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'

// ============================================================
// Bench enemies — NOT in ENEMY_POOL, NOT in the campaign.
// Each needs a behaviorGraph (see enemyGraphs.ts) before being added to ENEMY_POOL.
// ============================================================

/** Barn Spider — dog-sized ambush spider. Low HP beast enemy; precision over endurance. */
export const ENEMY_BARN_SPIDER: EnemyDef = {
  name: 'Barn Spider',
  maxHp: 16,
  manifestId: 'barn-spider',
  spriteKey: 'barn_spider',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 200,
}

/** Wolf — lean gray predator. Moderate HP beast; a step up from the early vermin enemies. */
export const ENEMY_WOLF: EnemyDef = {
  name: 'Wolf',
  maxHp: 30,
  manifestId: 'wolf',
  spriteKey: 'wolf',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 210,
}

/** Wild Boar — stocky, mud-caked charging beast. Tankier than the wolf; a heavy mid-tier beast. */
export const ENEMY_WILD_BOAR: EnemyDef = {
  name: 'Wild Boar',
  maxHp: 40,
  manifestId: 'wild-boar',
  spriteKey: 'wild_boar',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 230,
}

/** Bandit — hooded dual-wielding outlaw. Humanoid mid-tier; nimble roadside robber. */
export const ENEMY_BANDIT: EnemyDef = {
  name: 'Bandit',
  maxHp: 35,
  manifestId: 'bandit',
  spriteKey: 'bandit',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 150,
}
