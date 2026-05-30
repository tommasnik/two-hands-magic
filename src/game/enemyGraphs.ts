// ============================================================
// enemyGraphs — declarative BehaviorGraph configs for all 11 ENEMY_POOL enemies.
// Pure TypeScript data. Zero Phaser imports. Contract: EnemyAttacks.md §3, §9.
//
// Numeric values are imported from enemyAttackConstants.ts; zero hardcoded numbers.
// This file is imported by constants.ts (not the other way) to avoid circular deps.
// ============================================================

import type { BehaviorGraph } from '../types'
import {
  ENEMY_ATTACK_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS,
  ENEMY_ATTACK_IDLE_DWELL_SLOW_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_SLOW_MS,
  ENEMY_ORB_SPEED_CM_S,
  ENEMY_OVERLAY_CONNECT_MS,
  ENEMY_ORB_CAST_DY,
  ENEMY_ATTACK_RELEASE_FRAME_7F,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
  ENEMY_ATTACK_RELEASE_FRAME_13F,
  ENEMY_VISUAL_KEY_ORB,
  ENEMY_VISUAL_KEY_MELEE,
  ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE,
  ENEMY_PLAGUE_RAT_ATTACK_DAMAGE,
  ENEMY_EMBER_WISP_ATTACK_DAMAGE,
  ENEMY_STONE_GIANT_ATTACK_DAMAGE,
  ENEMY_INSECT_SWARM_ATTACK_DAMAGE,
  ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE,
  ENEMY_ORC_WARRIOR_ATTACK_DAMAGE,
  ENEMY_IRON_GOLEM_ATTACK_DAMAGE,
  ENEMY_ICE_GIANT_ATTACK_DAMAGE,
  ENEMY_ICE_GIANT_THROW_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE,
  ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE,
} from './enemyAttackConstants'

// ============================================================
// Simple pattern helper — idle → attack → combat_idle → idle
// Used for all 9 enemies that have idle + single attack animation.
// ============================================================

function simpleOrbGraph(idleDwellMs: number, combatIdleDwellMs: number, damage: number, releaseFrame: number): BehaviorGraph {
  return {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: idleDwellMs },
        edges: [{ to: 'attack', weight: 1 }],
      },
      attack: {
        id: 'attack',
        animKey: 'attack',
        exitTrigger: { kind: 'animationComplete' },
        attack: {
          damage,
          releaseFrame,
          kind: 'orb',
          visualKey: ENEMY_VISUAL_KEY_ORB,
          projectileSpeedCmS: ENEMY_ORB_SPEED_CM_S,
          castPoint: { dx: 0, dy: ENEMY_ORB_CAST_DY },
        },
        edges: [{ to: 'combat_idle', weight: 1 }],
      },
      combat_idle: {
        id: 'combat_idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: combatIdleDwellMs },
        edges: [{ to: 'idle', weight: 1 }],
      },
    },
  }
}

function simpleMeleeGraph(idleDwellMs: number, combatIdleDwellMs: number, damage: number, releaseFrame: number): BehaviorGraph {
  return {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: idleDwellMs },
        edges: [{ to: 'attack', weight: 1 }],
      },
      attack: {
        id: 'attack',
        animKey: 'attack',
        exitTrigger: { kind: 'animationComplete' },
        attack: {
          damage,
          releaseFrame,
          kind: 'overlay',
          visualKey: ENEMY_VISUAL_KEY_MELEE,
          overlayConnectMs: ENEMY_OVERLAY_CONNECT_MS,
        },
        edges: [{ to: 'combat_idle', weight: 1 }],
      },
      combat_idle: {
        id: 'combat_idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: combatIdleDwellMs },
        edges: [{ to: 'idle', weight: 1 }],
      },
    },
  }
}

// ============================================================
// 1. Stone Giant — ranged orb (throws rocks), 7-frame attack
//    Campaign position #1. Normal tempo, moderate damage.
// ============================================================

