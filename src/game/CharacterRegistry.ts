/**
 * CharacterRegistry — runtime registry for character manifest data.
 *
 * Pure TS — no Phaser imports. Stores CharacterManifest objects loaded from
 * manifest.json files and provides typed access for loaders and renderers.
 */

import type { AnimationDef } from './systems/AnimationController'

/** Shape of a single animation entry inside a character manifest. */
export interface ManifestAnimationDef {
  /** Number of frames in this animation. */
  frameCount: number
  /** Duration of a single frame in milliseconds. */
  frameDurationMs: number
  /** true = loops indefinitely (idle), false = plays once (attack). */
  loop: boolean
  /** true = hit-zone mask PNGs exist in masks/ directory for this animation. */
  hasMasks: boolean
}

/** Runtime representation of a character manifest.json. */
export interface CharacterManifest {
  /** Kebab-case identifier matching the directory name (e.g. 'stone-giant'). */
  id: string
  /** Phaser texture key prefix in snake_case (e.g. 'stone_giant'). */
  spriteKey: string
  /** Display width in pixels for rendering. */
  displayWidth: number
  /** Horizontal anchor (0–1). Default: 0.5. */
  anchorX?: number
  /** Vertical anchor (0–1). Default: 0.6. */
  anchorY?: number
  /** Map of animKey -> animation definition. */
  animations: Record<string, ManifestAnimationDef>
}

/**
 * Singleton-style registry that holds all registered character manifests.
 *
 * Usage:
 * 1. register() each manifest (from JSON import)
 * 2. getAll() to iterate for asset loading
 * 3. get(id) to retrieve a specific manifest
 * 4. getAnimationDefs(id) to get AnimationController-compatible defs
 */
export class CharacterRegistry {
  private readonly manifests = new Map<string, CharacterManifest>()

  /**
   * Register a character manifest. Throws if a manifest with the same id
   * is already registered (prevents silent overwrites).
   */
  register(manifest: CharacterManifest): void {
    if (this.manifests.has(manifest.id)) {
      throw new Error(`CharacterRegistry: manifest "${manifest.id}" is already registered`)
    }
    const animKeys = Object.keys(manifest.animations)
    if (animKeys.length === 0) {
      throw new Error(`CharacterRegistry: manifest "${manifest.id}" has no animations`)
    }
    this.manifests.set(manifest.id, manifest)
  }

  /**
   * Check whether a manifest with the given id is registered.
   */
  has(id: string): boolean {
    return this.manifests.has(id)
  }

  /**
   * Retrieve a manifest by character id.
   * Throws if not found.
   */
  get(id: string): CharacterManifest {
    const manifest = this.manifests.get(id)
    if (!manifest) {
      throw new Error(`CharacterRegistry: manifest "${id}" not found`)
    }
    return manifest
  }

  /**
   * Return all registered manifests in registration order.
   */
  getAll(): CharacterManifest[] {
    return Array.from(this.manifests.values())
  }

  /**
   * Convert a character's animation manifest entries into AnimationDef records
   * compatible with AnimationController.
   *
   * Strips manifest-specific fields (hasMasks) and returns only the fields
   * that AnimationController needs.
   */
  getAnimationDefs(id: string): Record<string, AnimationDef> {
    const manifest = this.get(id)
    const defs: Record<string, AnimationDef> = {}
    for (const [animKey, anim] of Object.entries(manifest.animations)) {
      defs[animKey] = {
        frameCount: anim.frameCount,
        frameDurationMs: anim.frameDurationMs,
        loop: anim.loop,
      }
    }
    return defs
  }
}

/** Global character registry instance shared across the application. */
export const characterRegistry = new CharacterRegistry()
