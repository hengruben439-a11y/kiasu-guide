"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const phrases = ["your retirement.", "your legacy.", "your family.", "your future.", "your freedom."];

function RotatingText() {
  const [i, setI] = useState(0);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setI(p => (p + 1) % phrases.length); setVis(true); }, 500);
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      fontFamily: "'Playfair Display', serif",
      fontStyle: "italic",
      fontWeight: 400,
      color: "#7a1c2e",
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
      display: "inline-block",
    }}>{phrases[i]}</span>
  );
}

// Blurred dashboard mockup
function DashboardMockup() {
  return (
    <div style={{
      width: "100%",
      maxWidth: 680,
      margin: "0 auto",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 24px 60px rgba(42,31,26,0.14), 0 4px 20px rgba(122,28,46,0.06)",
      border: "1px solid rgba(122,28,46,0.08)",
      position: "relative",
    }}>
      {/* Blur overlay — subtle, no badge */}
      <div style={{
        position: "absolute", inset: 0,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "linear-gradient(to bottom, rgba(253,248,242,0.15) 0%, rgba(253,248,242,0.55) 100%)",
        zIndex: 2,
        borderRadius: 16,
      }}>
        {/* Watermark lock — bottom right, barely visible */}
        <div style={{
          position: "absolute", bottom: 14, right: 16,
          display: "flex", alignItems: "center", gap: 5,
          opacity: 0.22,
          pointerEvents: "none",
        }}>
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <rect x="1" y="5" width="8" height="7" rx="1.5" stroke="#7a1c2e" strokeWidth="1.2"/>
            <path d="M3 5V3.5a2 2 0 014 0V5" stroke="#7a1c2e" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 9, color: "#7a1c2e", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Members only</span>
        </div>
      </div>

      {/* Fake dashboard content underneath */}
      <div style={{ background: "#fdf8f2", padding: "0" }}>
        {/* Top bar */}
        <div style={{ background: "#2a1f1a", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#fdf8f2", fontFamily: "'Playfair Display', serif", fontSize: 15 }}>The Kiasu Guide</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["Dashboard","Tools","Profile"].map(n => (
              <div key={n} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 14px" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="mockup-body">
          {/* Sidebar */}
          <div className="mockup-sidebar" style={{ background: "#f5efe8", padding: "20px 16px", borderRight: "1px solid rgba(42,31,26,0.07)" }}>
            {["Financial Health","Stress Test","Retirement Gap","Critical Illness","LTC Calculator","Coffee Tool"].map((item, idx) => (
              <div key={item} style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 4,
                background: idx === 0 ? "rgba(122,28,46,0.08)" : "transparent",
                borderLeft: idx === 0 ? "2px solid #7a1c2e" : "2px solid transparent",
              }}>
                <span style={{ fontSize: 12, color: idx === 0 ? "#7a1c2e" : "#bbb", fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: idx === 0 ? 600 : 400 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div style={{ padding: "24px" }}>
            {/* Score cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
              {[["Health Score","74/100","#7a1c2e"],["Retirement Gap","S$312k","#a05020"],["CI Coverage","Partial","#c4a882"],["LTC Gap","S$2,290","#2a1f1a"]].map(([l,v,c]) => (
                <div key={l} style={{ background: "rgba(122,28,46,0.06)", border: "1px solid rgba(196,168,130,0.15)", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 10, color: "#ccc", margin: "0 0 4px", fontFamily: "'Cabinet Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>{l}</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: c, margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{v}</p>
                </div>
              ))}
            </div>
            {/* Fake chart bars */}
            <div style={{ background: "rgba(122,28,46,0.06)", border: "1px solid rgba(196,168,130,0.15)", borderRadius: 10, padding: "20px", height: 160, display: "flex", alignItems: "flex-end", gap: 8 }}>
              {[40,65,50,80,55,90,70,85,60,75,88,95].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === 11 ? "#7a1c2e" : `rgba(122,28,46,${0.1 + h/200})` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const coffeeTypes = [
  { name: "Kopitiam Kopi", sub: "Uncle's stall", price: 1.4 },
  { name: "Indie Café", sub: "Neighbourhood spot", price: 6.5 },
  { name: "Starbucks", sub: "Grande latte", price: 8.9 },
];

function buildData(daily: number, years: number) {
  const monthly = daily * 30;
  const r = 0.08 / 12;
  return Array.from({ length: years + 1 }, (_, y) => {
    const m = y * 12;
    const fv = m === 0 ? 0 : monthly * ((Math.pow(1 + r, m) - 1) / r);
    return { year: y, invested: Math.round(monthly * m), value: Math.round(fv) };
  });
}

const CTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fdf8f2", border: "1px solid #e8ddd0", borderRadius: 10, padding: "10px 14px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
      <p style={{ color: "#999", fontSize: 11, margin: "0 0 4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Year {label}</p>
      <p style={{ color: "#7a1c2e", fontWeight: 700, fontSize: 15, margin: "0 0 2px" }}>S${payload[0]?.value?.toLocaleString()}</p>
      <p style={{ color: "#bbb", fontSize: 12, margin: 0 }}>put in S${payload[1]?.value?.toLocaleString()}</p>
    </div>
  );
};

function Calculator() {
  const [coffee, setCoffee] = useState(1);
  const [cups, setCups] = useState(2);
  const [years, setYears] = useState(10);
  const daily = coffeeTypes[coffee].price * cups;
  const data = buildData(daily, years);
  const final = data[data.length - 1];
  const gain = final.value - final.invested;

  return (
    <div style={{
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(122,28,46,0.1)",
      borderRadius: 24,
      padding: "36px",
      boxShadow: "0 16px 48px rgba(122,28,46,0.1), 0 4px 16px rgba(42,31,26,0.06)",
    }}>
      <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 6px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>Cost of Waiting</p>
      <p style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 400, color: "#2a1f1a", margin: "0 0 6px" }}>The Daily Coffee Calculator</p>
      <p style={{ fontSize: 13, color: "#a89070", margin: "0 0 28px", lineHeight: 1.7, fontFamily: "'Cabinet Grotesk', sans-serif" }}>
        What if your daily coffee was building your future instead?
      </p>

      {/* Coffee selector */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 10px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>Your coffee habit</p>
        <div style={{ display: "flex", gap: 8 }}>
          {coffeeTypes.map((c, idx) => (
            <button key={idx} onClick={() => setCoffee(idx)} style={{
              flex: 1,
              background: coffee === idx ? "rgba(122,28,46,0.07)" : "rgba(255,255,255,0.6)",
              border: `1px solid ${coffee === idx ? "rgba(122,28,46,0.3)" : "rgba(42,31,26,0.08)"}`,
              borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center",
              transition: "all 0.18s ease",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: coffee === idx ? "#7a1c2e" : "#aaa", margin: "0 0 2px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{c.name}</p>
              <p style={{ fontSize: 10, color: "#ccc", margin: "0 0 4px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{c.sub}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: coffee === idx ? "#7a1c2e" : "#ccc", margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>S${c.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 22 }}>
        {[
          { label: "Cups per day", value: cups, set: setCups, min: 1, max: 5, step: 1, display: `${cups} cup${cups > 1 ? "s" : ""} · S$${(coffeeTypes[coffee].price * cups).toFixed(2)}/day` },
          { label: "Invest for", value: years, set: setYears, min: 5, max: 30, step: 1, display: `${years} years` },
        ].map(({ label, value, set, min, max, step, display }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c4a882", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#7a1c2e", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{display}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#7a1c2e", height: 3 }} />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 140, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7a1c2e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#7a1c2e" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4a882" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#c4a882" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: "#ccc", fontSize: 10, fontFamily: "'Cabinet Grotesk', sans-serif" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#ccc", fontSize: 10, fontFamily: "'Cabinet Grotesk', sans-serif" }} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v/1000)}k`} />
            <Tooltip content={<CTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#7a1c2e" strokeWidth={2} fill="url(#mG)" dot={false} />
            <Area type="monotone" dataKey="invested" stroke="#c4a882" strokeWidth={1} fill="url(#pG)" dot={false} strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cards */}
      <div className="grid-2col" style={{ gap: 10, marginBottom: 18 }}>
        <div style={{ background: "rgba(122,28,46,0.06)", border: "1px solid rgba(122,28,46,0.1)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 5px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>After {years} yrs</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#7a1c2e", margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>S${final.value.toLocaleString()}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(42,31,26,0.07)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 5px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>Growth</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#4a7c59", margin: 0, fontFamily: "'Cabinet Grotesk', sans-serif" }}>+S${gain.toLocaleString()}</p>
        </div>
      </div>

      <p style={{ fontSize: 10, color: "#d4c4b4", margin: "0 0 16px", fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.6 }}>
        Assumes 8% p.a. compounded monthly. Illustration only — not financial advice.
      </p>
      <a href="/register" style={{
        width: "100%", background: "#7a1c2e", border: "none", borderRadius: 10,
        color: "#fdf8f2", padding: "13px", fontSize: 13, fontWeight: 600,
        cursor: "pointer", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.04em",
        textDecoration: "none", display: "block", textAlign: "center", boxSizing: "border-box",
      }}>
        Speak with an advisor about your plan →
      </a>
    </div>
  );
}

const features = [
  { title: "Financial Stress Test", desc: "Run a simulated market crash or income disruption against your current financial setup. See exactly what breaks first — and what holds.", tag: "Interactive" },
  { title: "Retirement Gap Analysis", desc: "Stack your CPF, savings, and projected cashflow against what you'll actually need. The gap is usually bigger than people expect.", tag: "Calculator" },
  { title: "Critical Illness Scenario Builder", desc: "Model 37 CI conditions against your current coverage. See which scenario leaves your family exposed and by how much.", tag: "Scenario Builder" },
  { title: "Long-Term Care Gap", desc: "CareShield covers S$662/month. The average LTC cost is S$2,952. We show you the S$2,290 gap — and what fills it.", tag: "Gap Calculator" },
  { title: "Insurance Document Scanner", desc: "Upload your existing policies. Our AI reads them, extracts key coverage details, and surfaces gaps you've never noticed.", tag: "AI-Powered" },
];

// Disruption layout offsets
const cardLayouts = [
  { ml: "0%", mr: "15%", mt: 0 },
  { ml: "20%", mr: "0%", mt: -24 },
  { ml: "5%", mr: "20%", mt: 16 },
  { ml: "25%", mr: "0%", mt: -16 },
  { ml: "8%", mr: "18%", mt: 8 },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#fdf8f2", color: "#2a1f1a", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,300;1,400&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,600,700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #fdf8f2; }
        input[type=range] { appearance: none; -webkit-appearance: none; background: rgba(122,28,46,0.12); height: 3px; border-radius: 2px; outline: none; cursor: pointer; width: 100%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: #7a1c2e; border: 2px solid #fdf8f2; cursor: pointer; }
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "clamp(16px, 3vw, 26px) clamp(20px, 5vw, 60px)", position: "relative", zIndex: 20 }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, letterSpacing: "0.03em", color: "#2a1f1a", textDecoration: "none" }}>The Kiasu Guide</a>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <a href="#tools" style={{ fontSize: 13, color: "#a89070", fontFamily: "'Cabinet Grotesk', sans-serif", textDecoration: "none" }}>Tools</a>
          <a href="#about" style={{ fontSize: 13, color: "#a89070", fontFamily: "'Cabinet Grotesk', sans-serif", textDecoration: "none" }}>About</a>
          <a href="/login" style={{ fontSize: 13, color: "#a89070", fontFamily: "'Cabinet Grotesk', sans-serif", textDecoration: "none" }}>Log in</a>
          <a href="/register" style={{
            background: "#7a1c2e", border: "none", borderRadius: 8,
            color: "#fdf8f2", padding: "9px 22px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Cabinet Grotesk', sans-serif",
            textDecoration: "none", letterSpacing: "0.02em",
          }}>Get started →</a>
        </div>
      </nav>

      {/* ─── SECTION 1: HERO ─── */}
      <section style={{
        padding: "0 clamp(20px, 5vw, 60px)",
        textAlign: "center",
      }}>
        {/* Eyebrow */}
        <p style={{
          fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "#c4a882", margin: "0 0 24px",
          fontFamily: "'Cabinet Grotesk', sans-serif",
          position: "relative", zIndex: 1,
        }}>
          Financial clarity for Singapore residents
        </p>

        {/*
          TRUE 3-LAYER STACK using a positioned container.
          Heights are explicit so absolute children know where to go.

          TITLE    → absolute, top:0,      z-index:1
          DASHBOARD→ absolute, top:TITLE_H*0.82 (bites 18% of title), z-index:2
          ROTATING → absolute, bottom: ROTATING_OFFSET,               z-index:3
        */}
        <div style={{
          position: "relative",
          width: "100%",
          height: 620,          /* fixed canvas — tune if font sizes shift */
          overflow: "visible",
        }}>

          {/* ── LAYER 1: Title ── top-anchored, z=1 */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0, right: 0,
            zIndex: 1,
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 68px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              margin: 0,
              color: "#2a1f1a",
            }}>
              Are you truly prepared for
            </h1>
          </div>

          {/* ── LAYER 2: Dashboard ── starts at 68px (bites into bottom of title), z=2 */}
          <div style={{
            position: "absolute",
            top: 58,              /* title line-height ~76px, so 58 = hides bottom ~24% of title */
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(720px, 92%)",
            zIndex: 2,
          }}>
            <DashboardMockup />
          </div>

          {/* ── LAYER 3: Rotating words ── sits at dashboard bottom edge, z=3 */}
          <div style={{
            position: "absolute",
            top: 470,             /* ~58 (dashboard top) + ~430 (dashboard height) - 18px overlap */
            left: 0, right: 0,
            zIndex: 3,
            pointerEvents: "none",
          }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 5vw, 68px)",
              fontWeight: 400,
              lineHeight: 1.0,
              margin: 0,
              textShadow: "0 0 40px rgba(253,248,242,1), 0 0 80px rgba(253,248,242,0.95), 0 0 4px rgba(253,248,242,1)",
            }}>
              <RotatingText />
            </h1>
          </div>
        </div>

        {/* Hero CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", padding: "8px 0 0", position: "relative", zIndex: 4 }}>
          <a href="/register" style={{
            background: "#7a1c2e", border: "none", borderRadius: 10,
            color: "#fdf8f2", padding: "14px 32px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Cabinet Grotesk', sans-serif",
            boxShadow: "0 8px 24px rgba(122,28,46,0.28)",
            textDecoration: "none", display: "inline-block", letterSpacing: "0.03em",
          }}>
            Start your financial review →
          </a>
          <a href="/login" style={{
            background: "transparent",
            border: "1.5px solid rgba(42,31,26,0.18)", borderRadius: 10,
            color: "#2a1f1a", padding: "13px 28px", fontSize: 14, fontWeight: 500,
            cursor: "pointer", fontFamily: "'Cabinet Grotesk', sans-serif",
            textDecoration: "none", display: "inline-block",
          }}>
            Log in
          </a>
        </div>

        {/* Scroll cue */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.28, padding: "20px 0 32px", position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "'Cabinet Grotesk', sans-serif", color: "#7a1c2e" }}>Scroll to explore</span>
          <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #7a1c2e, transparent)" }} />
        </div>
      </section>

      {/* ─── SECTION 2: SALES LETTER + CALCULATOR ─── */}
      <section id="about" className="landing-about">

        {/* Left: Sales letter */}
        <div style={{ paddingTop: 20 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 20px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>Who this is for</p>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 400, lineHeight: 1.2, margin: "0 0 32px", letterSpacing: "-0.01em" }}>
            You work hard.<br />
            <span style={{ fontStyle: "italic", color: "#7a1c2e" }}>But is your money<br />working harder?</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              ["You've been meaning to sort your finances for years.", "But between work, family, and everything else — it keeps getting pushed to 'next month'. The problem is, next month has a price tag."],
              ["Most financial tools are built for advisors, not you.", "They're full of jargon, hidden assumptions, and numbers that don't feel real. We built this differently — starting with the question you actually need answered: what does your situation actually look like right now?"],
              ["This is not a sales pitch.", "There's nothing to buy here. Just honest tools that show you where you stand. If you want to talk to someone after — that option exists. But it's always your call."],
            ].map(([heading, body]) => (
              <div key={heading}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#2a1f1a", margin: "0 0 8px", fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.5 }}>{heading}</p>
                <p style={{ fontSize: 14, color: "#a89070", margin: 0, lineHeight: 1.85, fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 400 }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid rgba(42,31,26,0.07)", display: "flex", gap: 32 }}>
            {[["1 in 3","Singaporeans will face a critical illness in their lifetime"],["S$2,290","avg monthly LTC gap after CareShield"],["37","LIA-defined CI conditions covered by standard plans"]].map(([v,l]) => (
              <div key={v}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "#7a1c2e", margin: "0 0 4px" }}>{v}</p>
                <p style={{ fontSize: 11, color: "#ccc", margin: 0, lineHeight: 1.5, fontFamily: "'Cabinet Grotesk', sans-serif", maxWidth: 90 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Calculator */}
        <div style={{ position: "sticky", top: 40 }}>
          <Calculator />
        </div>
      </section>

      {/* ─── SECTION 3: FEATURE CARDS — DISRUPTION LAYOUT ─── */}
      <section id="tools" style={{ padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 60px) clamp(60px, 10vw, 120px)", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c4a882", margin: "0 0 16px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>The Toolbox</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, lineHeight: 1.2, margin: 0 }}>
            Five tools.<br /><span style={{ fontStyle: "italic", color: "#7a1c2e" }}>One clear picture.</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {features.map((f, idx) => {
            const layout = cardLayouts[idx % cardLayouts.length];
            return (
              <div key={f.title} style={{
                marginLeft: layout.ml,
                marginRight: layout.mr,
                marginTop: layout.mt,
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(122,28,46,0.08)",
                borderRadius: 18,
                padding: "28px 32px",
                boxShadow: `0 8px 32px rgba(122,28,46,0.08), 0 2px 8px rgba(42,31,26,0.06)`,
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 48px rgba(122,28,46,0.15), 0 4px 16px rgba(42,31,26,0.08)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(122,28,46,0.08), 0 2px 8px rgba(42,31,26,0.06)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, margin: 0, color: "#2a1f1a" }}>{f.title}</h3>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "#7a1c2e",
                    background: "rgba(122,28,46,0.07)", padding: "4px 12px",
                    borderRadius: 20, border: "1px solid rgba(122,28,46,0.12)",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    fontFamily: "'Cabinet Grotesk', sans-serif", marginLeft: 16,
                  }}>{f.tag}</span>
                </div>
                <p style={{ fontSize: 14, color: "#a89070", margin: 0, lineHeight: 1.75, fontFamily: "'Cabinet Grotesk', sans-serif" }}>{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: "center", marginTop: 72 }}>
          <p style={{ fontSize: 14, color: "#a89070", margin: "0 0 24px", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            All tools are free. No sign-up required to explore.
          </p>
          <a href="/register" style={{
            background: "#7a1c2e", border: "none", borderRadius: 10,
            color: "#fdf8f2", padding: "15px 40px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.04em",
            boxShadow: "0 8px 24px rgba(122,28,46,0.25)",
            textDecoration: "none", display: "inline-block",
          }}>
            Get started — it's free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(42,31,26,0.06)", padding: "24px clamp(20px, 5vw, 60px)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#ccc", fontFamily: "'Cabinet Grotesk', sans-serif" }}>© 2026 The Kiasu Guide · Singapore</span>
        <span style={{ fontSize: 11, color: "#ccc", fontFamily: "'Cabinet Grotesk', sans-serif" }}>For illustration only · Not financial advice</span>
      </div>
    </div>
  );
}
