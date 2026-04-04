# Session Handoff — The Kiasu Guide
# Last active: 4 April 2026
# Status: Awaiting Noah's design direction decision

---

## WHERE WE ARE

Noah has reviewed **25 design mockups** across multiple rounds. He has NOT yet chosen a final direction. The next step is for Noah to pick a design (or combine elements) and then we implement it across the real app.

### Mockups live on Vercel (all at `kiasu-guide.vercel.app/mockups/`):

**Round 1 (basic, same layout different colors — Noah rejected):**
- `A-obsidian.html`, `B-aurora.html`, `C-ember.html`

**Round 2 (different layouts):**
- `1-bento.html` — Icon sidebar + asymmetric grid ✓ Noah liked this
- `2-command.html` — Three-panel control room
- `3-horizon.html` — No sidebar, top nav tabs
- `4-layers.html` — Floating glassmorphism panels ✓ Noah liked this
- `5-swiss.html` — Typography-only brutalist

**Round 3 (multi-page with charts):**
- `6-noir.html` — Copper glow lines, cinematic
- `7-neon.html` — Cyber green on grid paper
- `8-warm.html` — Terracotta, italic serif, floating pill sidebar ✓ Noah liked the sidebar
- `9-dense.html` — Bloomberg info wall, ticker
- `10-luxe.html` — Gradient color washes

