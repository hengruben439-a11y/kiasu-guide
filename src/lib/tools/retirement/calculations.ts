/**
 * Retirement calculations — pure functions, zero UI imports.
 * All rates are annual decimals (e.g. 0.07 for 7%).
 * All monetary values are in SGD.
 */

// ── Core compounding ─────────────────────────────────────────────────────────

/** Geometric monthly rate — more accurate than rate/12 */
export function monthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

/** Future value of a lump sum (monthly compounding) */
export function fvLumpSum(principal: number, annualRate: number, years: number): number {
  if (years <= 0) return principal
  const r = monthlyRate(annualRate)
  return principal * Math.pow(1 + r, years * 12)
}

/** Future value of monthly contributions (end-of-period) */
export function fvContributions(monthlyAmount: number, annualRate: number, years: number): number {
  if (years <= 0) return 0
  const r = monthlyRate(annualRate)
  const n = years * 12
  if (r === 0) return monthlyAmount * n
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r)
}

// ── Corpus targets ───────────────────────────────────────────────────────────

/**
 * Required corpus at retirement.
 * desiredMonthly is in TODAY's dollars — inflated forward by years.
 */
export function requiredCorpus(
  desiredMonthly: number,
  inflationRate: number,
  years: number,
  swr: number,
): number {
  if (swr <= 0) return 0
  const inflatedMonthly = desiredMonthly * Math.pow(1 + inflationRate, years)
  return (inflatedMonthly * 12) / swr
}

// ── CPF ──────────────────────────────────────────────────────────────────────

/**
 * Projected CPF Retirement Account value at retirement.
 * OA + SA only — MA (Medisave) is healthcare only, excluded.
 * Blended growth rate ~3.5% p.a.
 */
export function cpfProjectedRA(cpfOa: number, cpfSa: number, years: number): number {
  return fvLumpSum(cpfOa + cpfSa, 0.035, years)
}

/**
 * CPF Life Standard payout estimate.
 * ~$650/month per $100K RA balance (0.0065).
 */
export function cpfLifeMonthly(cpfOa: number, cpfSa: number, years: number): number {
  return cpfProjectedRA(cpfOa, cpfSa, years) * 0.0065
}

/**
 * Capitalised value of CPF Life stream (for corpus comparison).
 * Uses SWR to convert the monthly payout to a lump-sum equivalent.
 */
export function cpfCapitalisedValue(
  cpfOa: number, cpfSa: number, years: number, swr: number,
): number {
  if (swr <= 0) return 0
  const monthly = cpfLifeMonthly(cpfOa, cpfSa, years)
  return (monthly * 12) / swr
}

// ── Projected corpus ─────────────────────────────────────────────────────────

export interface CorpusResult {
  fvSavings: number
  fvContributions: number
  cpfCapitalised: number
  total: number
}

export function projectedCorpus(
  currentSavings: number,
  monthlyInvestment: number,
  annualRate: number,
  years: number,
  cpfOa: number,
  cpfSa: number,
  swr: number,
  includeCpf: boolean,
): CorpusResult {
  const fvSav = fvLumpSum(currentSavings, annualRate, years)
  const fvCon = fvContributions(monthlyInvestment, annualRate, years)
  const cpfCap = includeCpf ? cpfCapitalisedValue(cpfOa, cpfSa, years, swr) : 0
  return {
    fvSavings: fvSav,
    fvContributions: fvCon,
    cpfCapitalised: cpfCap,
    total: fvSav + fvCon + cpfCap,
  }
}

// ── Tri-lock solvers ─────────────────────────────────────────────────────────

/**
 * Solve for required return rate (binary search 0–30%).
 * Returns the minimum annual return needed to reach requiredTotal.
 */
export function solveForRate(
  currentSavings: number,
  monthlyInvestment: number,
  years: number,
  cpfOa: number,
  cpfSa: number,
  swr: number,
  includeCpf: boolean,
  requiredTotal: number,
): number {
  let lo = 0, hi = 0.30
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const proj = projectedCorpus(currentSavings, monthlyInvestment, mid, years, cpfOa, cpfSa, swr, includeCpf)
    if (proj.total >= requiredTotal) hi = mid; else lo = mid
  }
  return (lo + hi) / 2
}

/**
 * Solve for retirement age (iterate year by year from currentAge+1 to 85).
 * Returns the earliest age at which projected >= required.
 */
export function solveForAge(
  currentAge: number,
  currentSavings: number,
  monthlyInvestment: number,
  annualRate: number,
  cpfOa: number,
  cpfSa: number,
  swr: number,
  includeCpf: boolean,
  desiredMonthly: number,
  inflationRate: number,
): number {
  for (let age = currentAge + 1; age <= 85; age++) {
    const yrs = age - currentAge
    const proj = projectedCorpus(currentSavings, monthlyInvestment, annualRate, yrs, cpfOa, cpfSa, swr, includeCpf)
    const req = requiredCorpus(desiredMonthly, inflationRate, yrs, swr)
    if (proj.total >= req) return age
  }
  return 85
}

