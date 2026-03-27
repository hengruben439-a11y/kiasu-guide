# CLAUDE CODE SESSION PROMPT — The Kiasu Guide V1 Rebuild
# Copy and paste this entire document as your first message when rebooting the V1 project in Claude Code.
# This replaces the previous PRD in this Claude Code project. Use this as your primary reference.

---

You are rebuilding The Kiasu Guide — a financial advisory platform for a Singapore financial adviser named Noah. This is the V1 codebase (`kiasu-guide` repo). You are NOT starting from scratch. You are upgrading, fixing, and enhancing what already exists.

Read this entire prompt before touching a single file.

---

## THE ONE JOB THIS APP HAS

**Make a client's financial reality so visible, so personal, and so undeniable that action becomes obvious.**

Judge every decision against this sentence. If a feature, animation, or module doesn't make the client's financial reality more visible and personal, it does not belong in this session.

---

## WHAT THIS SESSION ACCOMPLISHES

You have two reference documents in this project:
1. `FMPRD.md` — the original V1 PRD (still valid for module specs not covered below)
2. `UpdatedPRDAddOn.md` — the add-on document (THIS WINS where anything conflicts)

This session focuses on five outcomes, in priority order:

1. **Infrastructure:** Reactivate Supabase, fix Resend, connect to Vercel
2. **Fix the PDF scanner** (insurance benefits + cash flow modules)
3. **Welcome animation** (cinematic first-login experience)
4. **Framer Motion overhaul** (every element smoother)
5. **Module bug fixes** (Stress Test, Retirement, CPF, LTC)

---

## WHAT YOU MUST NOT CHANGE

- **Typography.** Keep V1's existing fonts exactly as they are. Do not install or import new typefaces.
- **Colour palette.** Keep V1's dark emerald/green palette. Do not switch to burgundy.
- **Core architecture.** `client_profiles` remains the master record. `financial_profiles` is dropped/ignored.
- **Working features.** If a module is functioning correctly, apply animation improvements only — don't rewrite logic that isn't broken.

---

## STEP 0 — BEFORE ANYTHING ELSE: READ THE REPO

Run these in order and understand what currently exists:

```bash
# Check current file structure
find . -type f -name "*.tsx" | head -60
find . -type f -name "*.ts" | grep -v node_modules | head -40

# Check package.json for installed dependencies
cat package.json

# Check existing API routes
find ./src/app/api -type f 2>/dev/null || find ./app/api -type f 2>/dev/null

# Check Supabase migrations
ls supabase/migrations/ 2>/dev/null

# Check environment variables template
cat .env.example 2>/dev/null || cat .env.local.example 2>/dev/null
```

Do not assume anything about the file structure. Read it first.

---

## STEP 1 — INFRASTRUCTURE

### 1A. Supabase Reactivation

The Supabase project was paused. Before writing any feature code:

1. Confirm the project URL and anon key are in `.env.local`
2. Test the connection: write a simple test query against `client_profiles` and confirm it returns without error
3. Run any pending migrations: `supabase db push` or check the `supabase/migrations` folder and apply manually
4. Verify RLS policies are active: check that a test with a non-admin user cannot read another user's rows

If the Supabase project is still paused (connection fails), stop and tell me — I need to unpause it from the Supabase dashboard manually.

### 1B. Resend Email Fix

The Resend API keys were swapped. To fix:

1. Check `RESEND_API_KEY` in `.env.local` — confirm it's the current active key
2. Find the email sending function in the codebase (search for `resend` or `from: 'hello@thekiasuguide.com'`)
3. Send a test email to a safe test address using the current key
4. If it fails, flag the exact error — likely a domain verification issue or key mismatch

### 1C. Vercel Deployment

Connect this repo to Vercel so there's a live URL.

```bash
# If Vercel CLI is available:
vercel --prod

# Or guide through manual connection:
# 1. Push current code to GitHub (kiasu-guide repo)
# 2. Go to vercel.com → New Project → Import kiasu-guide repo
# 3. Set environment variables in Vercel dashboard
# 4. Deploy
```

**Environment variables to configure in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `NEXTAUTH_URL` (set to the Vercel deployment URL)

After deploying, update Supabase Auth settings:
- Add the Vercel URL to Allowed Redirect URLs
- Add the Vercel domain to CORS allowed origins

---

## STEP 2 — FIX THE PDF SCANNER

This is broken and must be fixed before any new features. The insurance benefits PDF upload and any cash flow PDF import are not working.

**First, find the broken route:**

```bash
# Search for the existing PDF scan route
grep -r "insurance-scan\|pdf\|formData\|multer" ./src/app/api --include="*.ts" -l
grep -r "insurance-scan\|pdf\|formData\|multer" ./app/api --include="*.ts" -l
```

**Then fix using this exact pattern:**

