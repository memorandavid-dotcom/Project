import React from 'react';
import { Search, UserCheck, ShieldAlert, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { AgentEventLog, AgentType } from '../types.js';
import { ThemeConfig } from '../theme.js';

interface AgentLogsTableProps {
  logs: AgentEventLog[];
  activeTheme?: ThemeConfig;
}

export default function AgentLogsTable({ logs, activeTheme }: AgentLogsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Sorting
  const [sortField, setSortField] = React.useState<'agent_id' | 'initial_wait_time' | 'total_time_in_system'>('agent_id');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus]);

  const handleSort = (field: 'agent_id' | 'initial_wait_time' | 'total_time_in_system') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.agent_id.toString().includes(searchTerm) ||
      log.agent_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || log.agent_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let valA = a[sortField] ?? 0;
    let valB = b[sortField] ?? 0;
    if (sortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  // Pagination bounds
  const totalItems = sortedLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  const borderStyle = activeTheme ? activeTheme.borderClass : 'border-slate-800';
  const headingColor = activeTheme ? activeTheme.textHeadingClass : 'text-slate-100';
  const mutedColor = activeTheme ? activeTheme.textMutedClass : 'text-slate-500';
  const accentText = activeTheme ? activeTheme.accentTextClass : 'text-sky-400';

  return (
    <div className={`${activeTheme ? activeTheme.cardClass : 'bg-slate-900 border border-slate-800'} rounded-2xl p-5 shadow-lg flex flex-col space-y-4 transition-all duration-300`}>
      {/* Table header with filters */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b ${borderStyle}`}>
        <div>
          <h4 className={`text-sm font-semibold ${headingColor} flex items-center gap-2`}>
            <UserCheck className={`w-4 h-4 ${accentText}`} />
            Applicant-Level Telemetry Event Log
          </h4>
          <p className={`text-xs ${mutedColor} mt-0.5`}>
            Full discrete event history for every simulated applicant
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-8.5 pr-3 py-1.5 w-36 bg-slate-800/25 border ${borderStyle} hover:border-indigo-500/30 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all duration-200`}
            />
          </div>

          {/* Type dropdown */}
          <div className={`flex items-center gap-1.5 bg-slate-800/10 border ${borderStyle} p-1.5 rounded-xl`}>
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All Types</option>
              <option value="Courtesy" className="bg-slate-900">Courtesy</option>
              <option value="Scheduled" className="bg-slate-900">Scheduled</option>
            </select>
          </div>

          {/* Status dropdown */}
          <div className={`flex items-center gap-1.5 bg-slate-800/10 border ${borderStyle} p-1.5 rounded-xl`}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="completed" className="bg-slate-900">Completed</option>
              <option value="failed_verification" className="bg-slate-900">Failed Doc Verify</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Canvas */}
      <div className={`overflow-x-auto rounded-xl border ${borderStyle}`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`bg-slate-950/40 ${mutedColor} border-b ${borderStyle} uppercase text-[10px] tracking-wider font-semibold`}>
              <th
                onClick={() => handleSort('agent_id')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Applicant ID <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Priority Type</th>
              <th className="py-3 px-4">Arrival (Min)</th>
              <th className="py-3 px-4">Status</th>
              <th
                onClick={() => handleSort('initial_wait_time')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Wait Time <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total_time_in_system')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1">
                  System Time <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-slate-500 font-mono">Verify (W/S)</th>
              <th className="py-3 px-4 text-slate-500 font-mono">Cashier (W/S)</th>
              <th className="py-3 px-4 text-slate-500 font-mono">Biometrics (W/S)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  No applicants matching the selected filters.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr
                  key={log.agent_id}
                  className="hover:bg-slate-800/20 text-slate-300 transition-all duration-150"
                >
                  {/* ID */}
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-400">
                    #{log.agent_id}
                  </td>
                  
                  {/* Priority Type */}
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.agent_type === 'Courtesy'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                      }`}
                    >
                      {log.agent_type}
                    </span>
                  </td>

                  {/* Arrival */}
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {log.arrival_time.toFixed(1)}m
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        log.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {log.status === 'completed' ? (
                        <>
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          Completed
                        </>
                      ) : (
                        <>
                          <span className="w-1 h-1 rounded-full bg-rose-400"></span>
                          Failed Verify
                        </>
                      )}
                    </span>
                  </td>

                  {/* Wait Time */}
                  <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                    {log.initial_wait_time.toFixed(2)}m
                  </td>

                  {/* Total Time */}
                  <td className="py-2.5 px-4 font-mono text-indigo-400">
                    {log.total_time_in_system.toFixed(2)}m
                  </td>

                  {/* Stage-level diagnostics: Verify */}
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                    {log.verify_wait_time.toFixed(1)}w / {log.verify_service_time.toFixed(1)}s
                  </td>

                  {/* Stage-level diagnostics: Cashier */}
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                    {log.cashier_wait_time !== null ? (
                      `${log.cashier_wait_time.toFixed(1)}w / ${log.cashier_service_time?.toFixed(1)}s`
                    ) : (
                      <span className="text-slate-700">-</span>
                    )}
                  </td>

                  {/* Stage-level diagnostics: Biometrics */}
                  <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                    {log.biometrics_wait_time !== null ? (
                      `${log.biometrics_wait_time.toFixed(1)}w / ${log.biometrics_service_time?.toFixed(1)}s`
                    ) : (
                      <span className="text-slate-700">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className={`flex items-center justify-between pt-2 border-t ${borderStyle} text-xs ${mutedColor}`}>
        <span>
          Showing{' '}
          <strong className="text-slate-400 font-mono">
            {totalItems === 0 ? 0 : startIndex + 1}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-400 font-mono">
            {Math.min(startIndex + itemsPerPage, totalItems)}
          </strong>{' '}
          of <strong className="text-slate-400 font-mono">{totalItems}</strong> applicants
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            id="btn-page-prev"
            className={`p-1.5 rounded-lg border ${borderStyle} bg-slate-800/20 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 cursor-pointer`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className={`px-3 py-1 bg-slate-800/30 rounded-lg text-slate-300 font-mono border ${borderStyle}`}>
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            id="btn-page-next"
            className={`p-1.5 rounded-lg border ${borderStyle} bg-slate-800/20 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 cursor-pointer`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
