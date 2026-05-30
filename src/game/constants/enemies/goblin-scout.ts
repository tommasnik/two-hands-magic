import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { goblinScoutGraph } from '../../enemyGraphs'

/** Goblin Scout — small, lightly armoured skirmisher. Low HP, easy warm-up enemy. */
export const ENEMY_GOBLIN_SCOUT: EnemyDef = {
  name: 'Goblin Scout',
  maxHp: 18,
  manifestId: 'goblin-scout',
  spriteKey: 'goblin_scout',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 120,
  behaviorGraph: goblinScoutGraph,
}
