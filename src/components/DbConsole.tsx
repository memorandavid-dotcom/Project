import React from 'react';
import { Database, Table, Terminal, Copy, Check, Play, RefreshCw, FileText } from 'lucide-react';

interface DbConsoleProps {
  onClose: () => void;
  runId: string | null;
}

const SCHEMA_SQL = `CREATE DATABASE dfa_simulation;
USE dfa_simulation;

CREATE TABLE SimulationParameters (
    run_id VARCHAR(50) PRIMARY KEY,
    verifiers INT NOT NULL,
    cashiers INT NOT NULL,
    biometrics INT NOT NULL,
    doc_failure_prob FLOAT NOT NULL,
    courtesy_alloc FLOAT NOT NULL,
    total_applicants INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE RunLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(50),
    agent_id INT NOT NULL,
    agent_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    initial_wait_time FLOAT NOT NULL,
    total_time_in_system FLOAT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES SimulationParameters(run_id) ON DELETE CASCADE
);`;

export default function DbConsole({ onClose, runId }: DbConsoleProps) {
  const [activeTab, setActiveTab] = React.useState<'schema' | 'parameters' | 'logs'>('schema');
  const [copied, setCopied] = React.useState(false);
  const [dbData, setDbData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [sqlQuery, setSqlQuery] = React.useState('');
  const [queryResult, setQueryResult] = React.useState<any>(null);

  const fetchDbViewer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db-viewer');
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
      }
    } catch (err) {
      console.error('Error loading db logs:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDbViewer();
    if (runId) {
      setSqlQuery(`SELECT * FROM RunLogs WHERE run_id = '${runId}' LIMIT 5;`);
    } else {
      setSqlQuery(`SELECT run_id, total_applicants, avg_wait_time FROM SimulationParameters;`);
    }
  }, [runId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run a client-side SQL parser emulator on our actual retrieved DB!
  const runQueryEmulator = () => {
    if (!dbData) return;
    const queryClean = sqlQuery.trim().toLowerCase().replace(/;/g, '');
    
    try {
      // 1. SELECT * FROM SimulationParameters
      if (queryClean.startsWith('select') && queryClean.includes('simulationparameters')) {
        setQueryResult({
          columns: ['run_id', 'verifiers', 'cashiers', 'biometrics', 'doc_failure_prob', 'courtesy_alloc', 'total_applicants', 'timestamp'],
          rows: dbData.SimulationParameters.map((p: any) => [
            p.run_id, p.verifiers, p.cashiers, p.biometrics, p.doc_failure_prob, p.courtesy_alloc, p.total_applicants, p.timestamp
          ]),
          message: `${dbData.SimulationParameters.length} rows returned successfully.`
        });
      }
      // 2. SELECT * FROM RunLogs
      else if (queryClean.startsWith('select') && queryClean.includes('runlogs')) {
        let logsFiltered = dbData.RunLogs;
        
        // Check for specific run_id filter
        const runIdMatch = queryClean.match(/run_id\s*=\s*'([^']+)'/);
        if (runIdMatch) {
          const matchedId = runIdMatch[1];
          logsFiltered = dbData.RunLogs.filter((l: any) => l.run_id === matchedId);
        }

        // Limit clause
        let limit = 10;
        const limitMatch = queryClean.match(/limit\s+(\d+)/);
        if (limitMatch) {
          limit = parseInt(limitMatch[1]);
        }
        
        const logsToShow = logsFiltered.slice(0, limit);

        setQueryResult({
          columns: ['run_id', 'agent_id', 'agent_type', 'status', 'initial_wait_time', 'total_time_in_system'],
          rows: logsToShow.map((l: any) => [
            l.run_id, l.agent_id, l.agent_type, l.status, l.initial_wait_time, l.total_time_in_system
          ]),
          message: `${logsToShow.length} rows returned successfully (Filtered from ${logsFiltered.length} total).`
        });
      }
      // 3. Custom aggregate query emulator
      else if (queryClean.includes('avg') || queryClean.includes('group by')) {
        // Average wait time by type
        const courtesyLogs = dbData.RunLogs.filter((l: any) => l.agent_type === 'Courtesy');
        const scheduledLogs = dbData.RunLogs.filter((l: any) => l.agent_type === 'Scheduled');
        
        const avgCourtesy = courtesyLogs.length > 0 
          ? (courtesyLogs.reduce((acc: any, curr: any) => acc + curr.initial_wait_time, 0) / courtesyLogs.length).toFixed(3)
          : '0.000';
        
        const avgScheduled = scheduledLogs.length > 0
          ? (scheduledLogs.reduce((acc: any, curr: any) => acc + curr.initial_wait_time, 0) / scheduledLogs.length).toFixed(3)
          : '0.000';

        setQueryResult({
          columns: ['agent_type', 'avg_wait_time', 'sample_count'],
          rows: [
            ['Courtesy', `${avgCourtesy}m`, courtesyLogs.length],
            ['Scheduled', `${avgScheduled}m`, scheduledLogs.length],
          ],
          message: 'Aggregates calculated on active Simulation dataset.'
        });
      } else {
        setQueryResult({
          error: "SQL Emulator Syntax Error: Unsupported statement. Try:\n- SELECT * FROM SimulationParameters;\n- SELECT * FROM RunLogs LIMIT 10;\n- SELECT AVG(initial_wait_time) FROM RunLogs GROUP BY agent_type;"
        });
      }
    } catch (err: any) {
      setQueryResult({ error: `Query execution failed: ${err.message}` });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[550px]">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-2">
              MySQL Database Console
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded font-mono">
                dfa_simulation
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">Inspect schemas, table states, and run queries</p>
          </div>
        </div>
        <button
          onClick={onClose}
          id="btn-close-console"
          className="text-xs text-slate-400 hover:text-slate-100 bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-750 transition-colors cursor-pointer"
        >
          Close Console
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-slate-950 border-b border-slate-850 px-4 gap-2">
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            CREATE TABLE SQL
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('parameters');
            fetchDbViewer();
          }}
          className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'parameters'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5" />
            SimulationParameters Table
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('logs');
            fetchDbViewer();
          }}
          className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            RunLogs Table (Latest)
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-950">
        {/* Left pane: interactive code/data */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 border-r border-slate-850/60">
          {activeTab === 'schema' && (
            <div className="relative flex-1 flex flex-col">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:text-white transition-all cursor-pointer"
                  title="Copy schema SQL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-slate-300 overflow-auto leading-relaxed select-all">
                {SCHEMA_SQL}
              </pre>
            </div>
          )}

          {activeTab === 'parameters' && (
            <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-xl max-h-full">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading parameters...</div>
              ) : !dbData || dbData.SimulationParameters.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">SimulationParameters table is currently empty. Run a simulation!</div>
              ) : (
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-850 sticky top-0">
                    <tr>
                      <th className="p-2.5">run_id</th>
                      <th className="p-2.5">verifiers</th>
                      <th className="p-2.5">cashiers</th>
                      <th className="p-2.5">biometrics</th>
                      <th className="p-2.5">doc_failure_prob</th>
                      <th className="p-2.5">courtesy_alloc</th>
                      <th className="p-2.5">total_applicants</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {dbData.SimulationParameters.map((row: any) => (
                      <tr key={row.run_id} className="hover:bg-slate-800/40 text-slate-300">
                        <td className="p-2.5 text-sky-400">{row.run_id.substring(4, 12)}...</td>
                        <td className="p-2.5">{row.verifiers}</td>
                        <td className="p-2.5">{row.cashiers}</td>
                        <td className="p-2.5">{row.biometrics}</td>
                        <td className="p-2.5">{row.doc_failure_prob}</td>
                        <td className="p-2.5">{row.courtesy_alloc}</td>
                        <td className="p-2.5">{row.total_applicants}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-xl max-h-full">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading RunLogs...</div>
              ) : !dbData || dbData.RunLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">RunLogs table is currently empty. Run a simulation!</div>
              ) : (
                <div className="flex flex-col">
                  <div className="p-2 bg-slate-950 text-slate-400 text-[10px] border-b border-slate-800">
                    Displaying latest 200 logs (total {dbData.total_logs_count} logs inside table)
                  </div>
                  <table className="w-full text-left text-[11px] font-mono border-collapse">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-850 sticky top-0">
                      <tr>
                        <th className="p-2.5">run_id</th>
                        <th className="p-2.5">agent_id</th>
                        <th className="p-2.5">agent_type</th>
                        <th className="p-2.5">status</th>
                        <th className="p-2.5">initial_wait_time</th>
                        <th className="p-2.5">total_time_in_system</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {dbData.RunLogs.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-800/40 text-slate-300">
                          <td className="p-2.5 text-sky-400">{row.run_id.substring(4, 12)}...</td>
                          <td className="p-2.5 font-bold">#{row.agent_id}</td>
                          <td className="p-2.5">{row.agent_type}</td>
                          <td className="p-2.5">
                            <span className={row.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-amber-400">{row.initial_wait_time.toFixed(3)}m</td>
                          <td className="p-2.5 text-indigo-400">{row.total_time_in_system.toFixed(3)}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right pane: Interactive SQL Query Sandbox */}
        <div className="w-full md:w-80 flex flex-col min-h-0 p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs border-b border-slate-800 pb-2">
            <Terminal className="w-4 h-4" />
            <span>Interactive SQL Emulator</span>
          </div>

          <div className="flex-1 flex flex-col space-y-2 min-h-0">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Enter SQL Query:
            </label>
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="flex-1 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-mono text-slate-300 leading-relaxed placeholder-slate-600 resize-none h-28"
              placeholder="SELECT * FROM RunLogs LIMIT 10;"
            />

            <div className="flex gap-2">
              <button
                onClick={runQueryEmulator}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Execute Query
              </button>
              
              <button
                onClick={fetchDbViewer}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* SQL Query Result Display */}
          <div className="h-44 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
              <span className="font-mono">SQL RESULT TERMINAL</span>
              {queryResult && !queryResult.error && (
                <span className="text-emerald-400 font-bold">SUCCESS</span>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-3 text-[10px] font-mono leading-normal">
              {!queryResult ? (
                <div className="text-slate-600 italic">No query executed yet. Write a query above and click Execute.</div>
              ) : queryResult.error ? (
                <div className="text-rose-400 whitespace-pre-wrap">{queryResult.error}</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-emerald-400 text-[9px] mb-1">{queryResult.message}</div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        {queryResult.columns.map((c: string, idx: number) => (
                          <th key={idx} className="pb-1 pr-2">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 text-slate-300">
                      {queryResult.rows.map((row: any[], rIdx: number) => (
                        <tr key={rIdx}>
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="py-1 pr-2 max-w-[80px] truncate" title={String(cell)}>
                              {cell === null ? 'NULL' : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
