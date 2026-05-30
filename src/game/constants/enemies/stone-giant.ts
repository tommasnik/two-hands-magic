import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { stoneGiantGraph } from '../../enemyGraphs'

/**
 * Stone Giant — sprite-based enemy with pixel-perfect mask hit detection.
 * Uses PNG mask-based hit detection for precise crit/hit/graze/miss resolution.
 */
export const ENEMY_STONE_GIANT: EnemyDef = {
  name: 'Stone Giant',
  maxHp: 70,
  manifestId: 'stone-giant',
  spriteKey: 'stone_giant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 400,
  behaviorGraph: stoneGiantGraph,
}
