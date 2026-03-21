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
  property_value: number
  property_liquid: boolean
  monthly_investment: number
  portfolio_value: number
  target_return_rate: number
  retirement_age: number
  desired_monthly_income: number
  dividend_yield: number
  inflation_rate: number
  role: UserRole
  pipeline_status: string
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
