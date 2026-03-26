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

/**
 * What desiredMonthly (in today's dollars) becomes in nominal terms at retirement.
 * This is the number that actually gets withdrawn — many clients are shocked by it.
 */
export function nominalDesiredAtRetirement(
  desiredMonthly: number,
  inflationRate: number,
  years: number,
): number {
  return desiredMonthly * Math.pow(1 + inflationRate, years)
}

// ── CPF ──────────────────────────────────────────────────────────────────────

/**
 * Projected CPF Retirement Account value at retirement.
 * OA + SA only — MA (Medisave) is healthcare only, excluded.
 * OA earns 2.5% p.a., SA earns 4% p.a. (CPF Board official rates).
 * Extra 1% on first $60K combined is approximated by the base rates here.
 */
export function cpfProjectedRA(cpfOa: number, cpfSa: number, years: number): number {
  return fvLumpSum(cpfOa, 0.025, years) + fvLumpSum(cpfSa, 0.04, years)
}

/**
 * CPF Life Standard Plan monthly payout estimate.
 * Based on 2025 CPF Board published figures:
 *   BRS ~S$106,500 → ~S$870/mo  (0.00817)
 *   FRS ~S$213,000 → ~S$1,730/mo (0.00812)
 *   ERS ~S$426,000 → ~S$3,130/mo (0.00735 — capped pool)
 * Conservative blended ratio: 0.0081 (~S$810/mo per S$100K RA).
 * CPF Life payouts typically increase 2–4% p.a. as RA grows before payout age;
 * that growth is already captured by projecting the RA balance forward.
 */
export function cpfLifeMonthly(cpfOa: number, cpfSa: number, years: number): number {
  return cpfProjectedRA(cpfOa, cpfSa, years) * 0.0081
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
 * Solve for retirement age (year by year, currentAge+1 to 85).
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

/**
 * At each milestone age, what savings would you need to still reach the
 * required corpus by retirement (given ongoing monthly contributions)?
 *
 * P_M = (req - FV(monthly, rate, yearsLeft)) / (1+rate)^yearsLeft
 */
export function requiredSavingsAtMilestone(
  requiredTotal: number,
  monthlyInvestment: number,
  annualRate: number,
  yearsUntilRetirement: number,
): number {
  const fvCon = fvContributions(monthlyInvestment, annualRate, yearsUntilRetirement)
  const growthFactor = fvLumpSum(1, annualRate, yearsUntilRetirement)
  const needed = (requiredTotal - fvCon) / growthFactor
  return Math.max(0, needed)
}

// ── Wealth projection chart data ─────────────────────────────────────────────

export interface ChartPoint {
  age: number
  base: number
  optimistic: number
  pessimistic: number
  required: number | null
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

  let postBase = 0, postOpt = 0, postPess = 0
  let retired = false

  const data: ChartPoint[] = []

  for (let age = currentAge; age <= 92; age++) {
    const yr = age - currentAge
    let base: number, optimistic: number, pessimistic: number

    if (age < retirementAge) {
      base = projectedCorpus(currentSavings, monthlyInvestment, rates.base, yr, cpfOa, cpfSa, swr, includeCpf).total
      optimistic = projectedCorpus(currentSavings, monthlyInvestment, rates.optimistic, yr, cpfOa, cpfSa, swr, includeCpf).total
      pessimistic = projectedCorpus(currentSavings, monthlyInvestment, rates.pessimistic, yr, cpfOa, cpfSa, swr, includeCpf).total
    } else {
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
    })
  }

  return data
}

// ── Medisave ─────────────────────────────────────────────────────────────────

export function medisaveProjected(cpfMa: number, years: number): number {
  return fvLumpSum(cpfMa, 0.04, years)
}

// ── V2 Types ──────────────────────────────────────────────────────────────────

export interface PassiveIncomeStream {
  id: string
  name: string
  monthlyAmount: number
  startAge: number
}

export interface ChartPointV2 {
  age: number
  base: number
  optimistic: number
  pessimistic: number
  required: number | null
  /** Monthly income figures — null before retirement */
  portfolioIncome: number | null
  cpfIncome: number | null
  otherPassiveIncome: number | null
  totalPassiveIncome: number | null
}

// ── V2 Corpus math ────────────────────────────────────────────────────────────

/**
 * Investment portfolio only — no CPF capitalised value.
 * This is the actual investable corpus you accumulate.
 */
