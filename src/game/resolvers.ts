// Pure helper functions for resolving EnemyDef fields with fallbacks.
// Exported from here so GameStateMachine.ts stays lean.
// LevelLoader also imports them — single source of truth.

import type { EnemyDef, EnemyBehaviorDef, HitZoneEntry } from '../types'
import {
  DEFAULT_HIT_ZONE_MAP,
  LASER_ORIGIN_Y, GAME_WIDTH,
} from './constants'

const DEFAULT_ENEMY_BEHAVIOR: EnemyBehaviorDef = { pattern: 'static', speed: 0 }
const SPRITE_KEY_FALLBACK = 'enemy_placeholder'

export function resolveBehavior(def: EnemyDef): EnemyBehaviorDef { return def.behavior ?? DEFAULT_ENEMY_BEHAVIOR }
export function resolveSpriteKey(def: EnemyDef): string { return def.spriteKey ?? SPRITE_KEY_FALLBACK }
export function resolveHitZoneMap(def: EnemyDef): readonly HitZoneEntry[] { return def.hitZoneMap ?? DEFAULT_HIT_ZONE_MAP }

export const PLAYER_CENTRE = { x: GAME_WIDTH / 2, y: LASER_ORIGIN_Y }
