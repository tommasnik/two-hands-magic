/**
 * AnimationController — pure TS animation state machine.
 *
 * Drives frame-based animation for any sprite character.
 * No Phaser dependency — receives animation definitions from manifest data,
 * advances frames via update(dtMs), and exposes current state for rendering.
 */

/** Definition of a single animation (from manifest.json data). */
export interface AnimationDef {
  /** Number of frames in this animation. */
  frameCount: number
  /** Duration of a single frame in milliseconds. */
  frameDurationMs: number
  /** true = loops indefinitely (idle), false = plays once then returns to default. */
  loop: boolean
  /** true = after oneshot completes, freeze on last frame instead of returning to default. */
  freezeOnLast?: boolean
}

/**
 * Pure-TS animation state machine.
 *
 * Default animation = first animation in the record where loop === true.
 * If no loop animation exists, default = first animation overall.
 *
 * Oneshot animations play once, then automatically return to the default animation
 * (unless freezeOnLast is set, in which case they stay on the last frame).
 *
 * play() on a new oneshot interrupts any current animation (including another oneshot).
 * play() on a loop animation sets it as the new default and starts playing it.
 */
export class AnimationController {
  private readonly animations: Record<string, AnimationDef>
  private defaultKey: string

  private activeKey: string
  private frameIndex: number = 0
  private elapsedMs: number = 0
  private frozen: boolean = false

  constructor(animations: Record<string, AnimationDef>) {
    const keys = Object.keys(animations)
    if (keys.length === 0) {
      throw new Error('AnimationController requires at least one animation')
    }

    this.animations = animations

    // Default = first loop animation, or first animation overall
    const firstLoop = keys.find(k => animations[k].loop)
    this.defaultKey = firstLoop ?? keys[0]
    this.activeKey = this.defaultKey
  }

  /**
   * Start playing an animation.
   *
   * - Oneshot: interrupts any current animation. After completion, returns to default
   *   (or freezes on last frame if freezeOnLast is set).
   * - Loop: sets this as the new default and starts playing it immediately.
   */
  play(animKey: string): void {
    const def = this.animations[animKey]
    if (!def) {
      throw new Error(`Unknown animation: "${animKey}"`)
    }

    // If it's a loop animation, it becomes the new default
    if (def.loop) {
      this.defaultKey = animKey
    }

    this.activeKey = animKey
    this.frameIndex = 0
    this.elapsedMs = 0
    this.frozen = false
  }

  /**
   * Advance the animation timer. Called each frame from the game loop.
   *
   * @param dtMs - elapsed time in milliseconds since last update
   */
  update(dtMs: number): void {
    if (dtMs <= 0 || this.frozen) return

    const def = this.animations[this.activeKey]
    const { frameCount, frameDurationMs, loop } = def

    // Single frame or zero duration — nothing to animate
    if (frameCount <= 1 || frameDurationMs <= 0) return

    this.elapsedMs += dtMs

    // Advance frames based on accumulated time
    while (this.elapsedMs >= frameDurationMs) {
      this.elapsedMs -= frameDurationMs
      this.frameIndex++

      if (this.frameIndex >= frameCount) {
        if (loop) {
          // Loop: wrap around
          this.frameIndex = 0
        } else {
          // Oneshot completed
          if (def.freezeOnLast) {
            // Freeze on last frame
            this.frameIndex = frameCount - 1
            this.elapsedMs = 0
            this.frozen = true
            return
          } else {
            // Return to default animation
            this.activeKey = this.defaultKey
            this.frameIndex = 0
            this.elapsedMs = 0

            // If the default is also a oneshot with single frame, stop
            const defaultDef = this.animations[this.defaultKey]
            if (defaultDef.frameCount <= 1 || defaultDef.frameDurationMs <= 0) {
              return
            }

            // Continue processing remaining time with default animation
            // (the while loop will use the new active animation's timing)
            break
          }
        }
      }
    }
  }

  /** Current animation key (e.g. 'idle', 'attack'). */
  get currentAnimKey(): string {
    return this.activeKey
  }

  /** Current frame index within the active animation (0-based). */
  get currentFrameIndex(): number {
    return this.frameIndex
  }

  /** True if a oneshot animation is currently playing (and has not finished). */
  get isPlaying(): boolean {
    const def = this.animations[this.activeKey]
    if (def.loop) return false
    if (this.frozen) return false
    return true
  }
}
