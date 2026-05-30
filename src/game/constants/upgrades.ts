import type { GlobalUpgradeState, UpgradeNodeDef, UpgradeNodeId } from '../../types'
import { CRIT_DAMAGE_MULTIPLIER } from './combat'

// ============================================================
// Global upgrade tree — pure data model
// Defines starting GlobalUpgradeState and the full node graph.
// Game systems read the aggregated state — they never look at nodes directly.
// ============================================================

/**
 * Starting global upgrade state at the beginning of a run.
 * critDamageMultiplier reuses CRIT_DAMAGE_MULTIPLIER so the default upgrade
 * state matches the unmodified damage formula.
 * Frozen so the shared reference can't be mutated by accident.
 */
export const DEFAULT_GLOBAL_UPGRADE_STATE: GlobalUpgradeState = Object.freeze({
  castTimeMultiplier: 1.0,
  critDamageMultiplier: CRIT_DAMAGE_MULTIPLIER,
  critZoneTolerance: 0,
  critStunChance: 0,
  critStunDurationMs: 0,
  projectileSpeedMultiplier: 1.0,
  quickChainBonus: 0,
  quickChainWindowMs: 0,
  spellAreaMultiplier: 1.0,
  unlockedNodeIds: Object.freeze([]) as readonly UpgradeNodeId[],
})

/**
 * Full upgrade tree definition.
 * Five paths × ~3 tiers each. Tier N requires tier N-1 of the same path.
 * quick_chain_1 has OR prerequisites (cast_time_1 OR proj_speed_1) — getAvailableNodes
 * resolves OR semantics via `requires.some(...)`.
 */
export const UPGRADE_NODES: readonly UpgradeNodeDef[] = [
  { id: 'cast_time_1',  title: 'Zrychlení I',          description: 'Laser sweep o 10 % rychlejší',                   path: 'cast_time',  requires: [],              applyTo: (s) => ({ ...s, castTimeMultiplier: 0.90 }) },
  { id: 'cast_time_2',  title: 'Zrychlení II',         description: 'Laser sweep o 20 % rychlejší',                   path: 'cast_time',  requires: ['cast_time_1'], applyTo: (s) => ({ ...s, castTimeMultiplier: 0.80 }) },
  { id: 'cast_time_3',  title: 'Zrychlení III',        description: 'Laser sweep o 30 % rychlejší',                   path: 'cast_time',  requires: ['cast_time_2'], applyTo: (s) => ({ ...s, castTimeMultiplier: 0.70 }) },
  { id: 'crit_dmg_1',   title: 'Ostré hroty I',        description: 'Crit damage multiplier 2.3×',                    path: 'crit',       requires: [],              applyTo: (s) => ({ ...s, critDamageMultiplier: 2.3 }) },
  { id: 'crit_dmg_2',   title: 'Ostré hroty II',       description: 'Crit damage multiplier 2.7×',                    path: 'crit',       requires: ['crit_dmg_1'],  applyTo: (s) => ({ ...s, critDamageMultiplier: 2.7 }) },
  { id: 'crit_dmg_3',   title: 'Ostré hroty III',      description: 'Crit damage multiplier 3.2×',                    path: 'crit',       requires: ['crit_dmg_2'],  applyTo: (s) => ({ ...s, critDamageMultiplier: 3.2 }) },
  { id: 'crit_zone_1',  title: 'Rozšířená slabina I',  description: 'Crit zóna o 15 % širší tolerance',               path: 'crit',       requires: ['crit_dmg_1'],  applyTo: (s) => ({ ...s, critZoneTolerance: 0.15 }) },
  { id: 'crit_zone_2',  title: 'Rozšířená slabina II', description: 'Crit zóna o 30 % širší tolerance',               path: 'crit',       requires: ['crit_zone_1'], applyTo: (s) => ({ ...s, critZoneTolerance: 0.30 }) },
  { id: 'crit_stun_1',  title: 'Omráčení I',           description: '20% šance omráčit nepřítele na 1.5 s při critu', path: 'crit',       requires: ['crit_dmg_2'],  applyTo: (s) => ({ ...s, critStunChance: 0.20, critStunDurationMs: 1500 }) },
  { id: 'crit_stun_2',  title: 'Omráčení II',          description: '35% šance omráčit nepřítele na 2.0 s při critu', path: 'crit',       requires: ['crit_stun_1'], applyTo: (s) => ({ ...s, critStunChance: 0.35, critStunDurationMs: 2000 }) },
  { id: 'proj_speed_1', title: 'Rychlý výstřel I',     description: 'Projektily o 15 % rychlejší',                    path: 'proj_speed', requires: [],              applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.15 }) },
  { id: 'proj_speed_2', title: 'Rychlý výstřel II',    description: 'Projektily o 30 % rychlejší',                    path: 'proj_speed', requires: ['proj_speed_1'], applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.30 }) },
  { id: 'proj_speed_3', title: 'Rychlý výstřel III',   description: 'Projektily o 50 % rychlejší',                    path: 'proj_speed', requires: ['proj_speed_2'], applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.50 }) },
  // quick_chain_1: OR dependency — cast_time_1 OR proj_speed_1 unlocks it.
  { id: 'quick_chain_1', title: 'Řetěz I',  description: '+20 % damage při dvou výstřelech do 800 ms',  path: 'quick_chain', requires: ['cast_time_1', 'proj_speed_1'], applyTo: (s) => ({ ...s, quickChainBonus: 0.20, quickChainWindowMs: 800 }) },
  { id: 'quick_chain_2', title: 'Řetěz II', description: '+35 % damage při dvou výstřelech do 1000 ms', path: 'quick_chain', requires: ['quick_chain_1'],               applyTo: (s) => ({ ...s, quickChainBonus: 0.35, quickChainWindowMs: 1000 }) },
  { id: 'spell_area_1', title: 'Větší dopad I',   description: 'Plocha kouzla o 20 % větší', path: 'spell_area', requires: [],               applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.20 }) },
  { id: 'spell_area_2', title: 'Větší dopad II',  description: 'Plocha kouzla o 40 % větší', path: 'spell_area', requires: ['spell_area_1'], applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.40 }) },
  { id: 'spell_area_3', title: 'Větší dopad III', description: 'Plocha kouzla o 60 % větší', path: 'spell_area', requires: ['spell_area_2'], applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.60 }) },
]

/**
 * Display titles for each upgrade path — used as column headers in the
 * level-up picker. Keeps copy out of the renderer so designers can retune.
 */
export const UPGRADE_PATH_TITLES: Readonly<Record<import('../../types').UpgradePath, string>> = {
  cast_time:   'CAST TIME',
  crit:        'CRIT DMG',
  proj_speed:  'PROJ SPEED',
  spell_area:  'SPELL AREA',
  quick_chain: 'QUICK CHAIN',
}

/**
 * Column ordering for the level-up picker tree (left → right).
 * quick_chain is rendered separately as a cross-path row below the tree.
 */
export const UPGRADE_TREE_COLUMNS: readonly import('../../types').UpgradePath[] = [
  'cast_time',
  'crit',
  'proj_speed',
  'spell_area',
]
