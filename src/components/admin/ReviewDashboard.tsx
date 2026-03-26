'use client'

import { useState } from 'react'
import { GapItem, SEVERITY_STYLES } from '@/lib/scoring'
import RetirementAnalytics from '@/components/tools/RetirementAnalytics'
import CPFPlanner from '@/components/tools/CPFPlanner'
import InsuranceBenefits from '@/components/tools/InsuranceBenefits'
import CashFlow from '@/components/tools/CashFlow'
import StressTest from '@/components/tools/StressTest'
import CostOfWaiting from '@/components/tools/CostOfWaiting'
import BMICalculator from '@/components/tools/BMICalculator'
import LTCGapCalculator from '@/components/tools/LTCGapCalculator'
import FinancialHealthScore from '@/components/tools/FinancialHealthScore'

interface BenefitBlock {
  id: string
  user_id: string
  benefit_type: 'death' | 'tpd' | 'eci' | 'aci' | 'hospitalisation' | 'pa' | 'careshield'
  policy_name: string | null
  coverage: number
  payout_mode: 'lump_sum' | 'monthly' | 'multipay' | null
  multiplier: number | null
  max_claims: number | null
  cooldown_years: number | null
  expiry_age: number | null
  renewal_date: string | null
  enabled: boolean
}

interface Props {
  clientId: string
  currentAge: number | null
  monthlyIncome: number
  monthlyExpenses: number
  liquidSavings: number
  cpfOa: number
  cpfSa: number
  cpfMa: number
  monthlyInvestment: number
  portfolioValue: number
  retirementAge: number
  desiredMonthlyIncome: number
  dividendYield: number
  targetReturnRate: number
  inflationRate: number
  heightCm: number | null
  weightKg: number | null
  totalCoverage: number
  benefitBlocks: BenefitBlock[]
  priorities?: GapItem[]
}

const GAP_TO_TAB: Record<string, string> = {
  emergency: 'cashflow',
  cashflow:  'cashflow',
  retirement:'retirement',
  protection:'protection',
}

const TABS = [
  { key: 'retirement',   label: 'Retirement' },
  { key: 'cpf',          label: 'CPF' },
  { key: 'protection',   label: 'Protection' },
  { key: 'cashflow',     label: 'Cash Flow' },
  { key: 'stress',       label: 'Stress Test' },
  { key: 'waiting',      label: 'Cost of Waiting' },
  { key: 'bmi',          label: 'BMI' },
  { key: 'ltc',          label: 'LTC Gap' },
  { key: 'score',        label: 'Health Score' },
]

