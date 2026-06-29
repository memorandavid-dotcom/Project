export interface ThemeConfig {
  id: string;
  name: string;
  bgClass: string;
  headerClass: string;
  cardClass: string;
  btnPrimaryClass: string;
  badgeClass: string;
  accentTextClass: string;
  borderClass: string;
  textMutedClass: string;
  textHeadingClass: string;
  chartLine1: string; // verification
  chartLine2: string; // cashier
  chartLine3: string; // biometrics
  chartBarWait: string;
  chartBarService: string;
  fontClass: string;
  glowClass: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'slate-frost',
    name: '1. Slate Frost (Classic)',
    bgClass: 'bg-slate-950 text-slate-100',
    headerClass: 'bg-slate-900 border-b border-slate-800 text-slate-100',
    cardClass: 'bg-slate-900/60 border border-slate-800/85 shadow-lg',
    btnPrimaryClass: 'bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md border border-sky-500/20 active:scale-[0.99] transition-all cursor-pointer',
    badgeClass: 'bg-sky-950/80 border border-sky-500/20 text-sky-400',
    accentTextClass: 'text-sky-400',
    borderClass: 'border-slate-800',
    textMutedClass: 'text-slate-400',
    textHeadingClass: 'text-slate-100',
    chartLine1: '#38bdf8', // Sky 400
    chartLine2: '#eab308', // Yellow 500
    chartLine3: '#a855f7', // Purple 500
    chartBarWait: '#f43f5e', // Rose 500
    chartBarService: '#10b981', // Emerald 500
    fontClass: 'font-sans',
    glowClass: ''
  },
  {
    id: 'emerald-terminal',
    name: '2. Emerald Grid (Cyberpunk Green)',
    bgClass: 'bg-black text-emerald-400 font-mono selection:bg-emerald-500/20',
    headerClass: 'bg-neutral-950 border-b border-emerald-950 text-emerald-400 font-mono',
    cardClass: 'bg-black border border-emerald-900/80 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all duration-300',
    btnPrimaryClass: 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold border border-emerald-500/50 shadow-md active:scale-[0.99] transition-all cursor-pointer',
    badgeClass: 'bg-emerald-950/80 border border-emerald-500/35 text-emerald-300',
    accentTextClass: 'text-emerald-400',
    borderClass: 'border-emerald-950',
    textMutedClass: 'text-emerald-600',
    textHeadingClass: 'text-emerald-400',
    chartLine1: '#10b981', // Emerald
    chartLine2: '#14b8a6', // Teal
    chartLine3: '#22c55e', // Green
    chartBarWait: '#ef4444', // Red
    chartBarService: '#10b981', // Emerald
    fontClass: 'font-mono',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]'
  },
  {
    id: 'cyber-cosmic',
    name: '3. Cyber Cosmic (Neon Dark)',
    bgClass: 'bg-[#030211] text-slate-100 selection:bg-fuchsia-500/20',
    headerClass: 'bg-slate-950/90 border-b border-indigo-900/40 text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.5)]',
    cardClass: 'bg-neutral-950/50 border border-indigo-950/70 backdrop-blur-sm shadow-[0_0_18px_rgba(99,102,241,0.07)] hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] hover:border-indigo-900/50 transition-all duration-300',
    btnPrimaryClass: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-violet-400/20 active:scale-[0.99] transition-all duration-300 cursor-pointer',
    badgeClass: 'bg-indigo-950/80 border border-indigo-500/30 text-indigo-300',
    accentTextClass: 'text-fuchsia-400',
    borderClass: 'border-indigo-950/60',
    textMutedClass: 'text-indigo-300/65',
    textHeadingClass: 'text-indigo-50',
    chartLine1: '#f472b6', // Pink 400
    chartLine2: '#c084fc', // Violet 400
    chartLine3: '#22d3ee', // Cyan 400
    chartBarWait: '#f43f5e', // Rose 500
    chartBarService: '#06b6d4', // Cyan 500
    fontClass: 'font-sans',
    glowClass: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] border-indigo-500/30'
  },
  {
    id: 'solar-amber',
    name: '4. Solar Amber (Warm Editorial)',
    bgClass: 'bg-stone-950 text-stone-100 selection:bg-amber-500/20',
    headerClass: 'bg-stone-900 border-b border-stone-800 text-stone-100',
    cardClass: 'bg-stone-900/70 border border-stone-800/80 shadow-md hover:shadow-lg transition-all duration-300',
    btnPrimaryClass: 'bg-amber-700 hover:bg-amber-600 text-stone-100 font-semibold shadow-md active:scale-[0.99] border border-amber-600/20 transition-all cursor-pointer',
    badgeClass: 'bg-amber-950/60 border border-amber-500/25 text-amber-400',
    accentTextClass: 'text-amber-500',
    borderClass: 'border-stone-800/80',
    textMutedClass: 'text-stone-400',
    textHeadingClass: 'text-stone-100',
    chartLine1: '#f59e0b', // Amber 500
    chartLine2: '#f97316', // Orange 500
    chartLine3: '#ef4444', // Red 500
    chartBarWait: '#ea580c', // Dark Orange
    chartBarService: '#d97706', // Bronze
    fontClass: 'font-sans',
    glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.08)]'
  },
  {
    id: 'steel-minimalist',
    name: '5. Steel Mono (High Contrast)',
    bgClass: 'bg-zinc-950 text-zinc-100 selection:bg-zinc-800',
    headerClass: 'bg-zinc-900 border-b border-zinc-800 text-zinc-100',
    cardClass: 'bg-zinc-900/90 border border-zinc-800/80 shadow-sm hover:border-zinc-700 transition-all duration-300',
    btnPrimaryClass: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold shadow-sm active:scale-[0.99] transition-all cursor-pointer',
    badgeClass: 'bg-zinc-800 border border-zinc-700 text-zinc-300',
    accentTextClass: 'text-zinc-100',
    borderClass: 'border-zinc-800',
    textMutedClass: 'text-zinc-400',
    textHeadingClass: 'text-zinc-100',
    chartLine1: '#f4f4f5', // Zinc 100
    chartLine2: '#a1a1aa', // Zinc 400
    chartLine3: '#71717a', // Zinc 500
    chartBarWait: '#e4e4e7', // Zinc 200
    chartBarService: '#3f3f46', // Zinc 700
    fontClass: 'font-sans',
    glowClass: 'border-zinc-400/40'
  }
];