export function projectedInvestmentCorpus(
  currentSavings: number,
  monthlyInvestment: number,
  annualRate: number,
  years: number,
): number {
  return fvLumpSum(currentSavings, annualRate, years) + fvContributions(monthlyInvestment, annualRate, years)
}

/**
 * Required investment corpus (after subtracting CPF Life and other passive income).
 * Dividend mode: corpus must generate enough yield to cover the gap.
 * Drawdown mode: drawdownMonthly is withdrawn; corpus sized by SWR (dividendYield param).
 */
export function requiredInvestmentCorpus(
  desiredMonthly: number,
  inflationRate: number,
  years: number,
  dividendYield: number,
  cpfOa: number,
  cpfSa: number,
  includeCpf: boolean,
  passiveAtRetirement: number,
  mode: 'dividend' | 'drawdown',
  drawdownMonthly: number,
): number {
  if (dividendYield <= 0) return 0
  const nominal = desiredMonthly * Math.pow(1 + inflationRate, years)
  const cpfLife = includeCpf ? cpfLifeMonthly(cpfOa, cpfSa, years) : 0
  const totalPassive = cpfLife + passiveAtRetirement

  if (mode === 'dividend') {
    const netNeeded = Math.max(0, nominal - totalPassive)
    return (netNeeded * 12) / dividendYield
  } else {
    // Drawdown: size corpus so drawdownMonthly can be sustained at dividendYield (as SWR)
    const effectiveDrawdown = drawdownMonthly > 0 ? drawdownMonthly : Math.max(0, nominal - totalPassive)
    return (effectiveDrawdown * 12) / dividendYield
  }
}

// ── V2 Tri-lock solvers ───────────────────────────────────────────────────────

