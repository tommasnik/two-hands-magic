// LevelLoader — initialises all per-level state from an EnemyDef.
// No Phaser dependency.

import type { EnemyDef } from '../../types'
import type { MaskHitDetector } from './MaskHitDetector'
import { AnimationController } from './AnimationController'
import { characterRegistry } from '../CharacterRegistry'
import { Enemy } from '../entities/Enemy'
import { resolveSpriteKey, resolveHitZoneMap, resolveBehavior } from '../resolvers'

export interface LevelState {
  enemyHp: number
  enemyMaxHp: number
  enemyName: string
  enemySpriteKey: string
  enemyManifestId: string | undefined
  enemyHitZoneMap: ReturnType<typeof resolveHitZoneMap>
  enemyBehavior: ReturnType<typeof resolveBehavior>
  enemy: Enemy
}

/**
 * Build a fresh Enemy and all related per-level scalar state from an EnemyDef.
 * Pure factory — creates new objects, never mutates arguments.
 */
export function loadLevel(
  enemyDef: EnemyDef,
  enemyOriginX: number,
  enemyOriginY: number,
  maskDetector: MaskHitDetector | undefined,
): LevelState {
  const enemySpriteKey = resolveSpriteKey(enemyDef)
  const enemyHitZoneMap = resolveHitZoneMap(enemyDef)
  const enemyBehavior = resolveBehavior(enemyDef)

  let animController: AnimationController | undefined
  let useMask: MaskHitDetector | undefined
  let displayW = enemyDef.displayWidth ?? 128

  const manifestId = enemyDef.manifestId
  if (manifestId && characterRegistry.has(manifestId)) {
    const manifest = characterRegistry.get(manifestId)
    const animDefs = characterRegistry.getAnimationDefs(manifestId)
    animController = new AnimationController(animDefs)
    displayW = enemyDef.displayWidth ?? manifest.displayWidth
    const hasMasks = Object.values(manifest.animations).some(a => a.hasMasks)
    if (hasMasks && maskDetector) useMask = maskDetector
  }

  return {
    enemyHp: enemyDef.maxHp,
    enemyMaxHp: enemyDef.maxHp,
    enemyName: enemyDef.name,
    enemySpriteKey,
    enemyManifestId: enemyDef.manifestId,
    enemyHitZoneMap,
    enemyBehavior,
    enemy: new Enemy(enemyOriginX, enemyOriginY, enemySpriteKey, animController, useMask, displayW, displayW),
  }
}
