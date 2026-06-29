import React from 'react';
import { Sliders, ShieldAlert, Users, Layers, Play, Settings2, Info } from 'lucide-react';
import { SimulationParams } from '../types.js';
import { ThemeConfig } from '../theme.js';

interface ParameterFormProps {
  isLoading: boolean;
  onRunSimulation: (params: SimulationParams) => void;
  defaultParams?: SimulationParams;
  activeTheme?: ThemeConfig;
}

export default function ParameterForm({
  isLoading,
  onRunSimulation,
  activeTheme,
}: ParameterFormProps) {
  // Setup local states with requested defaults
  const [verifiers, setVerifiers] = React.useState(3);
  const [cashiers, setCashiers] = React.useState(2);
  const [biometrics, setBiometrics] = React.useState(4);
  const [docFailure, setDocFailure] = React.useState(0.10);
  const [courtesyAlloc, setCourtesyAlloc] = React.useState(0.10);
  const [totalApplicants, setTotalApplicants] = React.useState(200);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunSimulation({
      verifiers,
      cashiers,
      biometrics,
      doc_failure_prob: docFailure,
      courtesy_alloc: courtesyAlloc,
      total_applicants: totalApplicants,
    });
  };

  const cardStyle = activeTheme?.cardClass || 'bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl';
  const headingColor = activeTheme ? activeTheme.textHeadingClass : 'text-slate-100';
  const mutedColor = activeTheme ? activeTheme.textMutedClass : 'text-slate-400';
  const accentText = activeTheme ? activeTheme.accentTextClass : 'text-sky-400';
  const borderStyle = activeTheme ? activeTheme.borderClass : 'border-slate-800';
  const badgeStyle = activeTheme ? activeTheme.badgeClass : 'bg-slate-800/80 text-sky-400 border border-slate-700/50';
  const buttonStyle = activeTheme ? activeTheme.btnPrimaryClass : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-950/40';

  return (
    <form id="simulation-form" onSubmit={handleSubmit} className={`${cardStyle} rounded-2xl p-6 h-full flex flex-col justify-between`}>
      <div className="space-y-6">
        {/* Title */}
        <div className={`flex items-center gap-2.5 pb-4 border-b ${borderStyle}`}>
          <Settings2 className={`w-5 h-5 ${accentText}`} />
          <h3 className={`font-semibold ${headingColor} text-base tracking-tight`}>
            Simulation Parameters
          </h3>
        </div>

        {/* Section 1: Resource Capacities */}
        <div className="space-y-4">
          <div className={`flex items-center gap-2 ${accentText}`}>
            <Layers className="w-4 h-4" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedColor}`}>
              Resource Capacities (Servers)
            </h4>
          </div>

          {/* Document Verifiers */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="verifiers" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Document Verifiers
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Priority Queue: Courtesy gets priority. Log-normal service times (mean=1.0m, σ=0.2).
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {verifiers}
              </span>
            </div>
            <input
              type="range"
              id="verifiers"
              min="1"
              max="10"
              step="1"
              value={verifiers}
              onChange={(e) => setVerifiers(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Cashier Counters */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="cashiers" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Cashier Counters
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Standard FIFO Queue. Exponential service times (mean=1.5m).
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {cashiers}
              </span>
            </div>
            <input
              type="range"
              id="cashiers"
              min="1"
              max="10"
              step="1"
              value={cashiers}
              onChange={(e) => setCashiers(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Biometric Stations */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="biometrics" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Biometric Stations
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Standard FIFO Queue. Triangular service times (min=4m, mode=5m, max=7m).
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {biometrics}
              </span>
            </div>
            <input
              type="range"
              id="biometrics"
              min="1"
              max="10"
              step="1"
              value={biometrics}
              onChange={(e) => setBiometrics(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Section 2: Operational Policies */}
        <div className={`space-y-4 pt-4 border-t ${borderStyle}`}>
          <div className={`flex items-center gap-2 ${accentText}`}>
            <Sliders className="w-4 h-4" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${mutedColor}`}>
              Operational Policies & Traffic
            </h4>
          </div>

          {/* Doc Failure Probability */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="docFailure" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Verification Failure Prob.
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Probability that an applicant fails verification and exits the system immediately.
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {Math.round(docFailure * 100)}%
              </span>
            </div>
            <input
              type="range"
              id="docFailure"
              min="0"
              max="1"
              step="0.01"
              value={docFailure}
              onChange={(e) => setDocFailure(parseFloat(e.target.value))}
              disabled={isLoading}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Courtesy Lane Allocation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="courtesyAlloc" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Courtesy Lane Allocation
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Percentage of applicants treated as priority courtesy cases (e.g., elderly, disabled, families).
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {Math.round(courtesyAlloc * 100)}%
              </span>
            </div>
            <input
              type="range"
              id="courtesyAlloc"
              min="0"
              max="1"
              step="0.01"
              value={courtesyAlloc}
              onChange={(e) => setCourtesyAlloc(parseFloat(e.target.value))}
              disabled={isLoading}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Total Daily Applicants */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="totalApplicants" className={`font-medium ${headingColor} flex items-center gap-1`}>
                Total Daily Applicants
                <span className="group relative cursor-help">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-sky-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-slate-950 text-[10px] text-slate-300 p-2 rounded-md shadow-lg border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 leading-relaxed">
                    Total applicants spawned exponentially across a 480-minute (8-hour) workday window.
                  </span>
                </span>
              </label>
              <span className={`font-mono font-bold px-2 py-0.5 rounded ${badgeStyle}`}>
                {totalApplicants}
              </span>
            </div>
            <input
              type="range"
              id="totalApplicants"
              min="50"
              max="1000"
              step="25"
              value={totalApplicants}
              onChange={(e) => setTotalApplicants(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Run Action Button */}
      <div className={`pt-6 border-t ${borderStyle} mt-6`}>
        <button
          type="submit"
          id="btn-run-simulation"
          disabled={isLoading}
          className={`w-full py-3.5 px-5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 text-sm ${
            isLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
              : buttonStyle
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Running Simulation...</span>
            </div>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current text-inherit" />
              <span>Run Discrete-Event Simulation</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