export function solveForRateV2(
  currentSavings: number,
  monthlyInvestment: number,
  years: number,
  requiredTotal: number,
): number {
  let lo = 0, hi = 0.30
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (projectedInvestmentCorpus(currentSavings, monthlyInvestment, mid, years) >= requiredTotal) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

export function solveForAgeV2(
  currentAge: number,
  currentSavings: number,
  monthlyInvestment: number,
  annualRate: number,
  desiredMonthly: number,
  inflationRate: number,
  dividendYield: number,
  cpfOa: number,
  cpfSa: number,
  includeCpf: boolean,
  passiveStreams: PassiveIncomeStream[],
  mode: 'dividend' | 'drawdown',
  drawdownMonthly: number,
): number {
  for (let age = currentAge + 1; age <= 85; age++) {
    const yrs = age - currentAge
    const passiveAtAge = passiveStreams
      .filter(s => s.startAge <= age)
      .reduce((sum, s) => sum + s.monthlyAmount, 0)
    const req = requiredInvestmentCorpus(
      desiredMonthly, inflationRate, yrs, dividendYield,
      cpfOa, cpfSa, includeCpf, passiveAtAge, mode, drawdownMonthly,
    )
    const proj = projectedInvestmentCorpus(currentSavings, monthlyInvestment, annualRate, yrs)
    if (proj >= req) return age
  }
  return 85
}

export function solveForMonthlyV2(
  currentSavings: number,
  annualRate: number,
  years: number,
  requiredTotal: number,
): number {
  const fvSav = fvLumpSum(currentSavings, annualRate, years)
  const gap = requiredTotal - fvSav
  if (gap <= 0) return 0
  const r = monthlyRate(annualRate)
  const n = years * 12
  if (r === 0) return n > 0 ? gap / n : 0
  return Math.max(0, (gap * r) / (Math.pow(1 + r, n) - 1))
}

// ── V2 Wealth projection ──────────────────────────────────────────────────────

export function buildWealthProjectionV2(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyInvestment: number,
  accumulationRate: number,
  desiredMonthly: number,
  inflationRate: number,
  dividendYield: number,
  cpfOa: number,
  cpfSa: number,
  cpfMa: number,
  includeCpf: boolean,
  mode: 'dividend' | 'drawdown',
  fundTotalReturn: number,
  fundFees: number,
  drawdownMonthly: number,
  passiveStreams: PassiveIncomeStream[],
  /** Streams used for the "required corpus" line — pass [] for bonus-mode passive income */
  passiveStreamsForRequired?: PassiveIncomeStream[],
): ChartPointV2[] {
  const reqStreams = passiveStreamsForRequired ?? passiveStreams
  const yrs = Math.max(1, retirementAge - currentAge)
  const cpfMonthlyAtRetirement = includeCpf ? cpfLifeMonthly(cpfOa, cpfSa, yrs) : 0

  // Post-retirement portfolio growth rate
  const netGrowthRate = fundTotalReturn - dividendYield - fundFees
  const postRates = {
    base: mode === 'dividend' ? netGrowthRate : accumulationRate,
    optimistic: mode === 'dividend' ? netGrowthRate + 0.02 : accumulationRate + 0.02,
    pessimistic: mode === 'dividend'
      ? Math.max(-0.10, netGrowthRate - 0.02)
      : Math.max(0.01, accumulationRate - 0.02),
  }
  const accRates = {
    base: accumulationRate,
    optimistic: accumulationRate + 0.02,
    pessimistic: Math.max(0.01, accumulationRate - 0.02),
  }

  let postBase = 0, postOpt = 0, postPess = 0
  let retired = false

  const data: ChartPointV2[] = []

  for (let age = currentAge; age <= 92; age++) {
    const yr = age - currentAge
    let base: number, optimistic: number, pessimistic: number
    let portfolioIncome: number | null = null
    let cpfIncome: number | null = null
    let otherPassiveIncome: number | null = null
    let totalPassiveIncome: number | null = null

    if (age < retirementAge) {
      // Accumulation phase — investment corpus only (no CPF capitalised)
      base = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.base, yr)
      optimistic = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.optimistic, yr)
      pessimistic = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.pessimistic, yr)
    } else {
      // Distribution phase
      if (!retired) {
        postBase = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.base, yrs)
        postOpt = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.optimistic, yrs)
        postPess = projectedInvestmentCorpus(currentSavings, monthlyInvestment, accRates.pessimistic, yrs)
        retired = true
      }

      if (mode === 'dividend') {
        // Corpus grows at netGrowthRate; dividends are the income stream
        portfolioIncome = Math.max(0, postBase) * dividendYield / 12
        postBase = Math.max(0, postBase * (1 + postRates.base))
        postOpt = Math.max(0, postOpt * (1 + postRates.optimistic))
        postPess = Math.max(0, postPess * (1 + postRates.pessimistic))
      } else {
        // Drawdown: withdraw fixed monthly; corpus may deplete
        const effectiveDrawdown = drawdownMonthly > 0 ? drawdownMonthly : desiredMonthly
        portfolioIncome = effectiveDrawdown
        const annualDrawdown = effectiveDrawdown * 12
        postBase = Math.max(0, postBase * (1 + postRates.base) - annualDrawdown)
        postOpt = Math.max(0, postOpt * (1 + postRates.optimistic) - annualDrawdown)
        postPess = Math.max(0, postPess * (1 + postRates.pessimistic) - annualDrawdown)
      }

      base = postBase; optimistic = postOpt; pessimistic = postPess

      cpfIncome = cpfMonthlyAtRetirement
      otherPassiveIncome = passiveStreams
        .filter(s => s.startAge <= age)
        .reduce((sum, s) => sum + s.monthlyAmount, 0)
      totalPassiveIncome = (portfolioIncome ?? 0) + cpfIncome + otherPassiveIncome
    }

    // Required investment corpus, shrinking as you approach retirement
    const required = age < retirementAge
      ? (() => {
          const yearsLeft = retirementAge - age
          const passiveAtRet = reqStreams
            .filter(s => s.startAge <= retirementAge)
            .reduce((sum, s) => sum + s.monthlyAmount, 0)
          return requiredInvestmentCorpus(
            desiredMonthly, inflationRate, yearsLeft, dividendYield,
            cpfOa, cpfSa, includeCpf, passiveAtRet, mode, drawdownMonthly,
          )
        })()
      : null

    data.push({
      age,
      base: Math.round(Math.max(0, base)),
      optimistic: Math.round(Math.max(0, optimistic)),
      pessimistic: Math.round(Math.max(0, pessimistic)),
      required: required !== null ? Math.round(required) : null,
      portfolioIncome: portfolioIncome !== null ? Math.round(portfolioIncome) : null,
      cpfIncome: cpfIncome !== null ? Math.round(cpfIncome) : null,
      otherPassiveIncome: otherPassiveIncome !== null ? Math.round(otherPassiveIncome) : null,
      totalPassiveIncome: totalPassiveIncome !== null ? Math.round(totalPassiveIncome) : null,
    })
  }

  return data
}
