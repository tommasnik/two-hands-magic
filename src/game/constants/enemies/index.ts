import type { EnemyDef } from '../../../types'

// Re-export all enemy definitions
export * from './stone-giant'
export * from './plague-rat'
export * from './ice-giant'
export * from './crystal-spider'
export * from './ember-wisp'
export * from './iron-golem'
export * from './ancient-treant'
export * from './goblin-scout'
export * from './orc-warrior'
export * from './mirror-knight'
export * from './insect-swarm'
export * from './bench'

// Import for ENEMY_POOL assembly
import { ENEMY_STONE_GIANT } from './stone-giant'
import { ENEMY_PLAGUE_RAT } from './plague-rat'
import { ENEMY_ICE_GIANT } from './ice-giant'
import { ENEMY_CRYSTAL_SPIDER } from './crystal-spider'
import { ENEMY_EMBER_WISP } from './ember-wisp'
import { ENEMY_IRON_GOLEM } from './iron-golem'
import { ENEMY_ANCIENT_TREANT } from './ancient-treant'
import { ENEMY_GOBLIN_SCOUT } from './goblin-scout'
import { ENEMY_ORC_WARRIOR } from './orc-warrior'
import { ENEMY_MIRROR_KNIGHT } from './mirror-knight'
import { ENEMY_INSECT_SWARM } from './insect-swarm'

/** After each kill the next enemy in the pool is loaded. Wraps around modulo length. */
export const ENEMY_POOL: readonly EnemyDef[] = [
  ENEMY_STONE_GIANT,
  ENEMY_PLAGUE_RAT,
  ENEMY_ICE_GIANT,
  ENEMY_CRYSTAL_SPIDER,
  ENEMY_EMBER_WISP,
  ENEMY_IRON_GOLEM,
  ENEMY_ANCIENT_TREANT,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_ORC_WARRIOR,
  ENEMY_MIRROR_KNIGHT,
  ENEMY_INSECT_SWARM,
]