```typescript
// The correct implementation for the PDF scan API route
// Location: app/api/ai/insurance-scan/route.ts (or wherever the existing route is)

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json({
        error: 'Could not extract text from PDF. Ensure this is a text-based PDF, not a scanned image.'
      }, { status: 422 })
    }

    // Send extracted text to Claude
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an insurance policy document analyser for a Singapore financial adviser.

Extract the following from this insurance policy document and return ONLY valid JSON, no other text:

{
  "policy_name": "string",
  "insurer": "string",
  "benefit_type": "death|tpd|eci|aci|hospitalisation|personal_accident|careshield|endowment|ilp|multi_pay_ci",
  "coverage": number (SGD amount, numbers only),
  "payout_mode": "lump_sum|monthly|multi_pay",
  "expiry_age": number or null,
  "annual_premium": number or null,
  "key_exclusions": ["string"],
  "how_to_claim": "string",
  "special_conditions": "string",
  "confidence_score": number (0-100)
}

If you cannot determine a field, use null. Do not hallucinate values.

Policy document:
${pdfText.substring(0, 8000)}`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI could not parse policy structure' }, { status: 422 })
    }

    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json({ extracted, raw_preview: pdfText.substring(0, 300) })

  } catch (error) {
    console.error('Insurance scan error:', error)
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
  }
}
```

**Install pdf-parse if not present:**

```bash
npm install pdf-parse
npm install --save-dev @types/pdf-parse
```

**Test the fix:** Upload a real insurance PDF through the UI after implementing. Confirm the extracted fields populate the benefit block form correctly.

---

## STEP 3 — CINEMATIC WELCOME ANIMATION

**Location:** Create or update `components/WelcomeAnimation.tsx` (or wherever the first-login welcome screen lives).

**Trigger:** Only on first login. Gate on `onboarding_complete === false` OR a `has_seen_welcome` flag in `client_profiles` or `localStorage` (use the DB field if possible).

**Implementation:**

```typescript
// components/WelcomeAnimation.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface WelcomeAnimationProps {
  clientName: string
  onComplete: () => void
}

export function WelcomeAnimation({ clientName, onComplete }: WelcomeAnimationProps) {
  const [phase, setPhase] = useState(0)
  // 0=dark, 1=glow, 2=logo, 3=name, 4=subtitle, 5=cta

  useEffect(() => {
    const timings = [400, 1200, 2400, 4000, 5500, 7000]
    const timers = timings.map((t, i) =>
      setTimeout(() => setPhase(i + 1), t)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: '#0a0a0a' }}>

      {/* Radial glow pulse */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.2, 0.35] }}
            transition={{ duration: 3, times: [0, 0.3, 0.6, 1] }}
            style={{
              background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 text-center flex flex-col items-center gap-6">

        {/* Logo / Brand name */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Replace with actual logo if available */}
              <span style={{
                fontSize: '13px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500
              }}>
                THE KIASU GUIDE
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome headline */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                fontSize: 'clamp(28px, 5vw, 48px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.15,
                maxWidth: '600px'
              }}
            >
              Welcome to your financial plan,{' '}
              <span style={{ color: '#10b981' }}>{clientName}.</span>
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 400
              }}
            >
              Let's see exactly where you stand.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Divider line */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                height: '1px',
                width: '60px',
                background: 'rgba(16,185,129,0.4)',
                transformOrigin: 'left'
              }}
            />
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {phase >= 5 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onComplete}
              style={{
                marginTop: '8px',
                padding: '14px 36px',
                background: '#10b981',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                letterSpacing: '0.02em'
              }}
            >
              Get started →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Wire it up:** In the auth callback or first app load, check if `onboarding_complete = false` and `has_seen_welcome = false`. Show `WelcomeAnimation` before the onboarding flow. After the user clicks "Get started", mark `has_seen_welcome = true` and proceed.

---

## STEP 4 — FRAMER MOTION OVERHAUL

First, create the animation token file:

```typescript
// lib/animations.ts
export const EASE = [0.25, 0.1, 0.25, 1] as const

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: EASE }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: EASE }
}

export const slideFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: EASE }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.25, ease: EASE }
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } }
}

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE }
}
```

**Apply to every page:** Wrap each page's root `div` with `<motion.div {...fadeInUp}>`.

**Apply to cards:** Every card component gets `<motion.div {...fadeInUp} layout>` with `layoutId` for smooth reordering.

**Apply to modals:** `<motion.div {...scaleIn}>` on modal content.

**Apply to lists:** Wrap list containers with `<motion.div {...staggerContainer}>` and each list item with `<motion.div {...staggerItem}>`.

**Apply to number displays (hero figures):** Use this hook:

```typescript
// lib/hooks/use-count-up.ts
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

export function useCountUp(target: number, duration = 1.2) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => setDisplay(Math.round(v))
    })
    return controls.stop
  }, [target, duration])

  return display
}
```

Use this on: retirement corpus display, stress test runway age, health score number, any large hero S$ figure.

