'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface Tool {
  title: string
  description: string
  href: string
  emoji: string
  accent: string        // hex color
  accentBg: string      // dark tint of accent
  category: string
  hero?: boolean
}

const tools: Tool[] = [
  {
    title: 'Financial Overview',
    description: 'Your complete financial snapshot — health score, progress bars, and key metrics in one view.',
    href: '/dashboard/overview',
    emoji: '🗺️',
    accent: '#9b2040',
    accentBg: 'rgba(155,32,64,0.12)',
    category: 'Dashboard',
    hero: true,
  },
  {
    title: 'Financial Health Score',
    description: 'Composite 0–100 score across protection, retirement, liquidity, debt, and investment.',
    href: '/dashboard/health-score',
    emoji: '📊',
    accent: '#9b2040',
    accentBg: 'rgba(155,32,64,0.10)',
    category: 'Dashboard',
  },
  {
    title: 'Financial Profile',
    description: 'Update your income, expenses, CPF, and retirement goals.',
    href: '/dashboard/profile',
    emoji: '📝',
    accent: '#c4a882',
    accentBg: 'rgba(196,168,130,0.10)',
    category: 'Setup',
  },
  {
    title: 'Net Worth Tracker',
    description: 'Log every asset and liability. See your true net worth updated in real time.',
    href: '/dashboard/net-worth',
    emoji: '⚖️',
    accent: '#0369a1',
    accentBg: 'rgba(3,105,161,0.10)',
    category: 'Wealth',
  },
  {
    title: 'Retirement Analytics',
    description: 'Required corpus, projected growth, and the Trinity solver — fix any two variables.',
    href: '/dashboard/retirement',
    emoji: '🏖️',
    accent: '#0369a1',
    accentBg: 'rgba(3,105,161,0.10)',
    category: 'Wealth',
  },
  {
    title: 'CPF Planning',
    description: 'Project OA, SA and MA growth. Model the Retirement Account and CPF Life payout.',
    href: '/dashboard/cpf',
    emoji: '🇸🇬',
    accent: '#0f766e',
    accentBg: 'rgba(15,118,110,0.10)',
    category: 'Wealth',
  },
  {
    title: 'Cost of Waiting',
    description: 'Every year of delay costs more than you think. See the real price of inaction.',
    href: '/dashboard/cost-of-waiting',
    emoji: '⏳',
    accent: '#ea580c',
    accentBg: 'rgba(234,88,12,0.10)',
    category: 'Wealth',
  },
  {
    title: 'Insurance Benefits',
    description: 'Map your protection coverage against LIA benchmarks. Find every gap.',
    href: '/dashboard/insurance',
    emoji: '🛡️',
    accent: '#16a34a',
    accentBg: 'rgba(22,163,74,0.10)',
    category: 'Protection',
  },
  {
    title: 'LTC Gap Calculator',
    description: 'Long-term care costs vs. CareShield Life. Know your monthly shortfall.',
    href: '/dashboard/ltc',
    emoji: '🤝',
    accent: '#16a34a',
    accentBg: 'rgba(22,163,74,0.10)',
    category: 'Protection',
  },
  {
    title: 'Financial Stress Test',
    description: 'Simulate job loss, critical illness, or death. Watch your runway respond.',
    href: '/dashboard/stress-test',
    emoji: '🔥',
    accent: '#ef4444',
    accentBg: 'rgba(239,68,68,0.10)',
    category: 'Risk',
  },
  {
    title: 'Cash Flow Analysis',
    description: 'See where every dollar goes. Upload a bank statement to auto-categorise.',
    href: '/dashboard/cashflow',
    emoji: '💸',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.10)',
    category: 'Cash',
  },
  {
    title: 'BMI Calculator',
    description: 'Asian-standard BMI thresholds. Track height, weight, and body composition.',
    href: '/dashboard/bmi',
    emoji: '🏃',
    accent: '#6d28d9',
    accentBg: 'rgba(109,40,217,0.10)',
    category: 'Health',
  },
]

const CATEGORY_ORDER = ['Dashboard', 'Setup', 'Wealth', 'Protection', 'Risk', 'Cash', 'Health']

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
}

function CategoryLabel({ name }: { name: string }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
      textTransform: 'uppercase', color: '#c4a882',
      fontFamily: "'Cabinet Grotesk', sans-serif",
      margin: '0 0 12px',
    }}>
      {name}
    </p>
  )
}

export default function ToolGrid() {
  // Group tools by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    tools: tools.filter((t) => t.category === cat),
  })).filter((g) => g.tools.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {grouped.map(({ category, tools: groupTools }) => (
        <div key={category}>
          <CategoryLabel name={category} />
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {groupTools.map((tool) => (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  variants={cardVariants}
                  whileHover={{
                    y: -4,
                    boxShadow: `0 10px 30px ${tool.accent}30`,
                    borderColor: tool.accent + '50',
                  }}
                  style={{
                    background: 'rgba(122,28,46,0.06)',
                    border: `1px solid ${tool.hero ? tool.accent + '30' : 'rgba(196,168,130,0.15)'}`,
                    borderRadius: 14,
                    padding: tool.hero ? '22px 22px 20px' : '18px 18px 16px',
                    cursor: 'pointer',
                    boxShadow: tool.hero ? `0 4px 20px ${tool.accent}18` : '0 2px 8px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Top accent strip */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${tool.accent}, ${tool.accent}88)`,
                  }} />

                  {/* Icon bubble */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: tool.accentBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, marginBottom: 12,
                  }}>
                    {tool.emoji}
                  </div>

                  <p style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: tool.hero ? 15 : 14,
                    fontWeight: 700, color: '#fdf8f2',
                    margin: '0 0 5px', letterSpacing: '-0.01em',
                  }}>
                    {tool.title}
                  </p>
                  <p style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontSize: 12, color: 'rgba(253,248,242,0.55)', margin: 0, lineHeight: 1.55,
                  }}>
                    {tool.description}
                  </p>

                  {/* Arrow */}
                  <div style={{
                    position: 'absolute', bottom: 14, right: 16,
                    fontSize: 14, color: tool.accent + '70',
                    fontWeight: 700,
                  }}>
                    →
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  )
}
