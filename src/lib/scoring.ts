import { formatSGD } from '@/lib/utils'

export type Severity = 'critical' | 'attention' | 'good'

export type GapItem = {
  id: string
  title: string
  urgency: number
  severity: Severity
  consequence: string
  fix: string | null
  cta: string
  href: string
}

export type PlanMetrics = {
  income: number
  expenses: number
  savings: number
  cpfTotal: number
  surplus: number
  savingsRate: number
  emergencyMonths: number
  projected: number
  required: number
  retirementPct: number
  retirementGap: number
  ciCov: number
  deathCov: number
  ciRatio: number
  deathRatio: number
  protPct: number
  hasBenefits: boolean
  liabilityPayments: number
  debtToIncome: number
  gaps: GapItem[]
  priorities: GapItem[]
  wins: GapItem[]
  allGood: boolean
}

type ProfileInput = {
  monthly_income?: number | string | null
  monthly_expenses?: number | string | null
  liquid_savings?: number | string | null
  cpf_oa?: number | string | null
  cpf_sa?: number | string | null
  cpf_ma?: number | string | null
  monthly_investment?: number | string | null
  target_return_rate?: number | string | null
  retirement_age?: number | string | null
  desired_monthly_income?: number | string | null
  dividend_yield?: number | string | null
  inflation_rate?: number | string | null
  dob?: string | null
}

type BenefitInput = {
  benefit_type: string
  coverage: number
  enabled: boolean
}

type LiabilityInput = {
  monthly_payment: number
  outstanding_balance: number
}

function n(v: number | string | null | undefined, fallback = 0): number {
  const num = Number(v)
  return isNaN(num) ? fallback : num
}

