// ============================================================
// Player entity — pure TypeScript, no Phaser dependency.
// Tracks the player's HP pool and exposes simple mutators
// consumed by GameStateMachine when enemy missiles connect.
// ============================================================

export class Player {
  hp: number
  readonly maxHp: number

  constructor(maxHp: number) {
    this.maxHp = maxHp
    this.hp = maxHp
  }

  /** Reset HP back to max. Called on level start / restart. */
  reset(): void {
    this.hp = this.maxHp
  }

  /** Apply damage, clamped at 0. Returns the new HP. */
  takeDamage(damage: number): number {
    this.hp = Math.max(0, this.hp - damage)
    return this.hp
  }

  /** Whether the player is dead (HP at or below 0). */
  isDead(): boolean {
    return this.hp <= 0
  }
}
