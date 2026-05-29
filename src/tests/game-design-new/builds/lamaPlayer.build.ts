import type { PlayerBuild } from '../framework/types'

// Rarely crits, often misses, fires slowly. The worst realistic player.
export const lamaPlayerBuild: PlayerBuild = {
  name: 'lama',
  description: 'Rarely crits, mostly misses, fires every ~1 s.',
  strategy: {
    hitDistribution: { crit: 0.10, hit: 0.30, graze: 0.10 },
    shotIntervalMs: 1000,
    timingVarianceMs: 200,
  },
}
