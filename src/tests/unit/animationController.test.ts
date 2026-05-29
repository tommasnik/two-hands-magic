import { describe, it, expect } from 'vitest'
import { AnimationController } from '../../game/systems/AnimationController'
import type { AnimationDef } from '../../game/systems/AnimationController'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStoneGiant(): Record<string, AnimationDef> {
  return {
    idle: { frameCount: 10, frameDurationMs: 150, loop: true },
    attack: { frameCount: 7, frameDurationMs: 100, loop: false },
  }
}

function makePlagueRat(): Record<string, AnimationDef> {
  return {
    idle: { frameCount: 9, frameDurationMs: 150, loop: true },
    attack: { frameCount: 9, frameDurationMs: 100, loop: false },
  }
}

/** No loop animations — default should be first animation overall. */
function makeIceGiant(): Record<string, AnimationDef> {
  return {
    attack: { frameCount: 9, frameDurationMs: 100, loop: false },
    throw: { frameCount: 9, frameDurationMs: 100, loop: false },
  }
}

/** Multiple oneshots, no loop. */
function makeCrystalSpider(): Record<string, AnimationDef> {
  return {
    attack: { frameCount: 9, frameDurationMs: 100, loop: false },
    attack_mandible: { frameCount: 9, frameDurationMs: 100, loop: false },
    bite: { frameCount: 9, frameDurationMs: 100, loop: false },
  }
}

/** Single oneshot animation only. */
function makeEmberWisp(): Record<string, AnimationDef> {
  return {
    attack: { frameCount: 9, frameDurationMs: 100, loop: false },
  }
}

// ---------------------------------------------------------------------------
// Constructor & default animation
// ---------------------------------------------------------------------------