**Apply to charts (Recharts):**
Add to all Recharts chart components:
```tsx
<LineChart ... >
  <Line
    isAnimationActive={true}
    animationDuration={1000}
    animationEasing="ease-out"
    ...
  />
</LineChart>
```

**Sidebar navigation items:** Add `whileHover={{ x: 2 }}` and a `motion.div` left-border indicator with `layoutId="active-indicator"` for the active state.

**All primary buttons:** Add `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.

**Onboarding steps:** Wrap step content with `<AnimatePresence mode="wait">` and use `slideFromRight` for forward, reversed for back.

---

## STEP 5 — MODULE BUG FIXES

Fix these in order. Do not rewrite working modules. Fix only the specific broken behaviour.

### Bug Fix 1: Stress Test Simulation Cap

Find the stress test simulation loop. It is incorrectly capping at 10 years. Fix:

```typescript
// In the stress test calculation function
// Change: for (let year = 0; year <= 10; year++)
// To:     for (let year = 0; year <= 50; year++)

// Also ensure the loop breaks on savings depletion:
if (savings <= 0) {
  runwayYear = year
  break
}
```

### Bug Fix 2: Stress Test Scenario Binding

The scenario selector is not correctly passing the selected scenario to the simulation. Find the scenario state variable and trace it to the simulation function call. Ensure:
- `selectedScenario` state change triggers recalculation
- The simulation function receives the correct income drop and lump sum activations per scenario

### Bug Fix 3: CPF Toggle Not Wiring to Calculations

Search for `cpf_toggle` in the codebase. Find where it's stored and where the simulation functions read CPF balances. Ensure:
- When `cpf_toggle = false`, `cpf_oa`, `cpf_sa`, `cpf_ma` are treated as 0 in all calculations
- When `cpf_toggle = true`, balances are included

### Bug Fix 4: Retirement Planning — Solve-for-Time

The tri-lock solver breaks when "Time Needed" is the unlocked (computed) variable. Fix with an iterative approach:

```typescript
function solveForTime(
  currentSavings: number,
  monthlyInvestment: number,
  rateOfReturn: number,
  desiredMonthlyIncome: number,
  inflationRate: number,
  dividendYield: number
): number {
  for (let years = 1; years <= 50; years++) {
    const monthlyRate = Math.pow(1 + rateOfReturn, 1/12) - 1
    const savingsFV = currentSavings * Math.pow(1 + rateOfReturn, years)
    const investmentFV = monthlyRate > 0
      ? monthlyInvestment * (Math.pow(1 + monthlyRate, years * 12) - 1) / monthlyRate
      : monthlyInvestment * years * 12
    const projectedCorpus = savingsFV + investmentFV

    const adjustedIncome = desiredMonthlyIncome * Math.pow(1 + inflationRate, years)
    const requiredCorpus = (adjustedIncome * 12) / dividendYield

    if (projectedCorpus >= requiredCorpus) return years
  }
  return 50 // cap at 50 years
}
```

### Bug Fix 5: LTC CareShield 10-Year Cap

Find the LTC calculator logic. Remove the hardcoded 10-year limit. CareShield Life pays for the duration of the disability (lifetime if necessary). The calculator should:
- Let the user choose duration via slider (5–30 years)
- Model CareShield as a monthly income floor for the entire selected duration
- Default slider: 15 years (not 10)

### Bug Fix 6: S$ Prefix Consistency

Search codebase for `$` formatting that should be `S$`:
```bash
grep -r "fmt\|format\|toLocaleString\|currency" ./src --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Fix all currency formatting functions to use `S$` prefix.

---

## STEP 6 — VERIFY AND DEPLOY

After all fixes:

1. Run `npm run build` — confirm zero build errors
2. Run `npm run dev` — manually test every fixed module
3. Test PDF upload with a real insurance PDF
4. Test the welcome animation on a fresh login
5. Test Vercel deployment: push to `main`, confirm preview URL works
6. Test Supabase connection on the live Vercel URL
7. Send a test welcome email via Resend on the live URL

---

## RULES FOR THIS SESSION (NON-NEGOTIABLE)

1. **Read before writing.** Always check what exists before creating new files.
2. **Math before UI.** If fixing a calculation, write and verify the pure function first.
3. **Keep typography.** Do not touch font imports, font variables, or any CSS related to typefaces.
4. **Keep colour palette.** Emerald/dark stays. No burgundy.
5. **`pdf-parse` for PDF extraction.** Not raw binary. Not base64 strings.
6. **No `#fff` backgrounds.** All surfaces use the existing dark glass morphism tokens.
7. **Animations must not block.** Max 400ms before the screen is interactive.
8. **Test on mobile.** Every changed component is checked at 375px width.
9. **Verify the live URL.** Deployment is not done until the Vercel URL is working.
10. **One fix at a time.** Fix Step 1 fully before moving to Step 2. Do not mix concerns.

---