export function buildPlanMetrics(
  profile: ProfileInput,
  benefits?: BenefitInput[] | null,
  liabilities?: LiabilityInput[] | null,
): PlanMetrics {
  const income = n(profile.monthly_income)
  const expenses = n(profile.monthly_expenses)
  const savings = n(profile.liquid_savings)
  const cpfOa = n(profile.cpf_oa)
  const cpfSa = n(profile.cpf_sa)
  const cpfMa = n(profile.cpf_ma)
  const cpfTotal = cpfOa + cpfSa + cpfMa

  const liabilityPayments = (liabilities ?? []).reduce((s, l) => s + n(l.monthly_payment as unknown as string), 0)
  const totalDebt = (liabilities ?? []).reduce((s, l) => s + n(l.outstanding_balance as unknown as string), 0)
  const debtToIncome = income > 0 ? liabilityPayments / income : 0

  const surplus = income - expenses - liabilityPayments
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0
  const totalMonthlyOutflow = expenses + liabilityPayments
  const emergencyMonths = totalMonthlyOutflow > 0 ? savings / totalMonthlyOutflow : 0
  const annualIncome = income * 12

  const age = profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const retirementAge = n(profile.retirement_age, 65)
  const yearsToRetirement = age && retirementAge ? Math.max(0, retirementAge - age) : null

  const r = n(profile.target_return_rate, 0.06) / 12
  const m = yearsToRetirement ? yearsToRetirement * 12 : 0
  const monthlyInv = n(profile.monthly_investment)

  const fvSavings = savings * Math.pow(1 + r, m)
  const fvMonthly = r > 0 && m > 0 ? monthlyInv * (Math.pow(1 + r, m) - 1) / r : 0
  const fvCpf = cpfOa * Math.pow(1.025, yearsToRetirement ?? 0)
    + cpfSa * Math.pow(1.04, yearsToRetirement ?? 0)
  const projected = fvSavings + fvMonthly + fvCpf

  const inflation = n(profile.inflation_rate, 0.03)
  const dividendYield = n(profile.dividend_yield, 0.04)
  const desiredMonthly = n(profile.desired_monthly_income)
  const inflationAdj = desiredMonthly * Math.pow(1 + inflation, yearsToRetirement ?? 0)
  const required = inflationAdj > 0 && dividendYield > 0
    ? (inflationAdj * 12) / dividendYield
    : 0
  const retirementPct = required > 0 ? Math.min(100, (projected / required) * 100) : 0
  const retirementGap = Math.max(0, required - projected)

  // Protection
  const enabled = (benefits ?? []).filter(b => b.enabled)
  const hasBenefits = enabled.length > 0
  const ciCov = enabled
    .filter(b => b.benefit_type === 'eci' || b.benefit_type === 'aci')
    .reduce((s, b) => s + b.coverage, 0)
  const deathCov = enabled
    .filter(b => b.benefit_type === 'death')
    .reduce((s, b) => s + b.coverage, 0)
  const ciRatio = annualIncome > 0 ? Math.min(1, ciCov / (annualIncome * 5)) : 0
  const deathRatio = annualIncome > 0 ? Math.min(1, deathCov / (annualIncome * 10)) : 0
  const protPct = hasBenefits ? Math.round((ciRatio * 0.5 + deathRatio * 0.5) * 100) : 0

  const gaps: GapItem[] = [
    {
      id: 'emergency',
      title: 'Emergency Fund',
      urgency: emergencyMonths >= 6 ? 0 : ((6 - emergencyMonths) / 6) * 80,
      severity: emergencyMonths < 3 ? 'critical' : emergencyMonths < 6 ? 'attention' : 'good',
      consequence: emergencyMonths >= 6
        ? `${emergencyMonths.toFixed(1)} months covered — you're protected.`
        : `Income stops today, you last ${emergencyMonths.toFixed(1)} months. Target is 6.`,
      fix: emergencyMonths < 6
        ? `Need ${formatSGD((6 - emergencyMonths) * totalMonthlyOutflow)} more in liquid savings.`
        : null,
      cta: 'Review Cash Flow',
      href: '/dashboard/cashflow',
    },
    {
      id: 'retirement',
      title: 'Retirement Gap',
      urgency: retirementPct >= 80 ? 0 : ((100 - Math.min(100, retirementPct)) / 100) * 90,
      severity: retirementPct < 50 ? 'critical' : retirementPct < 80 ? 'attention' : 'good',
      consequence: retirementPct >= 80
        ? `On track — ${retirementPct.toFixed(0)}% of corpus funded.`
        : required > 0
          ? `Projected ${formatSGD(projected)} vs ${formatSGD(required)} needed at age ${retirementAge}.`
          : `${retirementPct.toFixed(0)}% of your retirement corpus is funded.`,
      fix: retirementGap > 0 && retirementPct < 80
        ? `${formatSGD(retirementGap)} shortfall at current pace.`
        : null,
      cta: 'Open Retirement Tool',
      href: '/dashboard/retirement',
    },
    {
      id: 'protection',
      title: 'Protection Coverage',
      urgency: !hasBenefits ? 55 : protPct >= 70 ? 0 : ((70 - protPct) / 70) * 75,
      severity: !hasBenefits ? 'attention' : protPct < 35 ? 'critical' : protPct < 70 ? 'attention' : 'good',
      consequence: !hasBenefits
        ? 'Add your policies to see your protection picture.'
        : ciCov === 0
          ? 'No critical illness coverage — a health event could deplete your savings.'
          : protPct >= 70
            ? 'Protection looks adequate for your income level.'
            : `Critical illness at ${Math.round(ciRatio * 100)}% of the recommended target.`,
      fix: !hasBenefits ? null
        : ciCov === 0 ? `CI gap estimate: ${formatSGD(annualIncome * 5)} of coverage.`
        : protPct < 70 ? `CI coverage is ${formatSGD(annualIncome * 5 - ciCov)} below the 5× income benchmark.`
        : null,
      cta: 'Review Coverage',
      href: '/dashboard/insurance',
    },
    {
      id: 'cashflow',
      title: 'Monthly Cash Flow',
      urgency: surplus < 0 ? 95 : savingsRate >= 20 ? 0 : ((20 - savingsRate) / 20) * 65,
      severity: surplus < 0 ? 'critical' : savingsRate < 10 ? 'attention' : savingsRate < 20 ? 'attention' : 'good',
      consequence: surplus < 0
        ? `Monthly deficit of ${formatSGD(Math.abs(surplus))}${liabilityPayments > 0 ? ` (incl. ${formatSGD(liabilityPayments)} debt payments)` : ''} — outflows exceed income.`
        : savingsRate >= 20
          ? `Saving ${savingsRate.toFixed(0)}% of income — ahead of the 20% benchmark.`
          : `Saving ${savingsRate.toFixed(0)}% of income, ${(20 - savingsRate).toFixed(0)}% below target.`,
      fix: surplus < 0
        ? `Close the ${formatSGD(Math.abs(surplus))}/mo gap before investing.`
        : savingsRate < 20
          ? `${formatSGD(income * 0.2 - surplus)}/mo more would hit the 20% benchmark.`
          : null,
      cta: 'View Cash Flow',
      href: '/dashboard/cashflow',
    },
  ]

  // Debt-to-income gap (only if liabilities exist)
  if (liabilityPayments > 0) {
    const dtiPct = debtToIncome * 100
    gaps.push({
      id: 'debt',
      title: 'Debt Load',
      urgency: dtiPct > 50 ? 85 : dtiPct > 35 ? 60 : dtiPct > 20 ? 25 : 0,
      severity: dtiPct > 50 ? 'critical' : dtiPct > 35 ? 'attention' : 'good',
      consequence: dtiPct > 50
        ? `Debt payments consume ${dtiPct.toFixed(0)}% of income — ${formatSGD(totalDebt)} outstanding.`
        : dtiPct > 35
          ? `Debt-to-income at ${dtiPct.toFixed(0)}% — nearing the 35% prudent limit.`
          : `Debt-to-income at ${dtiPct.toFixed(0)}% — manageable level.`,
      fix: dtiPct > 35
        ? `Reduce debt payments by ${formatSGD(liabilityPayments - income * 0.35)}/mo to reach 35% DTI.`
        : null,
      cta: 'Review Liabilities',
      href: '/dashboard/profile',
    })
  }

  const sorted = [...gaps].sort((a, b) => b.urgency - a.urgency)
  const priorities = sorted.filter(g => g.severity !== 'good').slice(0, 3)
  const wins = sorted.filter(g => g.severity === 'good')
  const allGood = priorities.length === 0

  return {
    income, expenses, savings, cpfTotal, surplus, savingsRate,
    emergencyMonths, projected, required, retirementPct, retirementGap,
    ciCov, deathCov, ciRatio, deathRatio, protPct, hasBenefits,
    liabilityPayments, debtToIncome,
    gaps: sorted, priorities, wins, allGood,
  }
}

export const SEVERITY_STYLES: Record<Severity, {
  bg: string; border: string; badge: string; text: string; dot: string
}> = {
  critical: { bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.28)', badge: 'rgba(220,38,38,0.15)', text: '#f87171', dot: '#dc2626' },
  attention: { bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.28)', badge: 'rgba(217,119,6,0.15)', text: '#fbbf24', dot: '#d97706' },
  good: { bg: 'rgba(22,163,74,0.06)', border: 'rgba(22,163,74,0.2)', badge: 'rgba(22,163,74,0.15)', text: '#4ade80', dot: '#16a34a' },
}
