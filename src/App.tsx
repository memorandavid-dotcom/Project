import React from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  FileX,
  AlertCircle,
  HelpCircle,
  Database,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Download,
  Terminal,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { SimulationParams, SimulationResult, AgentType, AgentStatus } from './types.js';
import ParameterForm from './components/ParameterForm.js';
import KpiCard from './components/KpiCard.js';
import AnalyticsCharts from './components/AnalyticsCharts.js';
import AgentLogsTable from './components/AgentLogsTable.js';
import HistorySidebar from './components/HistorySidebar.js';
import DbConsole from './components/DbConsole.js';
import { THEMES, ThemeConfig } from './theme.js';

// Status rotation phrases to display during asynchronous simulation run
const RUNNING_PHRASES = [
  'Booting discrete-event simulation timeline...',
  'Generating daily applicant exponential arrival distribution...',
  'Mapping priority queues at Document Verification counters...',
  'Processing cashier FIFO exponential service intervals...',
  'Simulating biometric stations via triangular sampling...',
  'Bulk saving event logs to MySQL RunLogs...',
  'Compiling analytical performance aggregates...'
];

export default function App() {
  const [activeTheme, setActiveTheme] = React.useState<ThemeConfig>(THEMES[2]); // Default to Design 3: Cyber Cosmic!
  const [runs, setRuns] = React.useState<any[]>([]);
  const [activeRun, setActiveRun] = React.useState<any | null>(null);
  const [activeRunLogs, setActiveRunLogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = React.useState(false);
  
  // Custom alerts for last runs
  const [lastCompletedRunSummary, setLastCompletedRunSummary] = React.useState<{
    run_id: string;
    total_processed: number;
    avg_wait_time: number;
  } | null>(null);

  // Derived state to keep graphs visible during simulation loading
  const displayRun = activeRun || (isLoading ? {
    run_id: 'SIM-RUNNING-PLACEHOLDER',
    avg_wait_time: 0,
    total_processed: 0,
    completion_count: 0,
    verification_fail_count: 0,
    avg_total_system_time: 0,
    parameters: { doc_failure_prob: 0.10 },
    queue_history: Array.from({ length: 24 }, (_, i) => ({ time: i * 20, verify_queue: 0, cashier_queue: 0, biometrics_queue: 0 })),
    utilization_history: Array.from({ length: 24 }, (_, i) => ({ time: i * 20, verifiers_busy: 0, cashiers_busy: 0, biometrics_busy: 0 })),
    avg_verify_wait: 0,
    avg_verify_service: 0,
    avg_cashier_wait: 0,
    avg_cashier_service: 0,
    avg_biometrics_wait: 0,
    avg_biometrics_service: 0,
  } : null);

  const displayRunLogs = activeRunLogs.length > 0 ? activeRunLogs : (isLoading ? Array.from({ length: 10 }, (_, i) => ({
    run_id: 'SIM-RUNNING-PLACEHOLDER',
    agent_id: 1000 + i,
    agent_type: 'Scheduled' as AgentType,
    status: 'completed' as AgentStatus,
    arrival_time: i * 5,
    departure_time: i * 5 + 10,
    total_time_in_system: 10,
    verify_wait_start: 0,
    verify_service_start: 0,
    verify_service_end: 5,
    verify_wait_time: 0,
    verify_service_time: 5,
    cashier_wait_start: 5,
    cashier_service_start: 5,
    cashier_service_end: 8,
    cashier_wait_time: 0,
    cashier_service_time: 3,
    biometrics_wait_start: 8,
    biometrics_service_start: 8,
    biometrics_service_end: 10,
    biometrics_wait_time: 0,
    biometrics_service_time: 2,
    initial_wait_time: 0,
  })) : []);

  // Fetch runs on mount
  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
        if (data.length > 0 && !activeRun) {
          // Select newest run by default
          loadDetailedRun(data[data.length - 1].run_id);
        }
      }
    } catch (err) {
      console.error('Error fetching historical runs:', err);
    }
  };

  React.useEffect(() => {
    fetchRuns();
  }, []);

  // Interval rotation for loading phrases
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % RUNNING_PHRASES.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Load a single detailed run
  const loadDetailedRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data.analytics);
        setActiveRunLogs(data.analytics.logs || []);
        setErrorMsg(null);
      } else {
        setErrorMsg('Failed to retrieve full logs for this run.');
      }
    } catch (err) {
      console.error('Error loading detailed run logs:', err);
      setErrorMsg('Error contacting Express backend. Please verify your connection.');
    }
  };

  // Run the discrete-event simulation
  const handleRunSimulation = async (params: SimulationParams) => {
    setIsLoading(true);
    setLoadingPhraseIndex(0);
    setErrorMsg(null);
    setLastCompletedRunSummary(null);

    try {
      // Execute post request to relative API route which will route to port 3000
      const res = await fetch('/api/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const summary = await res.json();
        setLastCompletedRunSummary({
          run_id: summary.run_id,
          total_processed: summary.total_processed,
          avg_wait_time: summary.avg_wait_time,
        });

        // Re-fetch all runs and select the newly completed one
        await fetchRuns();
        await loadDetailedRun(summary.run_id);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'The simulation endpoint returned an error status.');
      }
    } catch (err: any) {
      console.error('Connection failure during simulation run:', err);
      setErrorMsg(
        'Unable to establish connection to the backend. Please ensure the Express full-stack service is running and accessible on port 3000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a specific run logs
  const handleDeleteRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRuns((prev) => prev.filter((r) => r.run_id !== runId));
        if (activeRun && activeRun.run_id === runId) {
          setActiveRun(null);
          setActiveRunLogs([]);
        }
        if (lastCompletedRunSummary && lastCompletedRunSummary.run_id === runId) {
          setLastCompletedRunSummary(null);
        }
      }
    } catch (err) {
      console.error('Error deleting run logs:', err);
    }
  };

  // Export current active logs as CSV
  const exportLogsAsCsv = () => {
    if (!activeRunLogs || activeRunLogs.length === 0) return;

    const headers = [
      'Agent ID',
      'Type',
      'Status',
      'Arrival (Min)',
      'Total System Time',
      'Initial Wait Time',
      'Verify Wait',
      'Verify Service',
      'Cashier Wait',
      'Cashier Service',
      'Biometrics Wait',
      'Biometrics Service',
    ];

    const rows = activeRunLogs.map((log) => [
      log.agent_id,
      log.agent_type,
      log.status,
      log.arrival_time.toFixed(4),
      log.total_time_in_system.toFixed(4),
      log.initial_wait_time.toFixed(4),
      log.verify_wait_time.toFixed(4),
      log.verify_service_time.toFixed(4),
      log.cashier_wait_time !== null ? log.cashier_wait_time.toFixed(4) : 'N/A',
      log.cashier_service_time !== null ? log.cashier_service_time.toFixed(4) : 'N/A',
      log.biometrics_wait_time !== null ? log.biometrics_wait_time.toFixed(4) : 'N/A',
      log.biometrics_service_time !== null ? log.biometrics_service_time.toFixed(4) : 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `simulation_report_${activeRun?.run_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col h-screen w-screen ${activeTheme.bgClass} ${activeTheme.fontClass} text-slate-100 overflow-hidden transition-all duration-300`}>
      {/* Top Banner Header */}
      <header className={`flex-shrink-0 ${activeTheme.id === 'cyber-cosmic' ? 'bg-[#060419]' : activeTheme.id === 'emerald-terminal' ? 'bg-black' : 'bg-slate-900'} border-b ${activeTheme.borderClass} px-6 py-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl border border-indigo-400/20 shadow-md">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${activeTheme.textHeadingClass} flex items-center gap-2`}>
              Consular Processing Simulation
              <span className={`text-[10px] uppercase font-mono ${activeTheme.id === 'emerald-terminal' ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-400' : 'bg-indigo-950/80 border-indigo-500/20 text-indigo-400'} font-bold px-2 py-0.5 rounded-full tracking-wider`}>
                Discrete-Event
              </span>
            </h1>
            <p className={`text-xs ${activeTheme.textMutedClass} mt-0.5`}>
              Discrete-event queuing modeling: Log-normal Verification, Exponential Cashiers, and Triangular Biometrics.
            </p>
          </div>
        </div>

        {/* Visual Design Preset Switcher - Interactive layout selection! */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/85 max-w-full">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 font-mono tracking-wider">Design System:</span>
          {THEMES.map((theme) => {
            const isSelected = activeTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setActiveTheme(theme)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold tracking-tight transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.25)] scale-102'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/45'
                }`}
              >
                {theme.id === 'cyber-cosmic' ? '✨ ' : ''}{theme.name}
              </button>
            );
          })}
        </div>

        {/* Action Header Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">REST API:</span>
            <span className="text-emerald-400 font-bold">Online</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">MySQL Model:</span>
            <span className="text-indigo-400 font-bold">Active</span>
          </div>
        </div>
      </header>

      {/* Main Container Core */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar History */}
        <HistorySidebar
          runs={runs}
          activeRunId={activeRun?.run_id || null}
          onSelectRun={loadDetailedRun}
          onDeleteRun={handleDeleteRun}
          onOpenDbConsole={() => setIsConsoleOpen(true)}
          activeTheme={activeTheme}
        />

        {/* Mid Panel Workspace scroll */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Success summary notification block after running simulation */}
          {lastCompletedRunSummary && (
            <div className={`${activeTheme.cardClass} border-emerald-500/35 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in`}>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/10 mt-0.5 sm:mt-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Simulation Run Successfully Executed & Logged
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Logged parameters to <code className="text-sky-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">SimulationParameters</code> and agent logs to <code className="text-sky-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">RunLogs</code> tables.
                  </p>
                </div>
              </div>

              {/* Exact output parameter summary */}
              <div className="flex flex-wrap gap-4 text-xs font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 w-full sm:w-auto">
                <div className="border-r border-slate-800/80 pr-4">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Run ID</span>
                  <span className="text-sky-400 font-bold">
                    {lastCompletedRunSummary.run_id.substring(4, 12)}...
                  </span>
                </div>
                <div className="border-r border-slate-800/80 pr-4">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Processed</span>
                  <span className="text-emerald-400 font-bold">
                    {lastCompletedRunSummary.total_processed} agents
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Avg Wait</span>
                  <span className="text-amber-400 font-bold">
                    {lastCompletedRunSummary.avg_wait_time.toFixed(3)}m
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Connection Error Notification */}
          {errorMsg && (
            <div className="bg-rose-950/30 border border-rose-500/35 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-100">Execution Connection Failure</h4>
                <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                  {errorMsg}
                </p>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <button
                    onClick={() => handleRunSimulation({
                      verifiers: 3,
                      cashiers: 2,
                      biometrics: 4,
                      doc_failure_prob: 0.10,
                      courtesy_alloc: 0.10,
                      total_applicants: 200
                    })}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Retry with standard values
                  </button>
                  <button
                    onClick={() => setErrorMsg(null)}
                    className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-lg transition-all cursor-pointer"
                  >
                    Dismiss Warning
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Grid split into Config vs Main Report */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Input parameters */}
            <div className="lg:col-span-1">
              <ParameterForm isLoading={isLoading} onRunSimulation={handleRunSimulation} activeTheme={activeTheme} />
            </div>

            {/* Right: Results Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {/* If loading simulation state, show progress banner at top of dashboard */}
              {isLoading && (
                <div className={`${activeTheme.cardClass} p-5 rounded-2xl border-indigo-500/35 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-sm animate-fade-in transition-all duration-300`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 border-4 border-slate-850 border-t-indigo-500 rounded-full animate-spin`}></div>
                      <Terminal className={`w-4 h-4 ${activeTheme.accentTextClass} absolute top-3 left-3 animate-pulse`} />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${activeTheme.textHeadingClass}`}>Simulation Engine Processing...</h4>
                      <p className={`text-xs ${activeTheme.textMutedClass} font-mono mt-0.5`}>{RUNNING_PHRASES[loadingPhraseIndex]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-3 py-1 bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 font-mono font-semibold rounded-full uppercase tracking-wider animate-pulse">
                      Live Running
                    </span>
                  </div>
                </div>
              )}

              {displayRun ? (
                /* Report View */
                <div className={`space-y-6 animate-fade-in ${isLoading ? "opacity-60 pointer-events-none filter blur-[0.5px]" : ""} transition-all duration-300`}>
                  {/* KPI Panels Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <KpiCard
                      title="Average Wait Time"
                      value={`${displayRun.avg_wait_time.toFixed(2)} min`}
                      subValue="Queue delays"
                      icon={Clock}
                      color="amber"
                      activeTheme={activeTheme}
                    />
                    <KpiCard
                      title="Processed Applicants"
                      value={displayRun.total_processed}
                      subValue={`${displayRun.completion_count || 0} complete`}
                      icon={Users}
                      color="blue"
                      activeTheme={activeTheme}
                    />
                    <KpiCard
                      title="Verification Failures"
                      value={displayRun.verification_fail_count}
                      subValue={`${Math.round((displayRun.parameters?.doc_failure_prob || 0) * 100)}% fail rate`}
                      icon={FileX}
                      color="rose"
                      activeTheme={activeTheme}
                    />
                    <KpiCard
                      title="System Time Average"
                      value={`${(displayRun.avg_total_system_time || 0).toFixed(1)} min`}
                      subValue="Entry to exit"
                      icon={CheckCircle}
                      color="emerald"
                      activeTheme={activeTheme}
                    />
                  </div>

                  {/* Charts */}
                  <AnalyticsCharts
                    queueHistory={displayRun.queue_history || []}
                    utilizationHistory={displayRun.utilization_history || []}
                    stageAverages={{
                      verifyWait: displayRun.avg_verify_wait || 0,
                      verifyService: displayRun.avg_verify_service || 0,
                      cashierWait: displayRun.avg_cashier_wait || 0,
                      cashierService: displayRun.avg_cashier_service || 0,
                      biometricsWait: displayRun.avg_biometrics_wait || 0,
                      biometricsService: displayRun.avg_biometrics_service || 0,
                    }}
                    activeTheme={activeTheme}
                  />

                  {/* Detailed event log and export controls */}
                  <div className="space-y-4">
                    <div className={`flex flex-col sm:flex-row gap-4 justify-between sm:items-center ${activeTheme.cardClass} p-4 rounded-xl transition-all duration-300`}>
                      <div>
                        <h4 className={`text-xs font-bold ${activeTheme.textHeadingClass}`}>Run ID Context Logs</h4>
                        <p className={`text-[10px] ${activeTheme.textMutedClass} font-mono mt-0.5`}>{displayRun.run_id}</p>
                      </div>
                      {activeRunLogs.length > 0 && (
                        <button
                          onClick={exportLogsAsCsv}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-800/10 border ${activeTheme.borderClass} hover:border-indigo-500/30 hover:text-white text-slate-300 rounded-lg transition-all duration-200 cursor-pointer w-fit`}
                          title="Download raw report as CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export Raw CSV
                        </button>
                      )}
                    </div>

                    <AgentLogsTable logs={displayRunLogs} activeTheme={activeTheme} />
                  </div>
                </div>
              ) : (
                /* No data landing layout */
                <div className={`${activeTheme.cardClass} rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] transition-all duration-300`}>
                  <Layers className={`w-12 h-12 ${activeTheme.accentTextClass} mb-4 opacity-40`} />
                  <h3 className={`font-bold ${activeTheme.textHeadingClass} text-base`}>No Active Simulation Report</h3>
                  <p className={`text-xs ${activeTheme.textMutedClass} mt-2 max-w-sm leading-relaxed`}>
                    Set resource counts, priority ratios, failure probabilities in the left parameter panel, and boot your discrete event simulation timeline to analyze statistics.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 items-center justify-center">
                    <button
                      onClick={() => handleRunSimulation({
                        verifiers: 3,
                        cashiers: 2,
                        biometrics: 4,
                        doc_failure_prob: 0.10,
                        courtesy_alloc: 0.10,
                        total_applicants: 200,
                      })}
                      className={`px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/25 border ${activeTheme.borderClass} hover:border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-300 cursor-pointer transition-all duration-200`}
                    >
                      Load Default 200-Applicant Demo
                    </button>
                    <button
                      onClick={() => setIsConsoleOpen(true)}
                      className={`px-4 py-2 bg-indigo-950/20 hover:bg-indigo-950/45 border ${activeTheme.borderClass} ${activeTheme.accentTextClass} rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200`}
                    >
                      Inspect SQL Tables & Schemas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Database Schema Slide up/down Drawer/Modal Console */}
      {isConsoleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl animate-scale-up">
            <DbConsole
              runId={activeRun?.run_id || null}
              onClose={() => setIsConsoleOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Footer system details */}
      <footer className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-6 py-3 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          <span>Agent-Based Consular Model • Discrete-Event Queue Engine</span>
        </div>
        <div className="flex gap-4 font-mono">
          <span>Stochastic Seeds: Math.random() (uniform)</span>
          <span>Timeline: t=0 to 480m</span>
        </div>
      </footer>
    </div>
  );
}