## QUICK REFERENCE: FILE LOCATIONS TO FIND

Before starting, find these and note their paths:

```bash
# Insurance PDF scan route
find . -path "*/api/*scan*" -o -path "*/api/*insurance*" 2>/dev/null

# Stress test calculation
find . -name "*.ts" | xargs grep -l "runway\|stress\|simulation" 2>/dev/null | grep -v node_modules

# Retirement calculation
find . -name "*.ts" | xargs grep -l "corpus\|retirement\|trilock\|tri.lock" 2>/dev/null | grep -v node_modules

# LTC / CareShield
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "careshield\|ltc\|long.term" 2>/dev/null | grep -v node_modules

# Currency formatting
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "formatCurrency\|fmt\|S\$" 2>/dev/null | grep -v node_modules
```

---

Begin with Step 0. Read the repo. Then proceed in order. Report what you find before writing any code.

---
---

# UpdatedPRDAddOn.md
# The Kiasu Guide — V1 Add-On PRD (Porting V2 Vision)
# Owner: Noah | Created: 27 March 2026
# Purpose: Port the best of V2's product philosophy, UX flow, and features into V1 (kiasu-guide repo). This document SUPPLEMENTS the existing FMPRD.md and Architecture Blueprint. It does NOT replace them. Where this document conflicts with older docs, THIS ONE WINS.

---

## WHY THIS DOCUMENT EXISTS

V2 was built to fix V1's shortcomings — duplicate data models, siloed tools, broken math, no design language. V2 solved those architectural problems on paper but produced a worse-looking, less functional app in practice.

The verdict: **go back to V1, but carry forward every good idea from V2's thinking.**

This document is exactly that transfer. It tells the V1 Claude Code session what has changed, what to absorb from V2, and what to leave alone.

---

## PART 1 — WHAT V2 GOT RIGHT (PORT THIS INTO V1)

### 1.1 The One Job Statement

Every build decision in V1 going forward is judged against this sentence:

> **Make a client's financial reality so visible, so personal, and so undeniable that action becomes obvious.**

This is not decorative. It is the filter. Before building any feature, the question is: does this make the client's financial reality more visible and more personal? If the answer is no, it doesn't belong in this session.

---

### 1.2 Product Principles (Absorb All of These)

These replace any prior principles in FMPRD.md where they differ:

1. **Narrative before numbers.** Every tool leads with a plain-English verdict sentence. Numbers and charts are below it.
2. **Connected, not siloed.** Insurance feeds Stress Test. Profile feeds Retirement. Cash Flow feeds Net Worth. Nothing is standalone.
3. **Plain English only.** No "corpus." No "ACO." No "bifurcated account structure." Write as if explaining to a 25-year-old.
4. **Answer first, inputs second.** The verdict is always visible at the top. Inputs are always below it.
5. **AI explains, humans decide.** AI layers are translation tools — they put numbers into plain language. They never replace Noah.
6. **Two modes, one app.** Every screen works both for a live advisory session with Noah AND for a client exploring at 11pm alone.
7. **Secure by default.** Row-level security enforced at database level. No client sees another client's data. Ever.
8. **Adviser controls access.** The Investment Cost Calculator is adviser-gated: only visible to a specific client if Noah explicitly unlocks it for them in the CRM.

---

### 1.3 Advisory Journey Architecture (Port This Structure)

V2 defined a 6-phase advisory journey. V1 should adopt this exact structure as its navigation and sidebar model.

```
Phase 1 — KNOW YOUR POSITION
  ├── Financial Profile (master data record)
  ├── CPF Overview
  └── BMI + Health Context

Phase 2 — FIND THE GAPS
  ├── Insurance Benefits (policy vault + PDF scanner + gap analysis)
  ├── LTC Gap Calculator
  └── Financial Stress Test ★ FLAGSHIP ★

Phase 3 — PLOT THE PATH
  ├── Retirement Planning (tri-solver)
  ├── Cost of Waiting
  └── CPF Planner

Phase 4 — UNDERSTAND THE TOOLS
  ├── Risk Appetite Profiler
  ├── Investment Cost Calculator (adviser-gated)
  └── Concepts Library

Phase 5 — OPTIMISE THE PLAN
  ├── Cash Flow Planner
  └── Net Worth Tracker

Phase 6 — THE RECOMMENDATION
  └── Session Summary
```

**Navigation model:** Left sidebar with phase headings as collapsible groups. Progress indicator per phase. Home Dashboard shows the full journey map with completion dots and a "Recommended Next" CTA. Module footer always shows "Next: [Module Name] →".

---

### 1.4 Onboarding — Cinematic Welcome Screen (Critical Port)

V2 introduced a full-screen cinematic welcome animation for first-time logins. This MUST be ported into V1.

**Spec:**

