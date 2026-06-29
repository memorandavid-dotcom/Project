import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ThemeConfig } from '../theme.js';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple';
  activeTheme?: ThemeConfig;
}

const colorMap = {
  blue: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    glow: 'shadow-sky-950/10 hover:shadow-sky-500/5',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-950/10 hover:shadow-emerald-500/5',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-950/10 hover:shadow-amber-500/5',
  },
  indigo: {
    text: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    glow: 'shadow-indigo-950/10 hover:shadow-indigo-500/5',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-950/10 hover:shadow-rose-500/5',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-950/10 hover:shadow-purple-500/5',
  }
};

export default function KpiCard({ title, value, subValue, icon: Icon, color, activeTheme }: KpiCardProps) {
  const styles = colorMap[color];
  const cardStyle = activeTheme ? activeTheme.cardClass : 'bg-slate-900 border border-slate-800 shadow-md';
  const textMuted = activeTheme ? activeTheme.textMutedClass : 'text-slate-500';
  const textHeading = activeTheme ? activeTheme.textHeadingClass : 'text-slate-100';

  return (
    <div className={`${cardStyle} p-5 rounded-2xl flex items-center justify-between transition-all duration-300 ${styles.glow} group`}>
      <div className="space-y-1.5">
        <span className={`text-xs font-semibold tracking-wider uppercase ${textMuted}`}>
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${textHeading} font-mono tracking-tight`}>
            {value}
          </span>
          {subValue && (
            <span className={`text-xs ${textMuted} font-medium`}>
              {subValue}
            </span>
          )}
        </div>
      </div>
      <div className={`p-3 rounded-xl ${styles.bg} ${styles.border} border transition-colors group-hover:bg-indigo-500/10`}>
        <Icon className={`w-5 h-5 ${styles.text}`} />
      </div>
    </div>
  );
}
