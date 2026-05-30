import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP, ENEMY_MOVE_SPEED_BASE, ENEMY_LR_AMPLITUDE_WIDE } from '../combat'
import { insectSwarmGraph } from '../../enemyGraphs'

/**
 * Insect Swarm — a cloud of insects that flies left-to-right across the arena.
 * Moderate HP, but the constant lateral sweep makes it the hardest enemy to track.
 */
export const ENEMY_INSECT_SWARM: EnemyDef = {
  name: 'Insect Swarm',
  maxHp: 25,
  manifestId: 'insect-swarm',
  spriteKey: 'insect_swarm',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: {
    pattern: 'lr_oscillate',
    speed: ENEMY_MOVE_SPEED_BASE,
    amplitude: ENEMY_LR_AMPLITUDE_WIDE,
  },
  displayWidth: 128,
  behaviorGraph: insectSwarmGraph,
}