- Triggers only on first login (gate on `onboarding_complete = false`)
- Full-screen, no sidebar, no app chrome
- **Phase 1 — Dark open:** App loads to `--bg-base` background, completely blank
- **Phase 2 — Particle/glow pulse:** Framer Motion animated background pulse — a slow radial glow from centre (use the existing V1 emerald/green accent colour, NOT burgundy). Duration: ~2 seconds.
- **Phase 3 — Logo fade:** "The Kiasu Guide" wordmark fades in at centre. `opacity: 0 → 1`, `y: 10 → 0`. Duration: ~1 second.
- **Phase 4 — Welcome message:** Below the logo, the client's preferred name fades in: *"Welcome to your financial plan, [Name]."* Playfair Display / bold headline font. Duration: ~1.5 seconds.
- **Phase 5 — Subtitle:** A second line fades in below: *"Let's see exactly where you stand."* Lighter weight, secondary text colour. Duration: ~1 second.
- **Phase 6 — CTA appears:** "Get started →" button fades in and pulses gently. Duration: ~0.5 seconds.
- **Total sequence duration: ~8 seconds minimum** (V2's was too short — make this feel like arriving somewhere important)
- **After CTA click:** Smooth transition into the onboarding flow. No jarring cuts.

**Implementation note:** Use `framer-motion`'s `AnimatePresence` and `motion` components. The sequence is orchestrated with `delay` props on each phase. No external animation libraries needed.

---

### 1.5 Design System Alignment

V1's existing dark green/emerald palette is KEPT. Do NOT adopt V2's burgundy palette. V2's colour thinking (tip card colours, animation timing, card patterns) applies but using V1's colour tokens.

**V1 colour tokens to lock in:**
```css
--bg: #0a0a0a
--surface: rgba(255,255,255,0.03)
--border: rgba(255,255,255,0.10)
--accent: #10b981        /* emerald — keep this */
--accent-bright: #22c55e
--text-primary: #ffffff
--text-secondary: rgba(255,255,255,0.60)
--danger: #f59e0b        /* amber */
--info: #3b82f6          /* blue */
--cpf-note: #8b5cf6      /* purple */
--red: #ef4444
```

**Typography: KEEP V1'S EXISTING FONTS.** Do not change fonts. Do not import Playfair Display or Cabinet Grotesk unless they're already in V1. Use V1's current type system exactly as-is.

**What changes from V1's design:** Everything gets smoother. See Part 2 for animation spec.

---

### 1.6 Three Surfaces Architecture (Reinforce in V1)

| User | Surface | URL | Access |
|------|---------|-----|--------|
| Public | Landing page | `/` | Daily Coffee Calculator only |
| Client | Client platform | `/app/*` | Own profile + all unlocked tools |
| Noah | Admin CRM | `/admin/*` | All client data + CRM + gating controls |

These must be treated as completely separate surfaces. Admin is never visible to clients. The landing page has no login link.

---

### 1.7 Module Behaviour Rules (Port All of These)

**No "Calculate" buttons.** Every input change recalculates instantly (debounced 200ms). This is the feel difference between a calculator and a financial planning tool.

**S$ prefix rule.** `S$` is always a permanent visible label element beside the field — never a placeholder that disappears on focus.

**Charts always have hover tooltips.** Every data point must show precise values on hover. No decorative-only charts.

**Hero verdict always at the top.** The computed answer is above the inputs, always. Inputs are for adjusting.

**Auto-save on field change.** Financial Profile auto-saves on every field change, debounced 500ms.

**AI calls are always server-side.** API key never reaches the browser. All Claude API calls go through `/api/ai/*` routes.

---

### 1.8 LTC Gap Calculator — Critical Bug Fix (New from V2)

V1's LTC module has a hard-coded 10-year assumption for CareShield Life payouts. This is **factually wrong.**

**CareShield Life pays for LIFE** (as long as the claimant remains severely disabled). It is NOT capped at 10 years.

Fix: Model CareShield Life as a lifetime income floor, not a 10-year payout. Use the Singlife LTC White Paper 2025 (in project knowledge) for reference data:
- Average monthly LTC cost: S$2,952
- LTC cost inflation: 4% per annum
- Average duration of LTC claim: 8–10 years (use 10 years as default slider value, but allow 5–30 years)
- CareShield base payout: S$662/month base (escalates ~2% p.a., simplified to fixed for V1)

---

### 1.9 Vercel Deployment (New Requirement)

V1 must be deployed to Vercel as a live web app.

**Required steps:**
1. Push V1 codebase to GitHub (`kiasu-guide` repo)
2. Connect the `kiasu-guide` repo to Vercel
3. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
4. Set `NEXTAUTH_URL` or equivalent auth callback URL to the Vercel deployment URL
5. Update Supabase Auth settings: add Vercel deployment URL to allowed redirect URLs
6. Update Supabase Auth settings: add Vercel domain to CORS allowed origins

**Domain target:** `app.thekiasuguide.com` (configure as custom domain in Vercel once DNS is accessible)

**Preview deployments:** Vercel will create preview URLs for every `git push` — this is the staging environment. Do not merge to `main` until preview looks correct.

---

### 1.10 Supabase — Reactivation and Resend Keys

Before any feature work, the following must be resolved:

**Supabase:**
- The project was paused. Reactivate it from the Supabase dashboard.
- Run any pending migrations (check `supabase/migrations` directory).
- Verify RLS policies are intact post-reactivation.
- Verify `client_profiles` table is the master record — confirm `financial_profiles` is either dropped or ignored.

**Resend:**
- Email keys/settings were swapped. Reconfigure the Resend API key in environment variables.
- Verify `hello@thekiasuguide.com` is the sending domain.
- Test the welcome email sends correctly to a test address before marking this resolved.
- If domain verification has expired, re-verify the domain in Resend dashboard.

---

### 1.11 Insurance PDF Scanner — Bug Fix (Critical)

The PDF scanning feature for insurance benefits (and any cash flow PDF import) is broken. This must be fixed.

**Root cause analysis (likely candidates):**

1. **Multipart form handling:** The `/api/ai/insurance-scan` (or equivalent) route may not be correctly parsing multipart form data. Next.js App Router requires specific config: `export const config = { api: { bodyParser: false } }` is the Pages Router pattern — App Router uses `request.formData()` instead.

2. **PDF-to-text extraction:** The route may be sending binary PDF bytes directly to Claude instead of extracting text first. Fix: use `pdf-parse` or `pdfjs-dist` server-side to extract text from the PDF before passing to the Claude API. Claude's API does not directly parse PDF binary in text mode — send extracted text as a string in the prompt.

3. **File size limits:** Next.js has a 4MB default body size limit. Large PDF files will silently fail. Fix: add `export const maxDuration = 60` and configure the route to handle larger payloads.

4. **CORS / auth headers:** The upload request may be missing the Supabase auth token in headers, causing a 401 before the PDF even reaches the AI route.

**Correct implementation pattern for PDF scanning:**

```typescript
// app/api/ai/insurance-scan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const pdfData = await pdfParse(buffer)
    const pdfText = pdfData.text

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json({
        error: 'Could not extract text from PDF. Please ensure this is a text-based PDF, not a scanned image.'
      }, { status: 422 })
    }

    // Send extracted text to Claude
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an insurance policy document analyser for a Singapore financial adviser.

Extract the following from this insurance policy document and return ONLY valid JSON, no other text:

{
  "policy_name": "string",
  "insurer": "string",
  "benefit_type": "death|tpd|eci|aci|hospitalisation|personal_accident|careshield|endowment|ilp|multi_pay_ci",
  "coverage": number (SGD amount, numbers only),
  "payout_mode": "lump_sum|monthly|multi_pay",
  "expiry_age": number or null,
  "annual_premium": number or null,
  "key_exclusions": ["string"],
  "how_to_claim": "string",
  "special_conditions": "string",
  "confidence_score": number (0-100, how confident you are in the extraction)
}

If you cannot determine a field, use null. Do not hallucinate values.

Policy document text:
${pdfText.substring(0, 8000)}`
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Safe JSON parse
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI could not parse policy structure' }, { status: 422 })
    }

    const extracted = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      extracted,
      raw_text: pdfText.substring(0, 500) // first 500 chars for preview
    })

  } catch (error) {
    console.error('Insurance scan error:', error)
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
  }
}
```

**Cash flow PDF import:** Apply the same `request.formData()` → `pdf-parse` → text extraction → Claude pattern.

**Package to install:** `npm install pdf-parse @types/pdf-parse`

---

## PART 2 — ANIMATION OVERHAUL (FRAMER MOTION)

This is a major visual upgrade for V1. The existing V1 app is functional but static-feeling. Every element needs to breathe.

### 2.1 Install / Confirm

```bash
npm install framer-motion
```

Framer Motion is likely already in V1's `package.json`. Confirm and upgrade to latest if needed.

### 2.2 Global Animation Tokens

Define these as constants in `lib/animations.ts` and import everywhere:

```typescript
// lib/animations.ts
export const TRANSITION_DEFAULT = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
export const TRANSITION_SLOW = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
export const TRANSITION_SPRING = { type: 'spring', stiffness: 300, damping: 30 }

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: TRANSITION_DEFAULT
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: TRANSITION_DEFAULT
}