export default function ReviewDashboard(props: Props) {
  const firstTab = props.priorities?.[0]
    ? (GAP_TO_TAB[props.priorities[0].id] ?? 'retirement')
    : 'retirement'
  const [activeTab, setActiveTab] = useState(firstTab)
  const [agendaOpen, setAgendaOpen] = useState(true)

  const {
    clientId, currentAge,
    monthlyIncome, monthlyExpenses, liquidSavings,
    cpfOa, cpfSa, cpfMa,
    monthlyInvestment, portfolioValue,
    retirementAge, desiredMonthlyIncome,
    dividendYield, targetReturnRate, inflationRate,
    heightCm, weightKg, totalCoverage, benefitBlocks,
    priorities = [],
  } = props

  // Which tabs have a gap flag?
  const flaggedTabs = new Set(priorities.map(g => GAP_TO_TAB[g.id]).filter(Boolean))

  return (
    <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,300;1,400&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,600,700&display=swap');
      `}</style>

      {/* Pre-meeting agenda */}
      {priorities.length > 0 && (
        <div style={{
          borderBottom: '1px solid rgba(42,31,26,0.1)',
          background: '#fefcf9',
        }}>
          <button
            onClick={() => setAgendaOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 48px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a89070' }}>
              Meeting Agenda — {priorities.length} priority area{priorities.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: '#a89070' }}>{agendaOpen ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {agendaOpen && (
            <div style={{ padding: '0 48px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorities.map((gap, i) => {
                const s = SEVERITY_STYLES[gap.severity]
                const targetTab = GAP_TO_TAB[gap.id]
                return (
                  <div key={gap.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: s.bg, border: `1px solid ${s.border}`,
                    borderLeft: `3px solid ${s.dot}`,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(42,31,26,0.35)', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2a1f1a', fontFamily: "'Playfair Display', serif" }}>
                          {gap.title}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, background: s.badge, color: s.text }}>
                          {gap.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#a89070', margin: 0, lineHeight: 1.5 }}>
                        {gap.consequence}
                      </p>
                    </div>
                    {targetTab && (
                      <button
                        onClick={() => setActiveTab(targetTab)}
                        style={{
                          fontSize: 11, fontWeight: 600, color: s.text,
                          background: s.badge, border: 'none', borderRadius: 6,
                          padding: '4px 10px', cursor: 'pointer', flexShrink: 0,
                          fontFamily: "'Cabinet Grotesk', sans-serif",
                        }}
                      >
                        Open →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        position: 'sticky',
        top: 44, // below the banner
        zIndex: 40,
        background: '#fdf8f2',
        borderBottom: '1px solid rgba(42,31,26,0.08)',
        padding: '0 48px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
      }}>
        {TABS.map(({ key, label }) => {
          const hasFlaggedGap = flaggedTabs.has(key)
          return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? '#7a1c2e' : '#a89070',
              borderBottom: activeTab === key ? '2px solid #7a1c2e' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              fontFamily: "'Cabinet Grotesk', sans-serif",
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {label}
            {hasFlaggedGap && activeTab !== key && (
              <span style={{
                position: 'absolute', top: 8, right: 6,
                width: 5, height: 5, borderRadius: '50%',
                background: priorities.find(g => GAP_TO_TAB[g.id] === key)?.severity === 'critical'
                  ? '#dc2626' : '#d97706',
                display: 'inline-block',
              }} />
            )}
          </button>
          )
        })}
      </div>

      {/* Tool panel */}
      <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
        {activeTab === 'retirement' && (
          <RetirementAnalytics
            currentAge={currentAge ?? 35}
            monthlyIncome={monthlyIncome}
            currentSavings={liquidSavings + portfolioValue}
            monthlyInvestment={monthlyInvestment}
            retirementAge={retirementAge}
            desiredMonthlyIncome={desiredMonthlyIncome}
            inflationRate={inflationRate}
            dividendYield={dividendYield}
            annualRate={targetReturnRate}
            cpfOa={cpfOa}
            cpfSa={cpfSa}
            cpfMa={cpfMa}
          />
        )}

        {activeTab === 'cpf' && (
          <CPFPlanner
            cpfOa={cpfOa}
            cpfSa={cpfSa}
            cpfMa={cpfMa}
            monthlyIncome={monthlyIncome}
            retirementAge={retirementAge}
            currentAge={currentAge ?? 35}
            desiredMonthlyIncome={desiredMonthlyIncome}
            inflationRate={inflationRate}
          />
        )}

        {activeTab === 'protection' && (
          <InsuranceBenefits
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            liquidSavings={liquidSavings}
            benefitBlocks={benefitBlocks}
            userId={clientId}
          />
        )}

        {activeTab === 'cashflow' && (
          <CashFlow
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            userId={clientId}
          />
        )}

        {activeTab === 'stress' && (
          <StressTest
            monthly_income={monthlyIncome}
            monthly_expenses={monthlyExpenses}
            liquid_savings={liquidSavings}
            cpf_oa={cpfOa}
            cpf_sa={cpfSa}
            cpf_ma={cpfMa}
            monthly_investment={monthlyInvestment}
            inflation_rate={inflationRate}
            currentAge={currentAge ?? 35}
          />
        )}

        {activeTab === 'waiting' && (
          <CostOfWaiting
            liquid_savings={liquidSavings}
            monthly_investment={monthlyInvestment}
            retirement_age={retirementAge}
            target_return_rate={targetReturnRate}
            desired_monthly_income={desiredMonthlyIncome}
            dividend_yield={dividendYield}
            currentAge={currentAge ?? 35}
          />
        )}

        {activeTab === 'bmi' && (
          <BMICalculator
            initialHeight={heightCm}
            initialWeight={weightKg}
            userId={clientId}
          />
        )}

        {activeTab === 'ltc' && (
          <LTCGapCalculator />
        )}

        {activeTab === 'score' && (
          <FinancialHealthScore
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            liquidSavings={liquidSavings}
            cpfOa={cpfOa}
            cpfSa={cpfSa}
            cpfMa={cpfMa}
            monthlyInvestment={monthlyInvestment}
            retirementAge={retirementAge}
            desiredMonthlyIncome={desiredMonthlyIncome}
            dividendYield={dividendYield}
            targetReturnRate={targetReturnRate}
            inflationRate={inflationRate}
            currentAge={currentAge}
            totalCoverage={totalCoverage}
            userId={clientId}
          />
        )}
      </div>
    </div>
  )
}