describe('AnimationController', () => {
  describe('constructor & default animation', () => {
    it('starts on first loop animation as default (stone-giant: idle)', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.isPlaying).toBe(false) // loop is not "playing" in oneshot sense
    })

    it('starts on first loop animation even when it is not first key', () => {
      const anims: Record<string, AnimationDef> = {
        attack: { frameCount: 5, frameDurationMs: 100, loop: false },
        idle: { frameCount: 8, frameDurationMs: 150, loop: true },
      }
      const ctrl = new AnimationController(anims)
      expect(ctrl.currentAnimKey).toBe('idle')
    })

    it('uses first animation as default when no loop exists (ice-giant: attack)', () => {
      const ctrl = new AnimationController(makeIceGiant())
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.isPlaying).toBe(true) // oneshot = isPlaying
    })

    it('uses first animation as default when only one oneshot exists (ember-wisp)', () => {
      const ctrl = new AnimationController(makeEmberWisp())
      expect(ctrl.currentAnimKey).toBe('attack')
    })

    it('throws if no animations are provided', () => {
      expect(() => new AnimationController({})).toThrow('at least one animation')
    })
  })

  // ---------------------------------------------------------------------------
  // Loop cycling
  // ---------------------------------------------------------------------------

  describe('loop cycling', () => {
    it('advances frames on update', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(150) // exactly one frame duration
      expect(ctrl.currentFrameIndex).toBe(1)
    })

    it('accumulates sub-frame time', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(100) // less than one frame (150ms)
      expect(ctrl.currentFrameIndex).toBe(0)
      ctrl.update(50) // now at 150ms total
      expect(ctrl.currentFrameIndex).toBe(1)
    })

    it('advances multiple frames in one update if dtMs is large', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(450) // 3 frames worth (3 * 150ms)
      expect(ctrl.currentFrameIndex).toBe(3)
    })

    it('wraps around to frame 0 after reaching last frame', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      // idle has 10 frames at 150ms each = 1500ms for full cycle
      ctrl.update(1500)
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0) // wrapped back
    })

    it('wraps around multiple times with large dt', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      // 2 full cycles + 3 frames = 20 + 3 = 23 frames = 23 * 150 = 3450ms
      ctrl.update(3450)
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(3)
    })

    it('cycles continuously over many updates', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      // Advance one frame at a time through 2 full cycles
      for (let i = 0; i < 20; i++) {
        ctrl.update(150)
      }
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0) // wrapped twice
    })

    it('isPlaying is false during loop animation', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(300)
      expect(ctrl.isPlaying).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Oneshot + return to default
  // ---------------------------------------------------------------------------

  describe('oneshot + return to default', () => {
    it('plays oneshot from frame 0', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.isPlaying).toBe(true)
    })

    it('advances through oneshot frames', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      ctrl.update(100) // 1 frame
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.currentFrameIndex).toBe(1)
      expect(ctrl.isPlaying).toBe(true)
    })

    it('returns to default after oneshot completes', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      // attack: 7 frames * 100ms = 700ms
      ctrl.update(700)
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.isPlaying).toBe(false)
    })

    it('returns to default after oneshot with accumulated updates', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      // advance frame by frame
      for (let i = 0; i < 7; i++) {
        ctrl.update(100)
      }
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('returns to default oneshot when no loop exists (ice-giant)', () => {
      const ctrl = new AnimationController(makeIceGiant())
      ctrl.play('throw')
      // throw: 9 frames * 100ms = 900ms
      ctrl.update(900)
      // returns to default which is 'attack'
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('returns to default (attack) for all crystal spider animations', () => {
      const ctrl = new AnimationController(makeCrystalSpider())
      ctrl.play('bite')
      ctrl.update(900) // 9 * 100
      expect(ctrl.currentAnimKey).toBe('attack')

      ctrl.play('attack_mandible')
      ctrl.update(900)
      expect(ctrl.currentAnimKey).toBe('attack')
    })

    it('ember-wisp oneshot returns to same animation (only has attack)', () => {
      const ctrl = new AnimationController(makeEmberWisp())
      ctrl.update(900) // completes attack
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.currentFrameIndex).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // freezeOnLast
  // ---------------------------------------------------------------------------

  describe('freezeOnLast', () => {
    it('freezes on last frame when freezeOnLast is true', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        death: { frameCount: 5, frameDurationMs: 80, loop: false, freezeOnLast: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('death')
      // 5 frames * 80ms = 400ms
      ctrl.update(400)
      expect(ctrl.currentAnimKey).toBe('death')
      expect(ctrl.currentFrameIndex).toBe(4) // last frame (0-based)
      expect(ctrl.isPlaying).toBe(false) // frozen, not actively playing
    })

    it('stays frozen on further updates', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        death: { frameCount: 5, frameDurationMs: 80, loop: false, freezeOnLast: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('death')
      ctrl.update(400) // completes death
      ctrl.update(1000) // further updates
      ctrl.update(5000) // much more time
      expect(ctrl.currentAnimKey).toBe('death')
      expect(ctrl.currentFrameIndex).toBe(4) // still on last frame
    })

    it('can be overridden by play() after freeze', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        death: { frameCount: 5, frameDurationMs: 80, loop: false, freezeOnLast: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('death')
      ctrl.update(400) // frozen on last frame
      expect(ctrl.currentFrameIndex).toBe(4)

      ctrl.play('idle') // override
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
      ctrl.update(100)
      expect(ctrl.currentFrameIndex).toBe(1) // animating again
    })

    it('freezeOnLast false does return to default', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        hurt: { frameCount: 3, frameDurationMs: 50, loop: false, freezeOnLast: false },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('hurt')
      ctrl.update(150) // 3 * 50 = 150
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // play() override — interrupting animations
  // ---------------------------------------------------------------------------

  describe('play() override', () => {
    it('interrupts current oneshot with a new oneshot', () => {
      const ctrl = new AnimationController(makeIceGiant())
      ctrl.play('attack')
      ctrl.update(300) // 3 frames into attack
      expect(ctrl.currentFrameIndex).toBe(3)

      ctrl.play('throw') // interrupt
      expect(ctrl.currentAnimKey).toBe('throw')
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('interrupts loop with oneshot', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(450) // 3 frames into idle
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(3)

      ctrl.play('attack')
      expect(ctrl.currentAnimKey).toBe('attack')
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.isPlaying).toBe(true)
    })

    it('interrupts oneshot with loop (sets new default)', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        walk: { frameCount: 6, frameDurationMs: 80, loop: true },
        attack: { frameCount: 5, frameDurationMs: 100, loop: false },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('attack')
      ctrl.update(200) // 2 frames in

      ctrl.play('walk') // interrupts attack, sets walk as new default
      expect(ctrl.currentAnimKey).toBe('walk')
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.isPlaying).toBe(false) // loop, not oneshot

      // After playing another oneshot, should return to walk (new default)
      ctrl.play('attack')
      ctrl.update(500) // complete attack
      expect(ctrl.currentAnimKey).toBe('walk')
    })

    it('play() same oneshot restarts it', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      ctrl.update(300) // 3 frames in
      expect(ctrl.currentFrameIndex).toBe(3)

      ctrl.play('attack') // restart
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('play() same loop restarts it from frame 0', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(450) // 3 frames into idle
      expect(ctrl.currentFrameIndex).toBe(3)

      ctrl.play('idle') // restart idle
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('throws on unknown animation key', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      expect(() => ctrl.play('nonexistent')).toThrow('Unknown animation: "nonexistent"')
    })
  })

  // ---------------------------------------------------------------------------
  // update(0) does nothing
  // ---------------------------------------------------------------------------

  describe('update edge cases', () => {
    it('update(0) does not change frame', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(0)
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('negative dtMs does not change frame', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.update(300)
      expect(ctrl.currentFrameIndex).toBe(2)
      ctrl.update(-100)
      expect(ctrl.currentFrameIndex).toBe(2) // unchanged
    })

    it('very small dtMs accumulates correctly', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      // 150 updates of 1ms each = 150ms = 1 frame
      for (let i = 0; i < 150; i++) {
        ctrl.update(1)
      }
      expect(ctrl.currentFrameIndex).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Single frame animation
  // ---------------------------------------------------------------------------

  describe('single frame animation', () => {
    it('stays on frame 0 forever for single-frame loop', () => {
      const anims: Record<string, AnimationDef> = {
        static: { frameCount: 1, frameDurationMs: 100, loop: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.update(10000)
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.currentAnimKey).toBe('static')
    })

    it('stays on frame 0 forever for single-frame oneshot', () => {
      const anims: Record<string, AnimationDef> = {
        flash: { frameCount: 1, frameDurationMs: 50, loop: false },
      }
      const ctrl = new AnimationController(anims)
      ctrl.update(10000)
      // Single frame oneshot — can't advance, stays at frame 0
      expect(ctrl.currentFrameIndex).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Zero duration animation
  // ---------------------------------------------------------------------------

  describe('zero duration animation', () => {
    it('stays on frame 0 when frameDurationMs is 0 (loop)', () => {
      const anims: Record<string, AnimationDef> = {
        instant: { frameCount: 5, frameDurationMs: 0, loop: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.update(1000)
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('stays on frame 0 when frameDurationMs is 0 (oneshot)', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        flash: { frameCount: 3, frameDurationMs: 0, loop: false },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('flash')
      ctrl.update(1000)
      expect(ctrl.currentFrameIndex).toBe(0)
      expect(ctrl.currentAnimKey).toBe('flash')
    })
  })

  // ---------------------------------------------------------------------------
  // Plague rat (real character data)
  // ---------------------------------------------------------------------------

  describe('plague-rat (real manifest data)', () => {
    it('idle loops correctly', () => {
      const ctrl = new AnimationController(makePlagueRat())
      // 9 frames at 150ms = 1350ms per cycle
      ctrl.update(1350) // full cycle
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
    })

    it('attack returns to idle', () => {
      const ctrl = new AnimationController(makePlagueRat())
      ctrl.play('attack')
      ctrl.update(900) // 9 * 100
      expect(ctrl.currentAnimKey).toBe('idle')
      expect(ctrl.currentFrameIndex).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Crystal spider (multiple oneshots, no loop)
  // ---------------------------------------------------------------------------

  describe('crystal-spider (multiple oneshots, no loop)', () => {
    it('default is first animation (attack)', () => {
      const ctrl = new AnimationController(makeCrystalSpider())
      expect(ctrl.currentAnimKey).toBe('attack')
    })

    it('switching between oneshots and returning to default', () => {
      const ctrl = new AnimationController(makeCrystalSpider())
      ctrl.play('bite')
      expect(ctrl.currentAnimKey).toBe('bite')
      expect(ctrl.isPlaying).toBe(true)

      ctrl.update(900) // complete bite
      expect(ctrl.currentAnimKey).toBe('attack') // returns to default

      ctrl.play('attack_mandible')
      ctrl.update(400) // mid-animation
      expect(ctrl.currentAnimKey).toBe('attack_mandible')
      expect(ctrl.currentFrameIndex).toBe(4)

      ctrl.play('bite') // interrupt
      expect(ctrl.currentAnimKey).toBe('bite')
      expect(ctrl.currentFrameIndex).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // isPlaying semantics
  // ---------------------------------------------------------------------------

  describe('isPlaying semantics', () => {
    it('false for loop animation', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      expect(ctrl.isPlaying).toBe(false)
    })

    it('true during oneshot', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      expect(ctrl.isPlaying).toBe(true)
    })

    it('true during oneshot partially played', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      ctrl.update(300)
      expect(ctrl.isPlaying).toBe(true)
    })

    it('false after oneshot completes and returns to loop', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      ctrl.update(700)
      expect(ctrl.isPlaying).toBe(false)
    })

    it('false after freezeOnLast completes', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        death: { frameCount: 3, frameDurationMs: 100, loop: false, freezeOnLast: true },
      }
      const ctrl = new AnimationController(anims)
      ctrl.play('death')
      ctrl.update(300) // complete
      expect(ctrl.isPlaying).toBe(false)
      expect(ctrl.currentAnimKey).toBe('death')
      expect(ctrl.currentFrameIndex).toBe(2)
    })

    it('true for oneshot default when no loop exists', () => {
      const ctrl = new AnimationController(makeIceGiant())
      // Default is attack (oneshot) — isPlaying should be true
      expect(ctrl.isPlaying).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // play() changes default for loop animations
  // ---------------------------------------------------------------------------

  describe('play() loop changes default', () => {
    it('playing a loop sets it as new default', () => {
      const anims: Record<string, AnimationDef> = {
        idle: { frameCount: 4, frameDurationMs: 100, loop: true },
        run: { frameCount: 6, frameDurationMs: 80, loop: true },
        attack: { frameCount: 3, frameDurationMs: 100, loop: false },
      }
      const ctrl = new AnimationController(anims)
      expect(ctrl.currentAnimKey).toBe('idle') // initial default

      ctrl.play('run')
      expect(ctrl.currentAnimKey).toBe('run')

      // After oneshot, should return to 'run' (new default), not 'idle'
      ctrl.play('attack')
      ctrl.update(300)
      expect(ctrl.currentAnimKey).toBe('run')
    })
  })

  // ---------------------------------------------------------------------------
  // Large dt spanning multiple animations
  // ---------------------------------------------------------------------------

  describe('large dt edge case', () => {
    it('oneshot completing with remaining time does not crash', () => {
      const ctrl = new AnimationController(makeStoneGiant())
      ctrl.play('attack')
      // attack = 7 frames * 100ms = 700ms. Pass 800ms — should complete and return to idle.
      ctrl.update(800)
      expect(ctrl.currentAnimKey).toBe('idle')
      // Remaining 100ms should not crash but we don't strictly require
      // it to advance idle frames (implementation detail)
    })
  })
})