export const slideInFromRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: TRANSITION_DEFAULT
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: TRANSITION_DEFAULT
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
}
```

### 2.3 Where to Apply Animations

Apply `motion.div` with `fadeInUp` to:
- Every page on mount (wrap page root)
- Every card/panel on the page
- Every tool's result section when it updates
- Onboarding steps (slide in from right, exit to left)

Apply **count-up animation** to:
- All hero number displays (retirement corpus, stress test runway age, health score)
- Use `framer-motion`'s `useMotionValue` + `useTransform` + `animate` or a simple counter hook

Apply **staggered reveal** to:
- Lists of cards (benefit blocks list, client list in CRM, expense items)
- Use `staggerContainer` + `fadeInUp` per child

Apply **smooth chart reveals** to:
- All Recharts charts: animate line draw with `strokeDasharray` / `strokeDashoffset` technique or Recharts' built-in `isAnimationActive={true}` with longer `animationDuration`

Apply **smooth number transitions** on:
- Tri-lock solver outputs (retirement, stress test)
- Health score dial

Apply **modal/drawer animations** to:
- All modals: `scaleIn`
- Side drawers / slide-over panels: `x: '100%' → 0`

### 2.4 Sidebar Navigation Animations

- Active sidebar item: animated left border indicator (slide from top with spring)
- Phase group expand/collapse: `AnimatePresence` with height transition
- Sidebar itself on mobile: slide in from left

### 2.5 Micro-interactions

- Button hover: `whileHover={{ scale: 1.02 }}` on all primary CTAs
- Button press: `whileTap={{ scale: 0.98 }}`
- Input focus: border colour transition via CSS transitions (not Framer — keep this in CSS for performance)
- Toggle switches: spring animation on thumb
- Slider thumb: spring follow with `whileDrag`

### 2.6 Performance Rules

- Never animate `width` or `height` directly — use `scaleX` / `scaleY` or `layoutId`
- Use `will-change: transform` on animated elements via `style` prop
- Never block interaction during animation — all animations should not delay usability beyond 400ms
- Charts: only animate on first render, not on every data update

---

## PART 3 — MODULE UPDATES FROM V2

### 3.1 Financial Stress Test — Full V2 Spec

See `TKGV2_PRD.md` Section 7.6 for the complete spec. Summary of key changes to port into V1:

**Primary hero statement (always at top):**
> *"If you experience [event] at age [X], your savings run out at age [Y] without insurance. With your current policies, you're covered to age [Z]. Your insurance bought you [N] years."*

**Multi-pay CI logic must be modelled:**
- When client has multi-pay CI policy, model the claim waterfall (early CI → advanced CI → cooldown → max claims)
- Show plain English: "Your CI policy could pay out up to S$X across multiple claims"

**Bug fixes from V1 (critical):**
- Runway cap at 10 years → fix simulation loop to run to 50 years
- Scenarios not binding to selection → fix event binding
- CPF toggle not wiring to calculation → wire `cpf_toggle` field from profile
- Multi-pay CI not modelled → implement claim waterfall

**Output order (enforce this):**
1. Hero narrative ("Insurance bought you X years")
2. Cost-benefit framing ("That security costs S$X/month")
3. Policy attribution ("These policies changed your outcome")
4. Timeline of insurance events
5. AI Analysis button → 3 insights + 2 recommendations
6. Year-by-year table (collapsible)

### 3.2 Retirement Planning — V2 Tri-Lock Spec

**Hero at top (always):**
> *"You need S$[X] by age [retirement age]. You're projected to reach S$[Y]. You're [Z]% of the way there."*

**Stacked gap chart:**
1. CPF Life capitalised value (base layer)
2. Projected savings + investment growth
3. Gap layer (amber/red unfilled)
4. Horizontal target line

**Bug fixes:**
- Solve-for-Time solver was broken — implement correct iterative solver (see Architecture Blueprint v2.0 Part 4)
- Chart not interactive → add hover tooltips
- Inflation not compounding correctly → verify: `adjusted = desired × (1 + inflation)^years`

### 3.3 Cash Flow Planner — V2 Output Structure

Replace V1's thin-row expense list with **large category cards**:
- Each card: category name, S$ amount, % of income, visual fill bar, vs recommended benchmark
- Behavioural flags as amber tip cards (non-judgmental)
- 50/30/20 comparison section
- Comparison with declared Financial Profile expenses (flag if >15% discrepancy)

### 3.4 Insurance Benefits (Policy Vault) — V2 Coverage Summary Panel

Add a **Coverage Summary Panel** to the Insurance Benefits module:
- Protection score 0–100 with plain-English severity label
- Recommended vs actual for each benefit type
- Gap in amber/red with dollar amount
- Total annual premiums
- Flag if premium burden exceeds 15% of income

### 3.5 LTC Gap Calculator — New Module

If not yet in V1, add this module to Phase 2 (Find the Gaps), between Insurance Benefits and Stress Test.

Full spec: See `TKGV2_PRD.md` Section 7.5. The CareShield bug fix (Section 1.8 of this document) applies.

### 3.6 Session Summary Module — New Module

Add to Phase 6. Full spec: See `TKGV2_PRD.md` Section 7.15.

Three components:
1. AI Draft (button-triggered, streams summary of all tool outputs)
2. Noah's Notes (rich text, saved as `client_visible` case note)
3. Downloadable PDF (`@react-pdf/renderer`)

### 3.7 Financial Health Score — Always-Visible Dashboard Widget

Five-component score (0–100). Full spec: See `TKGV2_PRD.md` Section 7.16. Already in V1 conceptually — verify the five weights are implemented correctly:
- Protection adequacy: 30%
- Retirement readiness: 25%
- Liquidity buffer: 20%
- Debt-to-income ratio: 15%
- Investment consistency: 10%

---

## PART 4 — SUPABASE SCHEMA ADDITIONS

If V1's `client_profiles` table is missing these fields, add them via migration:

```sql
-- Add missing fields to client_profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS risk_profile text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS risk_score int;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS follow_up_note text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS referral_source text;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS client_tags text[];
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS last_session_date date;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS session_count int DEFAULT 0;