export const stoneGiantGraph: BehaviorGraph = simpleOrbGraph(
  ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS,
  ENEMY_STONE_GIANT_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_7F,
)

// ============================================================
// 2. Plague Rat — melee overlay (bite), 9-frame attack
//    Campaign position #2. Fast tempo, low damage per hit.
// ============================================================

export const plagueRatGraph: BehaviorGraph = simpleMeleeGraph(
  ENEMY_ATTACK_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS,
  ENEMY_PLAGUE_RAT_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 3. Ice Giant — ranged orb, NO idle animation.
//    Two attack animations: 'attack' (windup) and 'throw' (full release).
//    Klidový uzel uses holdFrame on attack[0].
//    Campaign position #3. Normal tempo, high damage.
// ============================================================

export const iceGiantGraph: BehaviorGraph = {
  start: 'pseudo_idle',
  nodes: {
    pseudo_idle: {
      id: 'pseudo_idle',
      animKey: 'idle',
      holdFrame: { animKey: 'attack', frameIndex: 0 },
      exitTrigger: { kind: 'afterMs', ms: ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS },
      edges: [
        { to: 'windup', weight: 1 },
        { to: 'throw', weight: 1 },
      ],
    },
    windup: {
      id: 'windup',
      animKey: 'attack',
      exitTrigger: { kind: 'animationComplete' },
      attack: {
        damage: ENEMY_ICE_GIANT_ATTACK_DAMAGE,
        releaseFrame: ENEMY_ATTACK_RELEASE_FRAME_9F,
        kind: 'orb',
        visualKey: ENEMY_VISUAL_KEY_ORB,
        projectileSpeedCmS: ENEMY_ORB_SPEED_CM_S,
        castPoint: { dx: 0, dy: ENEMY_ORB_CAST_DY },
      },
      edges: [{ to: 'combat_idle', weight: 1 }],
    },
    throw: {
      id: 'throw',
      animKey: 'throw',
      exitTrigger: { kind: 'animationComplete' },
      attack: {
        damage: ENEMY_ICE_GIANT_THROW_DAMAGE,
        releaseFrame: ENEMY_ATTACK_RELEASE_FRAME_9F,
        kind: 'orb',
        visualKey: ENEMY_VISUAL_KEY_ORB,
        projectileSpeedCmS: ENEMY_ORB_SPEED_CM_S,
        castPoint: { dx: 0, dy: ENEMY_ORB_CAST_DY },
      },
      edges: [{ to: 'combat_idle', weight: 1 }],
    },
    combat_idle: {
      id: 'combat_idle',
      animKey: 'idle',
      holdFrame: { animKey: 'attack', frameIndex: 0 },
      exitTrigger: { kind: 'afterMs', ms: ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS },
      edges: [{ to: 'pseudo_idle', weight: 1 }],
    },
  },
}

// ============================================================
// 4. Crystal Spider — melee overlay, NO idle animation.
//    Three attack animations: 'attack' (claw), 'attack_mandible', 'bite'.
//    Klidový uzel uses holdFrame on attack[0]. Weighted between all 3 attacks.
//    Campaign position #4. Normal tempo, variable damage.
// ============================================================

export const crystalSpiderGraph: BehaviorGraph = {
  start: 'pseudo_idle',
  nodes: {
    pseudo_idle: {
      id: 'pseudo_idle',
      animKey: 'idle',
      holdFrame: { animKey: 'attack', frameIndex: 0 },
      exitTrigger: { kind: 'afterMs', ms: ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS },
      edges: [
        { to: 'claw', weight: 2 },
        { to: 'mandible', weight: 1 },
        { to: 'bite', weight: 2 },
      ],
    },
    claw: {
      id: 'claw',
      animKey: 'attack',
      exitTrigger: { kind: 'animationComplete' },
      attack: {
        damage: ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE,
        releaseFrame: ENEMY_ATTACK_RELEASE_FRAME_9F,
        kind: 'overlay',
        visualKey: ENEMY_VISUAL_KEY_MELEE,
        overlayConnectMs: ENEMY_OVERLAY_CONNECT_MS,
      },
      edges: [{ to: 'combat_idle', weight: 1 }],
    },
    mandible: {
      id: 'mandible',
      animKey: 'attack_mandible',
      exitTrigger: { kind: 'animationComplete' },
      attack: {
        damage: ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE,
        releaseFrame: ENEMY_ATTACK_RELEASE_FRAME_9F,
        kind: 'overlay',
        visualKey: ENEMY_VISUAL_KEY_MELEE,
        overlayConnectMs: ENEMY_OVERLAY_CONNECT_MS,
      },
      edges: [{ to: 'combat_idle', weight: 1 }],
    },
    bite: {
      id: 'bite',
      animKey: 'bite',
      exitTrigger: { kind: 'animationComplete' },
      attack: {
        damage: ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE,
        releaseFrame: ENEMY_ATTACK_RELEASE_FRAME_9F,
        kind: 'overlay',
        visualKey: ENEMY_VISUAL_KEY_MELEE,
        overlayConnectMs: ENEMY_OVERLAY_CONNECT_MS,
      },
      edges: [{ to: 'combat_idle', weight: 1 }],
    },
    combat_idle: {
      id: 'combat_idle',
      animKey: 'idle',
      holdFrame: { animKey: 'attack', frameIndex: 0 },
      exitTrigger: { kind: 'afterMs', ms: ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS },
      edges: [{ to: 'pseudo_idle', weight: 1 }],
    },
  },
}

// ============================================================
// 5. Ember Wisp — ranged orb (fire), 9-frame attack, 5-frame idle
//    Campaign position #5. Fast tempo, moderate damage.
// ============================================================

export const emberWispGraph: BehaviorGraph = simpleOrbGraph(
  ENEMY_ATTACK_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS,
  ENEMY_EMBER_WISP_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 6. Iron Golem — melee overlay (slam), 9-frame attack
//    Campaign position #6. Slow tempo, high damage per hit.
// ============================================================

export const ironGolemGraph: BehaviorGraph = simpleMeleeGraph(
  ENEMY_ATTACK_IDLE_DWELL_SLOW_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_SLOW_MS,
  ENEMY_IRON_GOLEM_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 7. Ancient Treant — melee overlay (branch slam), 9-frame attack
//    Campaign position #7. Slow tempo, highest damage. Boss-tier.
// ============================================================

export const ancientTreantGraph: BehaviorGraph = simpleMeleeGraph(
  ENEMY_ATTACK_IDLE_DWELL_SLOW_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_SLOW_MS,
  ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 8. Goblin Scout — ranged orb (throws javelin), 9-frame attack
//    Campaign position #8. Fast tempo, low damage — warmup enemy.
// ============================================================

export const goblinScoutGraph: BehaviorGraph = simpleOrbGraph(
  ENEMY_ATTACK_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS,
  ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 9. Orc Warrior — melee overlay (axe swing), 9-frame attack
//    Campaign position #9. Normal tempo, high damage.
// ============================================================

export const orcWarriorGraph: BehaviorGraph = simpleMeleeGraph(
  ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS,
  ENEMY_ORC_WARRIOR_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 10. Mirror Knight — melee overlay (sword slash), 9-frame attack
//     Campaign position #10. Normal tempo, moderate damage.
// ============================================================

export const mirrorKnightGraph: BehaviorGraph = simpleMeleeGraph(
  ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS,
  ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_9F,
)

// ============================================================
// 11. Insect Swarm — ranged orb (swarm sting), 13-frame attack
//     Campaign position #11. Fast tempo, low damage (many hits).
//     Longer attack animation has later release frame.
// ============================================================

export const insectSwarmGraph: BehaviorGraph = simpleOrbGraph(
  ENEMY_ATTACK_IDLE_DWELL_FAST_MS,
  ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS,
  ENEMY_INSECT_SWARM_ATTACK_DAMAGE,
  ENEMY_ATTACK_RELEASE_FRAME_13F,
)
