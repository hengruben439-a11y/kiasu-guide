export type UserRole = 'client' | 'admin'

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

// Legacy type — kept for any remaining references
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  phone: string | null
  created_at: string
  updated_at: string
}

// Current data model — master record (§6)
export interface ClientProfile {
  user_id: string
  preferred_name: string | null
  dob: string | null
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
  height_cm: number | null
  weight_kg: number | null
  pre_existing: string | null
  pdpa_consent: boolean
  employment_status: string | null
  monthly_income: number
  monthly_expenses: number
  num_dependents: number
  liquid_savings: number
  cpf_oa: number
  cpf_sa: number
  cpf_ma: number
  cpf_toggle: boolean
  property_value: number
  property_liquid: boolean
  monthly_investment: number
  portfolio_value: number
  total_liabilities: number
  target_return_rate: number
  retirement_age: number
  desired_monthly_income: number
  dividend_yield: number
  inflation_rate: number
  spouse_income: number
  spouse_dob: string | null
  dependent_ages: number[]
  role: UserRole
  pipeline_status: string
  created_at: string
  updated_at: string
}

export type BenefitType =
  | 'death' | 'tpd' | 'eci' | 'aci' | 'hospitalisation'
  | 'pa' | 'careshield' | 'multi_pay_ci'

export interface BenefitBlock {
  id: string
  user_id: string
  benefit_type: BenefitType
  policy_name: string | null
  coverage: number
  payout_mode: 'lump_sum' | 'monthly' | 'multipay' | null
  multiplier: number
  max_claims: number | null
  cooldown_years: number | null
  expiry_age: number | null
  renewal_date: string | null
  enabled: boolean
  // Sprint 6 additions
  inception_date: string | null
  payment_date: number | null   // day of month (1-28)
  expiry_date: string | null    // actual calendar date
  annual_premium: number
  insurer: string | null
  created_at: string
  updated_at: string
  // Joined from policy_riders (optional)
  riders?: PolicyRider[]
}

export interface PolicyRider {
  id: string
  benefit_block_id: string
  user_id: string
  name: string
  benefit_type: BenefitType | null
  coverage: number
  annual_premium: number
  expiry_age: number | null
  created_at: string
  updated_at: string
}

export interface ExpenseItem {
  id: string
  user_id: string
  category_key: string
  label: string
  amount: number
  created_at: string
  updated_at: string
}

export interface FinancialProfile {
  id: string
  user_id: string
  age: number
  monthly_income: number
  monthly_expenses: number
  current_savings: number
  cpf_balance: number
  retirement_age: number
  risk_profile: RiskProfile
  investment_goals: string | null
  existing_insurance: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientWithFinancials extends Profile {
  financial_profiles: FinancialProfile | null
}
