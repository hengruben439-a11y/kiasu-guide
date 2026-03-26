# FMPRD — Failure Mode Product Requirements Document

## Purpose
This document serves as the complete PRD for The Kiasu Guide, a Singapore-focused financial planning app for advisors and their clients. It audits every module, documents every failure, and defines what each module SHOULD do.

**Reference design:** https://www.notion.so/Notes-app-32b8b865adf080cd8695c5508ae4426a (to be added to CLAUDE.md)

---

## App Architecture

**Stack:** Next.js 16 (App Router) + Supabase + Tailwind + Recharts + Framer Motion
**Design system:** Dark glassmorphism — `bg: #0a0605`, cards: `rgba(122,28,46,0.06)`, borders: `rgba(196,168,130,0.15)`, text: `#fdf8f2`, gold: `#c4a882`, accent: `#9b2040`
**Fonts:** Playfair Display (serif headings), Cabinet Grotesk (sans body)

### Module Map
| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/dashboard` | Dashboard home | Overview + journey | Needs journey tracker |
| `/dashboard/overview` | Financial Overview | Gap analysis summary | Working |
| `/dashboard/profile` | FinancialProfileForm | Data collection | Working |
| `/dashboard/health-score` | FinancialHealthScore | Overall score | Working |
| `/dashboard/insurance` | InsuranceBenefits | Coverage gaps | **BROKEN: Light mode** |
| `/dashboard/stress-test` | StressTest | Scenario simulator | **BROKEN: Not meaningful** |
| `/dashboard/cpf` | CPFPlanner | CPF projections | **BUG: S$0/yr top-up** |
| `/dashboard/retirement` | RetirementAnalytics | Retirement planning | **FAILING: Overwhelming** |
| `/dashboard/cashflow` | CashFlow | Spending analysis | **FAILING: No breakdown visibility** |
| `/dashboard/cost-of-waiting` | CostOfWaiting | Delay cost visualizer | **FAILING: Limited scenarios, bad tooltip** |
| `/dashboard/ltc` | LTCGapCalculator | Long-term care gap | **WRONG: 10yr assumption** |
| `/dashboard/bmi` | BMICalculator | Health metric | Acceptable |
| `/dashboard/net-worth` | NetWorthTracker | Asset summary | Acceptable |
| `/dashboard/mpci` | MPCIBuilder | Multi-pay CI scenarios | **FAILING: Pointless for client** |

---

## MODULE-BY-MODULE AUDIT

### 1. Insurance Coverage (`InsuranceBenefits.tsx`)

**FAILURE: Entire component is in LIGHT MODE**

Evidence from code (13 occurrences):
- Line 103: `stroke="#f0e8e0"` (light beige circle track)
- Line 333: `background: block.enabled ? '#fff' : '#f9f5f0'` (white cards)
- Line 368: `background: block.enabled ? '#f0fdf4' : '#f5f5f5'` (light green/gray)
- Line 380: `background: '#fff'` (white dropdown)
- Line 603: `background: '#fff'` (white modal)
- Lines 718, 824, 853, 877, 898, 929: Multiple `background: '#fff'`

**What it should do:**
- Show protection score (0-100) with severity labels
- Show each benefit type (Death, TPD, ACI, ECI, Hospitalisation, PA, CareShield)
- Show recommended vs actual coverage with gap
- Allow adding/editing policies
- Match dark glassmorphism theme like every other module

**Fixes required:**
- Replace ALL `#fff` → `rgba(122,28,46,0.06)` with `border: '1px solid rgba(196,168,130,0.15)'`
- Replace `#f0e8e0` → `rgba(196,168,130,0.1)` (circle track)
- Replace `#f9f5f0`, `#f5f5f5`, `#f0fdf4` → dark equivalents
- Replace all dark-on-light text colors with light-on-dark

---

### 2. Stress Test (`StressTest.tsx`)

**FAILURE: Not meaningful. Data exists but doesn't tell a story.**

