import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterRegistry } from '../../game/CharacterRegistry'
import type { CharacterManifest } from '../../game/CharacterRegistry'

/** Minimal valid manifest for testing. */
function makeManifest(overrides: Partial<CharacterManifest> = {}): CharacterManifest {
  return {
    id: 'test-char',
    spriteKey: 'test_char',
    displayWidth: 128,
    animations: {
      idle: { frameCount: 4, frameDurationMs: 100, loop: true, hasMasks: true },
      attack: { frameCount: 3, frameDurationMs: 80, loop: false, hasMasks: false },
    },
    ...overrides,
  }
}

describe('CharacterRegistry', () => {
  let registry: CharacterRegistry

  beforeEach(() => {
    registry = new CharacterRegistry()
  })

  // -------------------------------------------------------------------
  // register()
  // -------------------------------------------------------------------

  describe('register()', () => {
    it('registers a valid manifest', () => {
      const manifest = makeManifest()
      registry.register(manifest)
      expect(registry.get('test-char')).toBe(manifest)
    })

    it('throws on duplicate registration', () => {
      registry.register(makeManifest())
      expect(() => registry.register(makeManifest())).toThrow(
        'CharacterRegistry: manifest "test-char" is already registered',
      )
    })

    it('throws if manifest has no animations', () => {
      expect(() =>
        registry.register(makeManifest({ animations: {} })),
      ).toThrow('CharacterRegistry: manifest "test-char" has no animations')
    })
  })

  // -------------------------------------------------------------------
  // has()
  // -------------------------------------------------------------------

  describe('has()', () => {
    it('returns false for unregistered id', () => {
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('returns true for registered id', () => {
      registry.register(makeManifest())
      expect(registry.has('test-char')).toBe(true)
    })
  })

  // -------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------

  describe('get()', () => {
    it('returns a registered manifest by id', () => {
      const m = makeManifest({ id: 'stone-giant', spriteKey: 'stone_giant' })
      registry.register(m)
      expect(registry.get('stone-giant')).toBe(m)
    })

    it('throws for unregistered id', () => {
      expect(() => registry.get('nonexistent')).toThrow(
        'CharacterRegistry: manifest "nonexistent" not found',
      )
    })
  })

  // -------------------------------------------------------------------
  // getAll()
  // -------------------------------------------------------------------

  describe('getAll()', () => {
    it('returns empty array when no manifests registered', () => {
      expect(registry.getAll()).toEqual([])
    })

    it('returns all registered manifests in registration order', () => {
      const m1 = makeManifest({ id: 'alpha', spriteKey: 'alpha' })
      const m2 = makeManifest({ id: 'beta', spriteKey: 'beta' })
      const m3 = makeManifest({ id: 'gamma', spriteKey: 'gamma' })
      registry.register(m1)
      registry.register(m2)
      registry.register(m3)

      const all = registry.getAll()
      expect(all).toHaveLength(3)
      expect(all[0].id).toBe('alpha')
      expect(all[1].id).toBe('beta')
      expect(all[2].id).toBe('gamma')
    })
  })

  // -------------------------------------------------------------------
  // getAnimationDefs()
  // -------------------------------------------------------------------

  describe('getAnimationDefs()', () => {
    it('converts manifest animations to AnimationDef records', () => {
      registry.register(makeManifest())
      const defs = registry.getAnimationDefs('test-char')

      expect(Object.keys(defs)).toEqual(['idle', 'attack'])

      expect(defs.idle).toEqual({
        frameCount: 4,
        frameDurationMs: 100,
        loop: true,
      })

      expect(defs.attack).toEqual({
        frameCount: 3,
        frameDurationMs: 80,
        loop: false,
      })
    })

    it('strips hasMasks from the output', () => {
      registry.register(makeManifest())
      const defs = registry.getAnimationDefs('test-char')

      // AnimationDef should NOT have hasMasks
      expect(defs.idle).not.toHaveProperty('hasMasks')
      expect(defs.attack).not.toHaveProperty('hasMasks')
    })

    it('throws for unregistered id', () => {
      expect(() => registry.getAnimationDefs('nonexistent')).toThrow(
        'CharacterRegistry: manifest "nonexistent" not found',
      )
    })

    it('handles single animation manifest', () => {
      registry.register(makeManifest({
        id: 'single',
        spriteKey: 'single',
        animations: {
          attack: { frameCount: 9, frameDurationMs: 100, loop: false, hasMasks: true },
        },
      }))
      const defs = registry.getAnimationDefs('single')
      expect(Object.keys(defs)).toEqual(['attack'])
      expect(defs.attack.frameCount).toBe(9)
    })
  })

  // -------------------------------------------------------------------
  // Optional fields
  // -------------------------------------------------------------------

  describe('optional fields', () => {
    it('preserves anchorX and anchorY when set', () => {
      const m = makeManifest({ anchorX: 0.3, anchorY: 0.8 })
      registry.register(m)
      const retrieved = registry.get('test-char')
      expect(retrieved.anchorX).toBe(0.3)
      expect(retrieved.anchorY).toBe(0.8)
    })

    it('allows undefined anchorX and anchorY', () => {
      const m = makeManifest()
      registry.register(m)
      const retrieved = registry.get('test-char')
      expect(retrieved.anchorX).toBeUndefined()
      expect(retrieved.anchorY).toBeUndefined()
    })
  })
})