/**
 * Solve for required monthly investment.
 * Algebraic: solve FV(savings) + FV(pmt) + cpf = required
 */
export function solveForMonthly(
  currentSavings: number,
  annualRate: number,
  years: number,
  cpfOa: number,
  cpfSa: number,
  swr: number,
  includeCpf: boolean,
  requiredTotal: number,
): number {
  const fvSav = fvLumpSum(currentSavings, annualRate, years)
  const cpfCap = includeCpf ? cpfCapitalisedValue(cpfOa, cpfSa, years, swr) : 0
  const gap = requiredTotal - fvSav - cpfCap
  if (gap <= 0) return 0

  const r = monthlyRate(annualRate)
  const n = years * 12
  if (r === 0) return n > 0 ? gap / n : 0
  return Math.max(0, (gap * r) / (Math.pow(1 + r, n) - 1))
}

// ── Wealth projection chart data ─────────────────────────────────────────────

export interface ChartPoint {
  age: number
  base: number
  optimistic: number
  pessimistic: number
  required: number | null
  cpfPayout: number  // cumulative CPF Life monthly * 12
}

export function buildWealthProjection(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyInvestment: number,
  annualRate: number,
  desiredMonthly: number,
  inflationRate: number,
  swr: number,
  cpfOa: number,
  cpfSa: number,
  cpfMa: number,
  includeCpf: boolean,
): ChartPoint[] {
  const rates = {
    base: annualRate,
    optimistic: annualRate + 0.02,
    pessimistic: Math.max(0.01, annualRate - 0.02),
  }

  const yrs = Math.max(1, retirementAge - currentAge)
  const cpfMonthly = includeCpf ? cpfLifeMonthly(cpfOa, cpfSa, yrs) : 0

  // Post-retirement portfolio state
  let postBase = 0, postOpt = 0, postPess = 0
  let retired = false

  const data: ChartPoint[] = []

  for (let age = currentAge; age <= 90; age++) {
    const yr = age - currentAge
    let base: number, optimistic: number, pessimistic: number

    if (age < retirementAge) {
      // Accumulation phase
      base = projectedCorpus(currentSavings, monthlyInvestment, rates.base, yr, cpfOa, cpfSa, swr, includeCpf).total
      optimistic = projectedCorpus(currentSavings, monthlyInvestment, rates.optimistic, yr, cpfOa, cpfSa, swr, includeCpf).total
      pessimistic = projectedCorpus(currentSavings, monthlyInvestment, rates.pessimistic, yr, cpfOa, cpfSa, swr, includeCpf).total
    } else {
      // Drawdown phase — initialise once at retirement
      if (!retired) {
        postBase  = projectedCorpus(currentSavings, monthlyInvestment, rates.base, yrs, cpfOa, cpfSa, swr, includeCpf).total
        postOpt   = projectedCorpus(currentSavings, monthlyInvestment, rates.optimistic, yrs, cpfOa, cpfSa, swr, includeCpf).total
        postPess  = projectedCorpus(currentSavings, monthlyInvestment, rates.pessimistic, yrs, cpfOa, cpfSa, swr, includeCpf).total
        retired = true
      }

      const annualWithdrawal = desiredMonthly * Math.pow(1 + inflationRate, yr) * 12
      const cpfAnnual = cpfMonthly * 12
      const netWithdrawal = Math.max(0, annualWithdrawal - cpfAnnual)

      postBase  = Math.max(0, postBase  * (1 + rates.base)       - netWithdrawal)
      postOpt   = Math.max(0, postOpt   * (1 + rates.optimistic)  - netWithdrawal)
      postPess  = Math.max(0, postPess  * (1 + rates.pessimistic) - netWithdrawal)

      base = postBase; optimistic = postOpt; pessimistic = postPess
    }

    const required = age < retirementAge
      ? requiredCorpus(desiredMonthly, inflationRate, retirementAge - age, swr)
      : null

    data.push({
      age,
      base: Math.round(base),
      optimistic: Math.round(optimistic),
      pessimistic: Math.round(pessimistic),
      required: required !== null ? Math.round(required) : null,
      cpfPayout: includeCpf && age >= 65 ? Math.round(cpfMonthly) : 0,
    })
  }

  return data
}

// ── Medisave ─────────────────────────────────────────────────────────────────

/** Medisave Basic Healthcare Sum (2025): S$71,500. MA grows at 4% p.a. */
export function medisaveProjected(cpfMa: number, years: number): number {
  return fvLumpSum(cpfMa, 0.04, years)
}