Screenshot confirms: the Stress Test shows a scenario builder and some cards below, but the output is just numbers ("Age 90+", "S$0") without human context. A client sitting with their advisor should FEEL the impact.

**What it should do:**
- Let user add life events (job loss, CI, TPD, death) — ✓ exists
- Show a NARRATIVE: "If you get Advanced CI at age 42, your savings run out at age 47 without insurance. With your policies, you survive to age 72. Insurance bought you 25 years."
- Show a VISUAL TIMELINE: horizontal bar with life phases, color-coded
- Show side-by-side comparison: WITHOUT vs WITH insurance
- Show per-event impact with specific years saved per event
- Make the chart and table SECONDARY (collapsible), narrative PRIMARY
- Reference design benchmarks from Notion link above

**Current problems:**
- Output just shows 4 stat cards with ages — not meaningful
- No narrative text explaining what the numbers mean for the client's life
- Year-by-year table shows 25 rows — overwhelming, should be filtered
- No clear "insurance bought you X years" hero metric prominently displayed
- The chart is fine technically but is the only visualization — needs a timeline bar

---

### 3. CPF Planning (`CPFPlanner.tsx`)

**BUG: S$0/yr top-up calculation**

Screenshot shows: "Contributing S$5,500/yr to SA now would increase your CPF Life payout by S$0/mo — that's S$0/yr more in retirement." This means `topupDelta` is computing to 0.

Root cause analysis (line 96):
```js
sa += annualContrib * SA_PCT + Math.min(annualTopup, RSTU_CASH_CAP)
```
The top-up is added to SA, but if `age <= 55` the SA gets transferred to RA at age 55. If the user is already past 55 or close, the RA formation at line 113-117 may not capture the additional SA correctly. Also, the `basePoints` and `topupPoints` may produce identical RA values if the top-up contribution is too small relative to existing SA balance.

**Additional issue: No BRS/FRS/ERS forecasting**
The user specifically asked: "Allow the user to forecast and see how hitting BRS, FRS, or ERS would look like for them."

Currently missing:
- BRS (Basic Retirement Sum) ~$106,500 (2025)
- FRS (Full Retirement Sum) ~$213,000 (2025)
- ERS (Enhanced Retirement Sum) ~$319,500 (2025)
- Visual showing where the user's projected RA sits relative to these thresholds
- What monthly CPF Life payout each tier would give them

**What it should do:**
- Fix the S$0 top-up bug
- Add BRS/FRS/ERS reference lines on the chart
- Show a comparison: "At your current trajectory, you'll hit FRS by age 53. ERS by age 58."
- Show what CPF Life payout each tier gives: "BRS → ~$870/mo, FRS → ~$1,480/mo, ERS → ~$2,110/mo"
- Dark theme is now applied (confirmed from screenshot) ✓

---

### 4. Retirement Analytics (`RetirementAnalytics.tsx`)

**FAILURE: Collapsible sections alone don't make it better**

The previous attempt added CollapsibleSection wrappers, but the user reports no visible improvement. The core problem isn't just information density — it's that the tool doesn't GUIDE the user. It throws 10 input controls at you and expects you to know what to do.

**What it should do:**
- Lead with the VERDICT (funded %, on/off track) — always visible
- Show the KEY NUMBER: "You need S$X,XXX/mo. You're investing S$Y,YYY/mo. You're Z% funded."
- Tri-lock solver should be the PRIMARY interaction, not buried
- Wealth chart should be prominent with milestone markers
- Input sections should be cleanly organized with clear labels
- Mobile-responsive (currently `300px 1fr` grid breaks)
- The chart needs better gradient styling aligned with the glassmorphism theme
- Procrastination section is powerful but secondary

**Key UX principle:** Show the answer first, then let the user explore inputs.

---

### 5. Cash Flow (`CashFlow.tsx`)

**FAILURE: User can't see their spending breakdown clearly**

