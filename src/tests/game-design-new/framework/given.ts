import type { PlayerBuild } from './types'
import { regularPlayerBuild } from '../builds/regularPlayer.build'

export interface PlayerState {
  build: PlayerBuild
  level: number
}

export function givenPlayerWithBuild(build: PlayerBuild, opts: { level?: number } = {}): PlayerState {
  return { build, level: opts.level ?? 1 }
}

export function givenPlayerAtLevel(level: number): PlayerState {
  return givenPlayerWithBuild(regularPlayerBuild, { level })
}
