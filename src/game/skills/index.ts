// ============================================================
// Skills barrel — imports all skill modules to trigger side-effect
// registration in SkillRegistry. Import this once at app entry point.
// ============================================================

export * from './types'
export * from './registry'

// Skill module registrations (side effects — each file calls SkillRegistry.register())
export * from './slow-shot/index'
export * from './fast-shot/index'
export * from './fireball/index'
export * from './white-shot/index'
export * from './ice-crystal/index'
export * from './lightning-blast/index'