The module shows categories with editable amounts and a pie chart, but the user reports they "can't see what they're spending on." The breakdown IS there but may not be prominent enough — categories are just small rows with tiny percentage bars.

**What it should do:**
- Show spending breakdown with LARGE, clear category cards (not just thin rows)
- Each category should show: label, amount, percentage of income, and visual bar
- Behavioral diagnosis: flag spending leaks (entertainment > 15%? shopping > 10%?)
- 50/30/20 comparison is there but may be below the fold
- Manual entry mode exists but user may not have found the "Manual" button
- Show actual spending vs recommended benchmarks per category

---

### 6. Cost of Waiting (`CostOfWaiting.tsx`)

**FAILURE: Limited scenarios, bad tooltip, insufficient years**

Currently shows only 3 fixed scenarios: Start Now, Wait 2 Years, Wait 5 Years. The user wants MORE years to illustrate the compounding effect.

**What it should do:**
- Show scenarios up to 10 years of delay (not just 0, 2, 5)
- Slider already exists (0 to `maxSlider`) but the CHART only shows 3 lines
- Make the chart show the slider delay dynamically — as you drag from 0-10 years, the chart updates
- Tooltip should show: "If you wait X years, you need S$Y,YYY more per month. Over your investing lifetime, that's S$Z,ZZZ extra."
- The `fmt()` function at line 84 uses `$` without `S` prefix — should be `S$`
- Verify the computation: `computePMT` looks correct but validate against known examples

---

### 7. LTC Gap Calculator (`LTCGapCalculator.tsx`)

**FAILURE: 10-year assumption is wrong**

`DURATION_YEARS = 10` is hardcoded. In reality, LTC can last much longer — the average duration varies but many cases extend 15-20+ years. The Ministry of Health Singapore doesn't cap care at 10 years.

