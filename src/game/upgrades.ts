// ============================================================
// Upgrade tree — pure functions over GlobalUpgradeState.
// No Phaser, no GameStateMachine — these are usable from UI, tests, and game logic alike.
// ============================================================

import type { GlobalUpgradeState, UpgradeNodeDef, UpgradeNodeId } from '../types'
import { UPGRADE_NODES, XP_LEVEL_THRESHOLDS, PLAYER_MAX_LEVEL } from './constants'

/**
 * Look up a node definition by id.
 * Throws if the id is not found — callers should pass ids sourced from UPGRADE_NODES.
 */
export function getUpgradeNode(nodeId: UpgradeNodeId): UpgradeNodeDef {
  const node = UPGRADE_NODES.find((n) => n.id === nodeId)
  if (!node) throw new Error(`Unknown upgrade node id: ${nodeId}`)
  return node
}

/**
 * Apply an upgrade node to the given state.
 * Pure — returns a new state with the node's stat changes folded in and the
 * node appended to unlockedNodeIds. Does not mutate the input.
 * Throws if the node is already unlocked — callers must filter via getAvailableNodes.
 */
export function applyUpgradeNode(
  state: GlobalUpgradeState,
  nodeId: UpgradeNodeId,
): GlobalUpgradeState {
  if (state.unlockedNodeIds.includes(nodeId)) {
    throw new Error(`Upgrade node already unlocked: ${nodeId}`)
  }
  const node = getUpgradeNode(nodeId)
  const transformed = node.applyTo(state)
  return { ...transformed, unlockedNodeIds: [...state.unlockedNodeIds, nodeId] }
}

/**
 * Return nodes the player can currently pick.
 * A node is available when:
 *   - it is not already unlocked, AND
 *   - its requires list is empty (root node) OR at least one prerequisite is unlocked (OR semantics).
 */
export function getAvailableNodes(state: GlobalUpgradeState): UpgradeNodeDef[] {
  const unlocked = new Set(state.unlockedNodeIds)
  return UPGRADE_NODES.filter((node) => {
    if (unlocked.has(node.id)) return false
    if (node.requires.length === 0) return true
    return node.requires.some((dep) => unlocked.has(dep))
  })
}

/** Visual status of an upgrade node for the picker UI. */
export type UpgradeNodeStatus = 'unlocked' | 'available' | 'locked'

/**
 * Classify a node into one of three picker states:
 *   - unlocked: already in unlockedNodeIds (rendered green, non-interactive)
 *   - available: prerequisites met and not yet unlocked (clickable)
 *   - locked: prerequisites not met (greyed out)
 */
export function getUpgradeNodeStatus(
  state: GlobalUpgradeState,
  nodeId: UpgradeNodeId,
): UpgradeNodeStatus {
  const unlocked = new Set(state.unlockedNodeIds)
  if (unlocked.has(nodeId)) return 'unlocked'
  const node = getUpgradeNode(nodeId)
  if (node.requires.length === 0) return 'available'
  return node.requires.some((dep) => unlocked.has(dep)) ? 'available' : 'locked'
}

/**
 * XP progress descriptor consumed by the HUD bar renderer.
 * - currentThreshold / nextThreshold are absolute XP counts.
 * - progress is the fraction of the way to the next level (0..1).
 *   For PLAYER_MAX_LEVEL it is always 1 and `isMax` is true.
 */
export interface XpProgress {
  currentThreshold: number
  nextThreshold: number
  progress: number
  isMax: boolean
}

/**
 * Compute XP progress for the HUD.
 * - At max level: progress = 1, isMax = true.
 * - Otherwise: progress = (xp - currentThreshold) / (nextThreshold - currentThreshold), clamped to 0..1.
 * The level-1 base threshold is treated as 0 because XP_LEVEL_THRESHOLDS keys
 * start at level 2 (level 1 is the starting state and needs no XP to enter).
 */
export function getXpProgress(playerLevel: number, playerXp: number): XpProgress {
  if (playerLevel >= PLAYER_MAX_LEVEL) {
    return { currentThreshold: playerXp, nextThreshold: playerXp, progress: 1, isMax: true }
  }
  // Level 1 has no entry in XP_LEVEL_THRESHOLDS — base threshold is 0 kills.
  const currentThreshold = XP_LEVEL_THRESHOLDS[playerLevel] ?? 0
  // Non-null assertion is safe — playerLevel < PLAYER_MAX_LEVEL guarantees a next entry.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const nextThreshold = XP_LEVEL_THRESHOLDS[playerLevel + 1]!
  // span is always strictly positive: XP_LEVEL_THRESHOLDS is strictly increasing.
  const raw = (playerXp - currentThreshold) / (nextThreshold - currentThreshold)
  const progress = Math.max(0, Math.min(1, raw))
  return { currentThreshold, nextThreshold, progress, isMax: false }
}
