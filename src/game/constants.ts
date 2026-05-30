// ============================================================
// constants.ts — barrel re-export
// All tunable values live in src/game/constants/ domain files.
// This file exists so existing imports (import { X } from './constants')
// continue to work without any changes across the codebase.
// ============================================================

export type { TouchPointDef, MovementPattern, EnemyBehaviorDef } from '../types'

// Re-export all attack constants so consumers can still import from 'constants'.
export * from './enemyAttackConstants'

// Domain-specific exports
export * from './constants/canvas'
export * from './constants/input'
export * from './constants/player'
export * from './constants/combat'
export * from './constants/upgrades'
export * from './constants/skills'
export * from './constants/enemies'
