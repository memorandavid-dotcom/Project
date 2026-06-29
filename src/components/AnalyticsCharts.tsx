import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { LineChart as LineIcon, Activity, Clock } from 'lucide-react';
import { QueueLengthLog, ResourceUtilizationLog } from '../types.js';
import { ThemeConfig } from '../theme.js';

interface AnalyticsChartsProps {
  queueHistory: QueueLengthLog[];
  utilizationHistory: ResourceUtilizationLog[];
  stageAverages: {
    verifyWait: number;
    verifyService: number;
    cashierWait: number;
    cashierService: number;
    biometricsWait: number;
    biometricsService: number;
  };
  activeTheme?: ThemeConfig;
}

export default function AnalyticsCharts({
  queueHistory,
  utilizationHistory,
  stageAverages,
  activeTheme,
}: AnalyticsChartsProps) {
  // Format data for stage timing comparison
  const timingData = [
    {
      name: 'Verification',
      'Wait Time': parseFloat(stageAverages.verifyWait.toFixed(2)),
      'Service Time': parseFloat(stageAverages.verifyService.toFixed(2)),
    },
    {
      name: 'Cashier Counter',
      'Wait Time': parseFloat(stageAverages.cashierWait.toFixed(2)),
      'Service Time': parseFloat(stageAverages.cashierService.toFixed(2)),
    },
    {
      name: 'Biometrics Stage',
      'Wait Time': parseFloat(stageAverages.biometricsWait.toFixed(2)),
      'Service Time': parseFloat(stageAverages.biometricsService.toFixed(2)),
    },
  ];

  // Custom chart tooltip styling
  const tooltipContentStyle = {
    backgroundColor: activeTheme ? (activeTheme.id === 'emerald-terminal' ? '#000000' : '#0a0915') : '#0f172a',
    borderColor: activeTheme ? (activeTheme.id === 'cyber-cosmic' ? '#312e81' : '#1e293b') : '#334155',
    borderRadius: '12px',
    color: activeTheme ? (activeTheme.id === 'emerald-terminal' ? '#10b981' : '#f8fafc') : '#f8fafc',
    fontSize: '12px',
    fontFamily: activeTheme?.fontClass === 'font-mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
  };

  const line1Color = activeTheme?.chartLine1 || '#38bdf8';
  const line2Color = activeTheme?.chartLine2 || '#eab308';
  const line3Color = activeTheme?.chartLine3 || '#a855f7';
  const waitColor = activeTheme?.chartBarWait || '#f43f5e';
  const serviceColor = activeTheme?.chartBarService || '#10b981';

  const cardStyle = activeTheme?.cardClass || 'bg-slate-900 border border-slate-800 shadow-lg';
  const headingColor = activeTheme ? activeTheme.textHeadingClass : 'text-slate-100';
  const mutedColor = activeTheme ? activeTheme.textMutedClass : 'text-slate-500';
  const gridStroke = activeTheme?.id === 'cyber-cosmic' ? '#1e1b4b' : activeTheme?.id === 'emerald-terminal' ? '#064e3b' : '#1e293b';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* 1. Queue Lengths over Time */}
      <div className={`${cardStyle} p-5 flex flex-col h-[350px] transition-all duration-350`}>
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <LineIcon className={`w-4 h-4 ${activeTheme ? activeTheme.accentTextClass : 'text-sky-400'}`} />
            <h4 className={`text-sm font-semibold ${headingColor}`}>Queue Length Timelines (Backlog)</h4>
          </div>
          <span className={`text-[10px] ${mutedColor} font-mono`}>0 - 480m window</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={queueHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="time"
                tickFormatter={(val) => `${Math.round(val)}m`}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
              />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipContentStyle} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="verify_queue"
                name="Verification Queue"
                stroke={line1Color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="cashier_queue"
                name="Cashier Queue"
                stroke={line2Color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="biometrics_queue"
                name="Biometrics Queue"
                stroke={line3Color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Resource Utilization */}
      <div className={`${cardStyle} p-5 flex flex-col h-[350px] transition-all duration-350`}>
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className={`text-sm font-semibold ${headingColor}`}>Busy Resources & Capacity Spikes</h4>
          </div>
          <span className={`text-[10px] ${mutedColor} font-mono`}>Simultaneous Servers Busy</span>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={utilizationHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorVerify" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line1Color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={line1Color} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCashier" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line2Color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={line2Color} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorBiometrics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line3Color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={line3Color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="time"
                tickFormatter={(val) => `${Math.round(val)}m`}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
              />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipContentStyle} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="verifiers_busy"
                name="Busy Verifiers"
                stroke={line1Color}
                fillOpacity={1}
                fill="url(#colorVerify)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="cashiers_busy"
                name="Busy Cashiers"
                stroke={line2Color}
                fillOpacity={1}
                fill="url(#colorCashier)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="biometrics_busy"
                name="Busy Biometrics"
                stroke={line3Color}
                fillOpacity={1}
                fill="url(#colorBiometrics)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Waiting vs Service Times */}
      <div className={`${cardStyle} p-5 flex flex-col h-[350px] xl:col-span-2 transition-all duration-350`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className={`w-4 h-4 ${activeTheme ? activeTheme.accentTextClass : 'text-indigo-400'}`} />
          <h4 className={`text-sm font-semibold ${headingColor}`}>Average Bottleneck Analysis: Wait Time vs. Service Time (Minutes)</h4>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timingData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="m" />
              <RechartsTooltip contentStyle={tooltipContentStyle} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Wait Time" fill={waitColor} radius={[6, 6, 0, 0]} barSize={40} />
              <Bar dataKey="Service Time" fill={serviceColor} radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