**What it should do:**
- Make duration a user-adjustable slider (5 to 30 years)
- Default to a more realistic assumption (e.g., 15-20 years or "until age 90")
- The CareShield Plus coverage slider was added but the duration is still hardcoded
- Show the gap at different durations: "If you need care for 10 years: S$X gap. For 20 years: S$Y gap."
- CareShield Life actually pays for LIFE (as long as you're severely disabled), not 10 years — the calculator should reflect this

---

### 8. MPCI Benefits (`MPCIBuilder.tsx`)

**FAILURE: Pointless for client. Built for advisor, not client.**

This tool is a multi-pay CI scenario builder that lets you simulate multiple claims against different CI severity tiers. While technically interesting for an advisor doing product comparison, it provides zero value to a CLIENT because:

- A client doesn't know what MPCI II or Legacy plans are
- A client doesn't know how to estimate their sum assured
- The output is a technical claims table, not actionable advice
- There's no connection to the client's actual policies or coverage

**Options:**
1. **Remove it** — it clutters the sidebar and confuses clients
2. **Redesign it** — turn it into "What happens if I get CI twice?" with plain language, pulling from the client's actual benefit_blocks data
3. **Move it to advisor-only view** — keep it but hide it from client sidebar

---

### 9. BMI Calculator (`BMICalculator.tsx`)

**Status: Acceptable** — simple, focused, uses MOH Singapore thresholds. No critical issues.

---

### 10. Net Worth Tracker (`NetWorthTracker.tsx`)

**Status: Acceptable** — shows total assets. Could benefit from historical tracking over time but functional.

---

### 11. Financial Health Score (`FinancialHealthScore.tsx`)

**Status: Working** — clean visualization, scoring logic is reasonable.

---

### 12. Dashboard Home (`page.tsx`)

**Status: Needs improvement**
- Journey tracker was added but may not be rendering properly
- Should be the central hub guiding clients through their planning journey
- Quote card and advisor notes are nice touches

---

## CROSS-CUTTING FAILURES

### F1: Design Inconsistency
InsuranceBenefits is in full light mode. This is the most jarring inconsistency in the app. Every card is `#fff` with light borders.

### F2: No Guided Journey
Modules feel disconnected. A client doesn't know: "I've done my profile, now what?" The sidebar order and dashboard should create a clear flow: Profile → Health Score → Insurance → Stress Test → CPF → Retirement → Cash Flow.

### F3: Computation Bugs
- CPF top-up shows S$0/yr when it shouldn't
- CostOfWaiting `fmt()` uses `$` not `S$`
- LTC hardcodes 10 years when CareShield Life pays for life

### F4: Tools That Don't Serve The Client
- MPCI is advisor-facing, not client-facing
- Stress Test outputs numbers, not stories
- Retirement Analytics overwhelms instead of guiding

### F5: Missing Features
- CPF: No BRS/FRS/ERS forecasting
- CashFlow: Spending breakdown not prominent enough
- CostOfWaiting: Only 3 delay scenarios, need up to 10
- LTC: Duration should be adjustable, not hardcoded

---

## EXECUTION PLAN

### Priority 1: Fix Broken Things
1. **InsuranceBenefits dark mode conversion** — 13 `#fff` references to fix
2. **CPF top-up S$0 bug** — debug the `topupDelta` calculation
3. **LTC duration** — make it a slider (5-30 years), fix CareShield Life = lifetime assumption
4. **CostOfWaiting fmt()** — add `S` prefix

### Priority 2: Make Tools Meaningful
5. **Stress Test redesign** — narrative-first architecture with timeline bar, side-by-side comparison, human language
6. **CPF BRS/FRS/ERS** — add retirement sum tier forecasting with reference lines
7. **CashFlow spending visibility** — larger category cards, behavioral flagging, prominent breakdown
8. **CostOfWaiting** — expand to 10 delay scenarios, improve tooltip data

### Priority 3: Remove/Redesign Pointless Tools
9. **MPCI** — either remove from client view or redesign as "What if CI hits twice?" using actual policies

### Priority 4: Polish
10. **Retirement Analytics** — ensure collapsible sections actually work, answer-first layout
11. **Dashboard journey tracker** — verify rendering, connect steps to data completeness
12. **Mobile responsiveness** — test all modules at 375px/768px

---

## VERIFICATION
- `npx tsc --noEmit` — zero errors
- `npm run build` — clean build
- Visual: Every module should match dark glassmorphism (no white cards anywhere)
- Functional: CPF top-up calculates non-zero delta, LTC allows 5-30yr, CostOfWaiting shows 10 scenarios
- Mobile: Chrome DevTools at 375px for all modules

---

## FILES TO MODIFY
| Priority | File | Issue |
|----------|------|-------|
| P1 | `src/components/tools/InsuranceBenefits.tsx` | 13x `#fff` light mode |
| P1 | `src/components/tools/CPFPlanner.tsx` | S$0/yr top-up bug |
| P1 | `src/components/tools/LTCGapCalculator.tsx` | 10yr hardcoded, should be slider |
| P1 | `src/components/tools/CostOfWaiting.tsx` | `$` → `S$` in fmt() |
| P2 | `src/components/tools/StressTest.tsx` | Full narrative redesign |
| P2 | `src/components/tools/CPFPlanner.tsx` | Add BRS/FRS/ERS forecasting |
| P2 | `src/components/tools/CashFlow.tsx` | Prominent spending breakdown |
| P2 | `src/components/tools/CostOfWaiting.tsx` | 10 delay scenarios |
| P3 | `src/app/dashboard/mpci/page.tsx` | Remove or redesign |
| P3 | `src/components/tools/MPCIBuilder.tsx` | Remove or redesign |
| P4 | `src/components/tools/RetirementAnalytics.tsx` | Ensure collapsibles work, answer-first |
| P4 | `src/app/dashboard/page.tsx` | Verify journey tracker |
| — | `CLAUDE.md` | Add Notion reference link |
