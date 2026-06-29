import { Trash2, History, Database, ArrowRight } from 'lucide-react';
import { ThemeConfig } from '../theme.js';

interface HistorySidebarProps {
  runs: any[];
  activeRunId: string | null;
  onSelectRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  onOpenDbConsole: () => void;
  activeTheme?: ThemeConfig;
}

export default function HistorySidebar({
  runs,
  activeRunId,
  onSelectRun,
  onDeleteRun,
  onOpenDbConsole,
  activeTheme,
}: HistorySidebarProps) {
  const isTerminal = activeTheme?.id === 'emerald-terminal';
  const sidebarBg = activeTheme?.id === 'cyber-cosmic' ? 'bg-[#060419]' : isTerminal ? 'bg-black' : 'bg-slate-900';
  const borderStyle = activeTheme ? activeTheme.borderClass : 'border-slate-800';
  const headingColor = activeTheme ? activeTheme.textHeadingClass : 'text-slate-100';
  const mutedColor = activeTheme ? activeTheme.textMutedClass : 'text-slate-400';
  const accentText = activeTheme ? activeTheme.accentTextClass : 'text-sky-400';

  return (
    <div className={`w-full lg:w-80 flex-shrink-0 ${sidebarBg} border-r ${borderStyle} flex flex-col h-full overflow-hidden text-slate-300 transition-all duration-355`}>
      {/* Title */}
      <div className={`p-4 border-b ${borderStyle} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <History className={`w-5 h-5 ${accentText}`} />
          <h2 className={`font-semibold ${headingColor} tracking-tight`}>Run History</h2>
        </div>
        <span className={`text-xs bg-slate-800/60 ${mutedColor} px-2 py-1 rounded-full font-mono`}>
          {runs.length} runs
        </span>
      </div>

      {/* Database Viewer shortcut */}
      <div className={`p-3 border-b ${borderStyle}`}>
        <button
          onClick={onOpenDbConsole}
          id="btn-db-console"
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/10 hover:bg-slate-800/30 text-xs ${accentText} border ${borderStyle} hover:border-indigo-500/35 rounded-lg transition-all duration-200 cursor-pointer`}
        >
          <span className="flex items-center gap-2 font-medium">
            <Database className="w-3.5 h-3.5" />
            MySQL Live Schema Inspector
          </span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <History className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
            <p className="text-sm">No historical runs yet</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Set parameters and run your first discrete-event simulation.
            </p>
          </div>
        ) : (
          runs.map((run) => {
            const isActive = run.run_id === activeRunId;
            const date = new Date(run.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isActiveCosmic = activeTheme?.id === 'cyber-cosmic';
            const activeBorderColor = isActiveCosmic ? 'border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]' : isTerminal ? 'border-emerald-500' : 'border-sky-500';

            return (
              <div
                key={run.run_id}
                id={`run-item-${run.run_id}`}
                className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `bg-indigo-950/20 ${activeBorderColor} ${headingColor} shadow-md`
                    : `bg-slate-800/10 border-transparent hover:border-${activeTheme ? 'indigo-900/40' : 'slate-750'} hover:bg-slate-800/20 text-slate-300`
                }`}
                onClick={() => onSelectRun(run.run_id)}
              >
                <div className="flex justify-between items-start gap-2 pr-6">
                  <div>
                    <p className={`font-mono text-[10px] ${accentText} font-bold tracking-wider uppercase`}>
                      ID: {run.run_id.substring(4, 12)}...
                    </p>
                    <p className={`text-xs ${mutedColor} mt-0.5`}>{timeStr}</p>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRun(run.run_id);
                    }}
                    id={`btn-delete-${run.run_id}`}
                    className="absolute top-3.5 right-3 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    title="Delete run logs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Micro parameters badges */}
                <div className={`grid grid-cols-3 gap-1 mt-3 text-[10px] bg-slate-900/30 p-1.5 rounded-md border ${borderStyle} text-slate-400 font-mono`}>
                  <div className={`text-center border-r ${borderStyle}`}>
                    <span className="block text-slate-500 uppercase text-[8px]">V/C/B</span>
                    {run.parameters.verifiers}/{run.parameters.cashiers}/{run.parameters.biometrics}
                  </div>
                  <div className={`text-center border-r ${borderStyle}`}>
                    <span className="block text-slate-500 uppercase text-[8px]">Fail</span>
                    {Math.round(run.parameters.doc_failure_prob * 100)}%
                  </div>
                  <div className="text-center">
                    <span className="block text-slate-500 uppercase text-[8px]">Apps</span>
                    {run.parameters.total_applicants}
                  </div>
                </div>

                {/* Aggregated outcome preview */}
                <div className={`flex justify-between items-center mt-2.5 pt-2 border-t ${borderStyle} text-[11px] font-medium text-slate-300`}>
                  <span>Avg Wait:</span>
                  <span className={`${accentText} font-mono font-bold`}>{run.avg_wait_time.toFixed(2)}m</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