**Round 4 (glassmorphism over atmosphere — Noah's reference screenshots):**
- `11-glass-city.html` — Dusk sky + cityscape
- `12-glass-gradient.html` — Abstract dark gradient
- `13-glass-texture.html` — Dark moody clouds

**Round 5 (realistic app feel — smart home reference):**
- `14-app-dark.html` — Warm dark, coral accent, toggles, gauges
- `15-app-hybrid.html` — Dark shell + white content cards
- `16-app-system.html` — Linear/Mercury ultra-clean

**Round 6 (real design system inspired):**
- `17-vercel.html` — shadcn/ui style
- `18-mercury.html` — No borders, purple, Mercury banking
- `19-stripe.html` — Dense Stripe dashboard

**Round 7 (elevated original identity):**
- `20-kiasu-elevated.html` — Original burgundy/gold + bento + floating sidebar + depth

**Round 8 (5 different philosophies — LATEST, awaiting review):**
- `A-narrative.html` — Story-first scrolling narrative, no sidebar
- `B-cockpit.html` — Bento command center, ⌘K command palette
- `C-advisor.html` — Split-panel (client context left, tool workspace right)
- `D-immersive.html` — 3-layer depth, atmospheric glass, burgundy/gold
- `E-clean.html` — Zero decoration, shade-only hierarchy

---

## WHAT NOAH HAS LIKED SO FAR

1. **Bento grid layout** (#1) — asymmetric, mixed tile sizes
2. **Floating glassmorphism panels** (#4) — atmospheric depth
3. **Floating pill sidebar** (#8) — detached from edge, rounded
4. **Real UI controls** (#14) — toggles, gauges, segmented pickers
5. **His original burgundy/gold/Playfair identity** — always had personality
6. **Smart home app reference** — mixed card sizes, real photos/icons, dense but organized
7. **Glassmorphism over atmosphere** — frosted glass on rich backgrounds

---

## WHAT NOAH DOESN'T WANT

1. Color swaps on the same layout
2. Flat/boring minimalism (the Vercel/Mercury/Stripe copies were too plain)
3. Template-looking designs (chunky 28px radius, all same card sizes)
4. AI-looking designs (too symmetrical, too decorative, no real data)

---

## PENDING DECISION

Noah needs to review the Round 8 mockups (A through E) and tell us:
- Which design philosophy to implement
- OR which elements from different mockups to combine

---

## COMPLETED WORK (already in the real app)

### Sprint 6 (29 feature items — ALL COMPLETE):
- Financial Profile: 8 tabs → 5 tabs, flex-wrap
- Insurance: dark mode fixes, policy dates, riders UI, hospitalisation/PA payout
- LTC: auto-loads coverage, surplus display, duration-responsive headline
- Stress Test: 4 preset cards, CPF toggle, multi-pay CI, net worth simulation
- Retirement: scenario tabs, per-scenario dividends, Save to Profile, BRS/FRS/ERS
- CPF Planner: CPF Life formula fix, ERS cap detection, tier selector
- Cost of Waiting: two-scenario view
- Net Worth: liabilities integration
- Session Summary: 5-paragraph AI prompt
- Cash Flow: expandable line items
- Sidebar: Financial Overview reordered, MPCI removed

### Sprint 7 (mobile + polish — ALL COMPLETE):
- Global 480px breakpoint for grid collapse
- Touch-friendly slider thumbs (22px gold)
- 7 pages got maxWidth 1100
- Insurance coverage table horizontal scroll
- PolicyReminders + PolicyVault dark mode conversion
- fmtSGD negative number fix
- Framer Motion: Card hover glow, sidebar animated expand, chart draw-in animations
- Unified count-up hooks (5 local → 1 shared)

### Bug fixes:
- LTC Gap: headline now shows monthly amount, color follows totalGap
- LTC Gap: removed animation (was causing infinite growth loop)
- Retirement: CPF MA excluded from NAV trajectory
- Retirement: portfolio_value added to currentSavings
- Financial Profile: duplicate liabilities section removed
- Report page: "corpus" → "savings" in labels, dark wrapper for SessionSummary

---

## KEY FILES

### Layout & Navigation:
- `src/components/layout/Sidebar.tsx` — Phase nav with animated expand/collapse
- `src/components/layout/PageWrapper.tsx` — Route transitions
- `src/components/layout/AppShell.tsx` — Main layout shell
- `src/app/globals.css` — Design tokens, grid breakpoints, slider styles

### Tools (each is a major component):
- `src/components/tools/StressTest.tsx`
- `src/components/tools/RetirementAnalytics.tsx`
- `src/components/tools/CPFPlanner.tsx`
- `src/components/tools/CashFlow.tsx`
- `src/components/tools/InsuranceBenefits.tsx`
- `src/components/tools/LTCGapCalculator.tsx`
- `src/components/tools/NetWorthTracker.tsx`
- `src/components/tools/CostOfWaiting.tsx`
- `src/components/tools/SessionSummary.tsx`
- `src/components/tools/PolicyReminders.tsx`
- `src/components/tools/PolicyVault.tsx`
- `src/components/tools/FinancialHealthScore.tsx`

### Shared:
- `src/lib/animations.ts` — Framer Motion tokens
- `src/lib/styles.ts` — Shared card styles + formatSGD
- `src/lib/hooks/use-count-up.ts` — Unified count-up animation
- `src/lib/tools/retirement/calculations.ts` — All retirement math
- `src/types/index.ts` — TypeScript interfaces

### Database:
- `supabase/migrations/` — 9 migration files
- Schema: client_profiles, benefit_blocks, policy_riders, expense_categories, expense_items, session_summaries, health_score_history, documents, policy_reminders, case_notes, net_worth_items

---

## HOW TO RESUME

1. Ask Noah which design direction he's chosen from the Round 8 mockups
2. Once decided, create an implementation plan to apply that design across the entire app
3. The implementation will touch: globals.css (tokens), Sidebar.tsx (navigation), AppShell.tsx (layout), PageWrapper.tsx, and every tool component's card/section styling
4. Build passes clean (`pnpm build` — zero errors)
5. All mockups are in `public/mockups/` (static HTML, no impact on the app)

---

## DEPLOYMENT

- GitHub: `hengruben439-a11y/kiasu-guide`
- Vercel: auto-deploys from `main` branch
- Live URL: `kiasu-guide.vercel.app`
- Supabase: connected, RLS active
