/**
 * Energy Insights global configuration
 * Values can be overridden via NEXT_PUBLIC env vars for runtime tweaking.
 */
export const ENERGY_INSIGHT_CFG = {
  /**
   * Minimum percentage of deviation to consider anomaly (0.25 = 25 %)
   */
  deviationPct: parseFloat(process.env.NEXT_PUBLIC_ENERGY_DEV_PCT ?? '0.25'),

  /**
   * Standard-deviation multiplier used in threshold: expected + σ*multiplier
   */
  sigmaMultiplier: parseFloat(process.env.NEXT_PUBLIC_ENERGY_SIGMA ?? '2'),

  /**
   * Tolerancia de tiempo (minutos) para considerar que un uso ha terminado “en tiempo”.
   * 0.5 = 30 s.
   */
  timeToleranceMinutes: parseFloat(process.env.NEXT_PUBLIC_ENERGY_TIME_TOLERANCE ?? '0.5'),
} as const; 