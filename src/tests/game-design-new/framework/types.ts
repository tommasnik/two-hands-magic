import type { HitResult } from '../../../types'

export type { HitResult }

export interface HitDistribution {
  crit: number   // fraction 0–1
  hit: number
  graze: number
  // miss = 1 - crit - hit - graze (implicit)
}

export interface PlayerBuild {
  name: string
  description: string
  strategy: {
    hitDistribution: HitDistribution
    shotIntervalMs: number    // time between consecutive shots, alternating skills
    timingVarianceMs: number  // ±random jitter per shot (models human imprecision)
  }
}

export interface FightResult {
  won: boolean
  killTimeMs: number
}

export interface SimulationResult {
  fights: FightResult[]
  total: number
}

export interface Matcher {
  test: (value: number) => boolean
  describe: () => string
}
