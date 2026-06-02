import Phaser from 'phaser'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import { characterRegistry } from '../../game/CharacterRegistry'
import { decodeMask } from '../../game/systems/maskBinary'
import { ENEMY_POOL } from '../../game/constants'

// ============================================================
// characterAssets — per-character lazy asset loading (frames + masks).
//
// Replaces the old "load every character up front" approach. The loading
// screen now only blocks on the first enemy; the rest stream in during the
// first battle (see loadCampaignCharactersInBackground). Masks ship as the
// compact ".msk" binary (1 byte/pixel, RLE) and are decoded straight into the
// shared MaskHitDetector — no <canvas> / getImageData() round-trip.
// ============================================================

/** Shared mask detector — populated incrementally as characters load. */
export const maskDetector = new MaskHitDetector()

/** Manifest ids whose frames + masks are fully loaded and parsed. */
const loaded = new Set<string>()

/** In-flight loads, so concurrent callers share one promise per character. */
const inflight = new Map<string, Promise<void>>()

/** Reference to a mask binary that must be decoded into the detector once loaded. */
interface MaskRef {
  binaryKey: string
  spriteKey: string
  animKey: string
  frameIndex: number
}

function pad(i: number): string {
  return String(i).padStart(2, '0')
}

/** True once the given character's assets have been loaded and parsed. */
export function isCharacterLoaded(manifestId: string): boolean {
  return loaded.has(manifestId)
}

/**
 * Queue a character's frame textures + mask binaries onto the scene loader
 * (without starting it). Skips anything already present in the texture/binary
 * caches. Returns the mask references to decode once loading completes.
 *
 * `outCount` reports how many new files were actually queued.
 */
function enqueueCharacterAssets(scene: Phaser.Scene, manifestId: string, outCount: { added: number }): MaskRef[] {
  const manifest = characterRegistry.get(manifestId)
  const { id, spriteKey, animations } = manifest
  const maskRefs: MaskRef[] = []

  for (const [animKey, anim] of Object.entries(animations)) {
    for (let i = 0; i < anim.frameCount; i++) {
      const frameKey = `${spriteKey}_${animKey}_${i}`
      if (!scene.textures.exists(frameKey)) {
        scene.load.image(frameKey, `assets/characters/${id}/frames/${animKey}_${pad(i)}.png`)
        outCount.added++
      }

      if (anim.hasMasks) {
        const binaryKey = `${spriteKey}_mask_${animKey}_${i}`
        maskRefs.push({ binaryKey, spriteKey, animKey, frameIndex: i })
        if (!scene.cache.binary.exists(binaryKey)) {
          scene.load.binary(binaryKey, `assets/characters/${id}/masks/${animKey}_${pad(i)}.msk`)
          outCount.added++
        }
      }
    }
  }

  return maskRefs
}

/** Decode all loaded mask binaries into the shared detector, then mark the character loaded. */
function parseCharacterMasks(scene: Phaser.Scene, manifestId: string, maskRefs: MaskRef[]): void {
  for (const ref of maskRefs) {
    const buffer = scene.cache.binary.get(ref.binaryKey)
    if (!(buffer instanceof ArrayBuffer)) continue // missing/failed download — graceful skip
    try {
      const { codes, width, height } = decodeMask(buffer)
      maskDetector.loadZones(ref.spriteKey, ref.animKey, ref.frameIndex, codes, width, height)
    } catch {
      // Corrupt mask binary — skip silently (getZone falls back to 'none').
    }
  }
  loaded.add(manifestId)
}

/**
 * Enqueue the first enemy's assets onto the loading-scene loader during preload.
 * Phaser auto-runs the queue after preload(); call {@link finishPreloadCharacter}
 * from create() to decode its masks. Returns refs for that follow-up step.
 */
export function preloadCharacterAssets(scene: Phaser.Scene, manifestId: string): MaskRef[] {
  return enqueueCharacterAssets(scene, manifestId, { added: 0 })
}

/** Decode the preloaded character's masks (call from LoadingScene.create). */
export function finishPreloadCharacter(scene: Phaser.Scene, manifestId: string, maskRefs: MaskRef[]): void {
  parseCharacterMasks(scene, manifestId, maskRefs)
}

/**
 * Load a single character's assets mid-scene (frames + masks), resolving once
 * its masks are decoded into the detector. Idempotent and de-duplicated.
 */
export function loadCharacterAssets(scene: Phaser.Scene, manifestId: string): Promise<void> {
  if (loaded.has(manifestId)) return Promise.resolve()
  const existing = inflight.get(manifestId)
  if (existing) return existing

  const count = { added: 0 }
  const maskRefs = enqueueCharacterAssets(scene, manifestId, count)

  const promise = new Promise<void>((resolve) => {
    const finish = (): void => {
      parseCharacterMasks(scene, manifestId, maskRefs)
      inflight.delete(manifestId)
      resolve()
    }
    if (count.added === 0) {
      // Everything was already cached — just decode and resolve.
      finish()
    } else {
      scene.load.once(Phaser.Loader.Events.COMPLETE, finish)
      scene.load.start()
    }
  })

  inflight.set(manifestId, promise)
  return promise
}

/**
 * Campaign characters in encounter order, deduplicated, restricted to ids that
 * are actually registered (have a manifest). Bench / unregistered enemies are
 * skipped — they never appear in the campaign.
 */
function campaignManifestIds(): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const enemy of ENEMY_POOL) {
    const id = enemy.manifestId
    if (id !== undefined && !seen.has(id) && characterRegistry.has(id)) {
      seen.add(id)
      ordered.push(id)
    }
  }
  return ordered
}

/**
 * Stream the remaining campaign characters in one at a time, in encounter
 * order, after the first enemy is already on screen. Sequential so the loader
 * never juggles overlapping batches; failures are swallowed so one bad
 * character can't stall the rest.
 */
export async function loadCampaignCharactersInBackground(scene: Phaser.Scene): Promise<void> {
  for (const id of campaignManifestIds()) {
    if (loaded.has(id)) continue
    try {
      await loadCharacterAssets(scene, id)
    } catch {
      // Ignore — a missing character degrades to no sprite, never a crash.
    }
  }
}
