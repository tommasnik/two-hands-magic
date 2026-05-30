// ============================================================
// Game canvas dimensions
// ============================================================

/** Logical canvas width. Unit: px. Affects: layout, coordinate math. */
export const GAME_WIDTH = 390

/** Logical canvas height. Unit: px. Affects: layout, coordinate math. */
export const GAME_HEIGHT = 844

// ============================================================
// Frame timing
// ============================================================

/** Maximum delta time per frame. Prevents spiral-of-death on tab switch or slow device. Unit: ms. */
export const MAX_DELTA_MS = 50

// ============================================================
// Pixel density — used to convert cm constants to pixels
// ============================================================

/**
 * Pixels per centimeter for hit geometry.
 * Based on ~150 dpi mobile screen (a typical modern phone at ~56 px/cm).
 * Unit: px/cm. Affects: all hitbox sizes derived from cm constants.
 */
export const PIXELS_PER_CM = 56
