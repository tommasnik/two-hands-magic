import type { Matcher, SimulationResult } from './types'

export function atLeast(n: number): Matcher {
  return { test: v => v >= n, describe: () => `at least ${n}` }
}

export function atMost(n: number): Matcher {
  return { test: v => v <= n, describe: () => `at most ${n}` }
}

export function between(a: number, b: number): Matcher {
  return { test: v => v >= a && v <= b, describe: () => `between ${a} and ${b} (inclusive)` }
}

export function exactly(n: number): Matcher {
  return { test: v => v === n, describe: () => `exactly ${n}` }
}

export function thenWinsTimes(result: SimulationResult, matcher: Matcher): void {
  const wins = result.fights.filter(f => f.won).length
  if (!matcher.test(wins)) {
    throw new Error(
      `thenWinsTimes: expected ${matcher.describe()}, but won ${wins}/${result.total} fights`
    )
  }
}
