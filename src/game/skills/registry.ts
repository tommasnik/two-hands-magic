// ============================================================
// SkillRegistry — maps SkillType → SkillModule
// Consumers call get(skillType) instead of switch/case on SkillType.
// Adding a new skill = registerSkill() — zero changes in existing systems.
// ============================================================

import type { SkillType } from '../../types'
import type { SkillModule } from './types'

class SkillRegistryImpl {
  private readonly _map = new Map<SkillType, SkillModule>()

  /**
   * Register a skill module.
   * Call once per skill at module initialisation time.
   * Throws if the same SkillType is registered twice (catches typos).
   */
  register(module: SkillModule): void {
    if (this._map.has(module.type)) {
      throw new Error(`SkillRegistry: skill '${module.type}' is already registered`)
    }
    this._map.set(module.type, module)
  }

  /**
   * Retrieve a registered skill module.
   * Throws if the skill has not been registered yet — surfaces missing
   * registrations at the callsite rather than silently returning undefined.
   */
  get(skillType: SkillType): SkillModule {
    const module = this._map.get(skillType)
    if (!module) {
      throw new Error(`SkillRegistry: skill '${skillType}' is not registered`)
    }
    return module
  }

  /**
   * Returns true if the given skill type has been registered.
   */
  has(skillType: SkillType): boolean {
    return this._map.has(skillType)
  }

  /**
   * Returns all registered skill modules as an array.
   * Order is insertion order (registration order).
   */
  getAll(): SkillModule[] {
    return Array.from(this._map.values())
  }
}

/**
 * Module-level singleton. Import this in all skill module files and systems.
 */
export const SkillRegistry = new SkillRegistryImpl()