-- Add missing fields to case_notes
ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS session_date date;
ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS modules_covered text[];

-- Add benefit_blocks fields for multi-pay CI
ALTER TABLE benefit_blocks ADD COLUMN IF NOT EXISTS insurer text;
ALTER TABLE benefit_blocks ADD COLUMN IF NOT EXISTS annual_premium numeric;
ALTER TABLE benefit_blocks ADD COLUMN IF NOT EXISTS extraction_confidence int;
ALTER TABLE benefit_blocks ADD COLUMN IF NOT EXISTS extraction_raw jsonb;
ALTER TABLE benefit_blocks ADD COLUMN IF NOT EXISTS validated_by_noah boolean DEFAULT false;

-- Add session_summaries table if not exists
CREATE TABLE IF NOT EXISTS session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  meeting_format text, -- in_person, video, phone
  duration_minutes int,
  ai_summary text,
  noah_notes text,
  pdf_url text,
  key_numbers jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;
```

---

## PART 5 — WHAT TO IGNORE FROM V2

Do NOT port these from V2 into V1:

1. **Burgundy/cream colour palette** — Keep V1's emerald/dark palette
2. **Typography changes** — Keep V1's existing font system exactly
3. **Playfair Display / Cabinet Grotesk** — Don't import these unless already present
4. **Investment Cost Calculator (ILP fee modeller)** — Complex, out of scope for this sprint
5. **Risk Appetite Profiler trinity visual** — Defer to future sprint
6. **Concepts Library** — Defer to future sprint
7. **Net Worth Tracker historical chart** — Data model not set up for this yet

---

## PART 6 — BUILD PRIORITY ORDER

Do this in order. Do not skip ahead.

**Sprint 1 — Foundation and Infrastructure**
1. Reactivate Supabase, run migrations, verify RLS
2. Fix Resend email keys, test welcome email
3. Connect repo to Vercel, configure env vars, get `/` deploying cleanly
4. Fix the PDF scanner bug (Section 1.11 of this document)

**Sprint 2 — Welcome Animation and Onboarding**
5. Build the cinematic welcome animation (Section 1.4)
6. Verify onboarding flow is complete and smooth
7. Apply Framer Motion tokens across onboarding steps

**Sprint 3 — Framer Motion Overhaul**
8. Install/confirm `framer-motion`
9. Create `lib/animations.ts` with all tokens
10. Apply animations to: pages, cards, modals, sidebar, charts, number displays

**Sprint 4 — Module Bug Fixes**
11. Fix Stress Test simulation cap and scenario binding
12. Fix Retirement Planning tri-lock solve-for-time
13. Fix CPF toggle wiring
14. Fix LTC CareShield 10-year assumption
15. Fix S$ prefix consistency

**Sprint 5 — New Module Additions**
16. Coverage Summary Panel on Insurance Benefits
17. LTC Gap Calculator (if not present)
18. Session Summary module
19. Cash Flow card redesign (large cards, not thin rows)

---

## NON-NEGOTIABLE RULES FOR CLAUDE CODE (V1 SESSION)

1. **Keep the existing typography.** Do not change fonts or import new typefaces.
2. **Math before UI.** Write and verify calculation logic before touching components.
3. **One source of truth.** `client_profiles` is the master financial record. Nothing else.
4. **No Calculate buttons.** Recalculate on every input change (debounced 200ms).
5. **S$ always a label, never a placeholder.**
6. **All AI calls server-side.** API key never in browser.
7. **Charts always have hover tooltips.**
8. **Animations must not block interaction.** Maximum 400ms before a screen is usable.
9. **PDF scanner uses `pdf-parse` → text extraction → Claude API.** Not raw binary upload.
10. **Vercel deployment is a real deliverable.** Test on the live URL before marking done.
11. **Supabase reactivation is a prerequisite.** Do not build features against a paused database.
12. **Resend must be tested.** Send a real test email before marking the email system done.

---

*UpdatedPRDAddOn.md — Created 27 March 2026. Synthesised from TKGV2_PRD.md (tkgv2 repo), Architecture Blueprint v2.0, FMPRD.md, and product review session with Noah. Where this document conflicts with older docs, this one wins.*
