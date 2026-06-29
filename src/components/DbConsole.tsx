import React from 'react';
import { 
  Database, 
  Table, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  DatabaseZap
} from 'lucide-react';

interface DbConsoleProps {
  onClose: () => void;
  runId: string | null;
}

interface TableColumn {
  name: string;
  type: string;
}

interface TableInfo {
  columns: TableColumn[];
  rowsCount: number;
}

interface TableList {
  [tableName: string]: TableInfo;
}

export default function DbConsole({ onClose, runId }: DbConsoleProps) {
  const [activeTab, setActiveTab] = React.useState<'sql' | 'explorer'>('explorer');
  const [copied, setCopied] = React.useState(false);
  const [sqlQuery, setSqlQuery] = React.useState('');
  const [queryResult, setQueryResult] = React.useState<any>(null);
  const [executing, setExecuting] = React.useState(false);

  // Schema state
  const [tables, setTables] = React.useState<TableList>({});
  const [loadingTables, setLoadingTables] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<string>('SimulationParameters');
  const [selectedTableRows, setSelectedTableRows] = React.useState<any[]>([]);
  const [loadingRows, setLoadingRows] = React.useState(false);

  // Create Table Form States
  const [showCreateTableModal, setShowCreateTableModal] = React.useState(false);
  const [newTableName, setNewTableName] = React.useState('');
  const [newTableCols, setNewTableCols] = React.useState<TableColumn[]>([{ name: 'id', type: 'INT' }]);

  // Add Row Form States
  const [showAddRowForm, setShowAddRowForm] = React.useState(false);
  const [newRowData, setNewRowData] = React.useState<Record<string, any>>({});

  // Edit Row States
  const [editingRowIndex, setEditingRowIndex] = React.useState<number | null>(null);
  const [editingRowData, setEditingRowData] = React.useState<Record<string, any>>({});

  // Error/Success Alerts
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchTables = async () => {
    setLoadingTables(true);
    try {
      const res = await fetch('/api/db/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        // Default to first table if the current selected one was dropped
        if (!data[selectedTable]) {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            setSelectedTable(keys[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tables list:', err);
      triggerAlert('Failed to load database tables.', 'error');
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableRows = async (tableName: string) => {
    if (!tableName) return;
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/db/tables/${tableName}/rows`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTableRows(data);
      }
    } catch (err) {
      console.error(`Error loading rows for ${tableName}:`, err);
      triggerAlert(`Failed to load data for table ${tableName}`, 'error');
    } finally {
      setLoadingRows(false);
    }
  };

  // Sync tables and active rows
  React.useEffect(() => {
    fetchTables();
  }, []);

  React.useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable);
      setEditingRowIndex(null);
      setShowAddRowForm(false);
    }
  }, [selectedTable]);

  React.useEffect(() => {
    if (runId) {
      setSqlQuery(`SELECT * FROM RunLogs WHERE run_id = '${runId}' LIMIT 10;`);
    } else {
      setSqlQuery(`SELECT run_id, total_applicants, avg_wait_time FROM SimulationParameters LIMIT 10;`);
    }
  }, [runId]);

  // Execute actual SQL query on the server!
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    setExecuting(true);
    setQueryResult(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      
      const data = await res.json();
      if (res.ok) {
        setQueryResult({
          message: data.message || 'Query executed successfully.',
          columns: data.columns || [],
          rows: data.rows || [],
        });
        // Reload schemas and rows to capture any changes (CREATE/DROP/UPDATE/INSERT)
        fetchTables();
        if (selectedTable) {
          fetchTableRows(selectedTable);
        }
      } else {
        setQueryResult({ error: data.error || 'Syntax or execution error occurred.' });
      }
    } catch (err: any) {
      setQueryResult({ error: `Connection failed: ${err.message}` });
    } finally {
      setExecuting(false);
    }
  };

  // Create table handler
  const handleCreateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      triggerAlert('Table name is required.', 'error');
      return;
    }
    const cleanTableName = newTableName.trim().replace(/[^a-zA-Z0-9_]/g, '');

    try {
      const res = await fetch('/api/db/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: cleanTableName,
          columns: newTableCols.map(c => ({
            name: c.name.trim().replace(/[^a-zA-Z0-9_]/g, ''),
            type: c.type
          }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerAlert(`Table '${cleanTableName}' created successfully!`);
        setShowCreateTableModal(false);
        setNewTableName('');
        setNewTableCols([{ name: 'id', type: 'INT' }]);
        await fetchTables();
        setSelectedTable(cleanTableName);
      } else {
        triggerAlert(data.error || 'Failed to create table.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error while creating table.', 'error');
    }
  };

  // Drop table handler
  const handleDropTable = async (tableName: string) => {
    if (tableName === 'SimulationParameters' || tableName === 'RunLogs') {
      triggerAlert('Cannot delete core system tables!', 'error');
      return;
    }
    if (!window.confirm(`Are you absolutely sure you want to drop the table "${tableName}"? This action is irreversible.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/db/tables/${tableName}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        triggerAlert(`Table '${tableName}' dropped successfully!`);
        await fetchTables();
      } else {
        triggerAlert(data.error || 'Failed to drop table.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error while dropping table.', 'error');
    }
  };

  // Insert Row handler
  const handleAddRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/db/tables/${selectedTable}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRowData)
      });
      const data = await res.json();
      if (res.ok) {
        triggerAlert('Row successfully inserted into table!');
        setShowAddRowForm(false);
        setNewRowData({});
        fetchTableRows(selectedTable);
        fetchTables(); // update count
      } else {
        triggerAlert(data.error || 'Failed to insert row.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error while inserting row.', 'error');
    }
  };

  // Update Row handler
  const handleUpdateRowSubmit = async (rowIndex: number) => {
    try {
      const res = await fetch(`/api/db/tables/${selectedTable}/rows/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRowData)
      });
      const data = await res.json();
      if (res.ok) {
        triggerAlert('Row updated successfully!');
        setEditingRowIndex(null);
        setEditingRowData({});
        fetchTableRows(selectedTable);
      } else {
        triggerAlert(data.error || 'Failed to update row.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error while updating row.', 'error');
    }
  };

  // Delete Row handler
  const handleDeleteRow = async (rowIndex: number) => {
    if (!window.confirm('Delete this row from the database?')) return;

    try {
      const res = await fetch(`/api/db/tables/${selectedTable}/rows/${rowIndex}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        triggerAlert('Row deleted successfully.');
        fetchTableRows(selectedTable);
        fetchTables(); // update count
      } else {
        triggerAlert(data.error || 'Failed to delete row.', 'error');
      }
    } catch (err) {
      triggerAlert('Network error while deleting row.', 'error');
    }
  };

  // Helper to add new column fields in create table builder
  const addColumnField = () => {
    setNewTableCols([...newTableCols, { name: `col_${newTableCols.length + 1}`, type: 'VARCHAR(255)' }]);
  };

  const removeColumnField = (idx: number) => {
    if (newTableCols.length <= 1) return;
    setNewTableCols(newTableCols.filter((_, i) => i !== idx));
  };

  const updateColumnField = (idx: number, field: keyof TableColumn, val: string) => {
    const updated = [...newTableCols];
    updated[idx] = { ...updated[idx], [field]: val };
    setNewTableCols(updated);
  };

  const handleCopySchemaSql = () => {
    const schemaSql = `CREATE DATABASE dfa_simulation;
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
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px] relative">
      
      {/* Toast Alert Banner */}
      {statusMessage && (
        <div className={`absolute top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl animate-fade-in transition-all ${
          statusMessage.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
        }`}>
          <AlertCircle className="w-4 h-4 text-inherit" />
          <span className="text-xs font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <DatabaseZap className="w-5 h-5 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-2">
              Interactive MySQL Console & Explorer
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded font-mono">
                dfa_simulation
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">Create, edit, drop schemas, and run direct SQL transactions</p>
          </div>
        </div>
        <button
          onClick={onClose}
          id="btn-close-console"
          className="text-xs text-slate-400 hover:text-slate-100 bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-750 transition-colors cursor-pointer font-medium"
        >
          Close Console
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-slate-950 border-b border-slate-850 px-4 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'explorer'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Visual Schema Manager
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sql'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              SQL Command Line
            </span>
          </button>
        </div>

        <button
          onClick={handleCopySchemaSql}
          className="text-[10px] flex items-center gap-1.5 text-slate-400 hover:text-slate-200 py-1 px-2.5 rounded hover:bg-slate-900 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              Copied Schema SQL
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy Core CREATE TABLE SQL
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-slate-950">
        
        {/* ================= TAB 1: VISUAL SCHEMA EXPLORER & CRUD ================= */}
        {activeTab === 'explorer' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Sidebar list of tables */}
            <div className="w-full md:w-60 border-r border-slate-850/60 p-4 flex flex-col space-y-3 shrink-0 bg-slate-950">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Tables in Database
                </span>
                <button
                  onClick={() => setShowCreateTableModal(true)}
                  className="p-1 hover:bg-indigo-600/20 text-indigo-400 rounded transition-all border border-transparent hover:border-indigo-500/20 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="Create a new SQL Table"
                >
                  <Plus className="w-3.5 h-3.5" />
                  CREATE TABLE
                </button>
              </div>

              {loadingTables ? (
                <div className="flex-1 flex items-center justify-center py-6 text-xs text-slate-500 font-mono">
                  Loading...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {Object.keys(tables).map(tName => {
                    const isCore = tName === 'SimulationParameters' || tName === 'RunLogs';
                    return (
                      <div
                        key={tName}
                        onClick={() => setSelectedTable(tName)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                          selectedTable === tName
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                            : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Table className={`w-3.5 h-3.5 ${selectedTable === tName ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span className="truncate">{tName}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-950/70 border border-slate-800 text-slate-500 rounded font-mono">
                          {tables[tName]?.rowsCount || 0} rows
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Table Grid & Actions */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4 space-y-3">
              {/* Table header meta & drop option */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-850">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    {selectedTable}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Columns: {tables[selectedTable]?.columns.map(c => `${c.name} (${c.type})`).join(', ') || 'No schema'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewRowData({});
                      setShowAddRowForm(!showAddRowForm);
                    }}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Row
                  </button>

                  {selectedTable !== 'SimulationParameters' && selectedTable !== 'RunLogs' && (
                    <button
                      onClick={() => handleDropTable(selectedTable)}
                      className="py-1.5 px-3 bg-rose-950/30 border border-rose-500/20 hover:bg-rose-950/60 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Drop this custom SQL table"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Drop Table
                    </button>
                  )}
                </div>
              </div>

              {/* Add Row Form (Expandable) */}
              {showAddRowForm && (
                <form onSubmit={handleAddRowSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      INSERT Row into {selectedTable}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddRowForm(false)}
                      className="text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {tables[selectedTable]?.columns.map(col => {
                      const isAutoTime = col.name === 'timestamp' && col.type.includes('TIMESTAMP');
                      return (
                        <div key={col.name} className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-mono block truncate">
                            {col.name} <span className="text-slate-600">({col.type})</span>
                          </label>
                          <input
                            type={col.type.includes('INT') || col.type.includes('FLOAT') ? 'number' : 'text'}
                            step="any"
                            placeholder={isAutoTime ? 'CURRENT_TIMESTAMP' : 'Enter value...'}
                            disabled={isAutoTime}
                            value={newRowData[col.name] !== undefined ? newRowData[col.name] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewRowData({
                                ...newRowData,
                                [col.name]: col.type.includes('INT') || col.type.includes('FLOAT') ? (val === '' ? '' : Number(val)) : val
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 placeholder-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddRowForm(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Execute Insert
                    </button>
                  </div>
                </form>
              )}

              {/* Data Table View */}
              <div className="flex-1 overflow-auto bg-slate-900 border border-slate-850 rounded-xl relative">
                {loadingRows ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 text-slate-400 text-xs font-mono">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mb-2" />
                    Fetching rows...
                  </div>
                ) : selectedTableRows.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs leading-relaxed">
                    <Database className="w-10 h-10 text-slate-700 mb-2 opacity-50" />
                    <span className="font-semibold block text-slate-400">Empty Table Dataset</span>
                    <span className="text-[10px] mt-1 text-slate-600 max-w-xs">
                      No records exist inside "{selectedTable}". Click "Insert Row" or run a simulation to seed records.
                    </span>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] font-mono border-collapse relative">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-850 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-16 text-center">Row</th>
                        {tables[selectedTable]?.columns.map(col => (
                          <th key={col.name} className="p-2.5">
                            <span className="block">{col.name}</span>
                            <span className="block text-[8px] text-slate-600 font-normal font-sans uppercase">
                              {col.type}
                            </span>
                          </th>
                        ))}
                        <th className="p-2.5 w-24 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {selectedTableRows.map((row, rowIndex) => {
                        const isEditing = editingRowIndex === rowIndex;
                        return (
                          <tr key={rowIndex} className="hover:bg-slate-800/20 text-slate-300">
                            <td className="p-2.5 text-center text-slate-600 font-bold border-r border-slate-800/50">
                              {rowIndex + 1}
                            </td>
                            {tables[selectedTable]?.columns.map(col => {
                              const cellValue = row[col.name];
                              return (
                                <td key={col.name} className="p-2.5 max-w-[150px] truncate">
                                  {isEditing ? (
                                    <input
                                      type={col.type.includes('INT') || col.type.includes('FLOAT') ? 'number' : 'text'}
                                      step="any"
                                      value={editingRowData[col.name] !== undefined ? editingRowData[col.name] : (cellValue ?? '')}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingRowData({
                                          ...editingRowData,
                                          [col.name]: col.type.includes('INT') || col.type.includes('FLOAT') ? (val === '' ? '' : Number(val)) : val
                                        });
                                      }}
                                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                                    />
                                  ) : (
                                    <span 
                                      className={
                                        col.name === 'run_id' ? 'text-indigo-400 font-semibold' : 
                                        col.name === 'status' && cellValue === 'completed' ? 'text-emerald-400' :
                                        col.name === 'status' && cellValue?.includes('fail') ? 'text-rose-400' : 'text-slate-300'
                                      }
                                      title={cellValue !== null ? String(cellValue) : 'NULL'}
                                    >
                                      {cellValue === null ? <em className="text-slate-600">NULL</em> : String(cellValue)}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateRowSubmit(rowIndex)}
                                      className="p-1 hover:bg-emerald-600/20 text-emerald-400 rounded transition-colors cursor-pointer"
                                      title="Save row modifications"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingRowIndex(null);
                                        setEditingRowData({});
                                      }}
                                      className="p-1 hover:bg-slate-800 text-slate-400 rounded transition-colors cursor-pointer"
                                      title="Discard changes"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingRowIndex(rowIndex);
                                        setEditingRowData({ ...row });
                                      }}
                                      className="p-1 hover:bg-indigo-600/20 text-indigo-400 rounded transition-colors cursor-pointer"
                                      title="Edit values on this record"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRow(rowIndex)}
                                      className="p-1 hover:bg-rose-600/20 text-rose-400 rounded transition-colors cursor-pointer"
                                      title="Delete record from table"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: INTERACTIVE SQL QUERY SANDBOX ================= */}
        {activeTab === 'sql' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* SQL Input Area (Left) */}
            <div className="flex-1 flex flex-col p-4 space-y-3 min-h-0">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs border-b border-slate-850 pb-1.5">
                <Terminal className="w-4 h-4" />
                <span>Arbitrary SQL Transaction Engine</span>
              </div>

              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Write Query:
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Supported: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, DROP TABLE
                  </span>
                </div>
                
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="flex-1 p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-mono text-slate-300 leading-relaxed placeholder-slate-600 resize-none"
                  placeholder="SELECT * FROM SimulationParameters LIMIT 10;"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleExecuteQuery}
                    disabled={executing}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/50"
                  >
                    {executing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Execute Transaction
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      fetchTables();
                      if (selectedTable) fetchTableRows(selectedTable);
                    }}
                    className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                    title="Refresh schemas and datasets"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SQL Terminal Result Display (Right/Bottom) */}
            <div className="w-full md:w-[400px] flex flex-col min-h-0 p-4 border-t md:border-t-0 md:border-l border-slate-850/60 bg-slate-950 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs border-b border-slate-850 pb-1.5 mb-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Interactive Results Output</span>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[220px]">
                <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
                  <span className="font-mono">SQL TERMINAL</span>
                  {queryResult && !queryResult.error && (
                    <span className="text-emerald-400 font-bold uppercase text-[9px] tracking-wider bg-emerald-950/80 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                      SUCCESS
                    </span>
                  )}
                  {queryResult?.error && (
                    <span className="text-rose-400 font-bold uppercase text-[9px] tracking-wider bg-rose-950/80 border border-rose-900/40 px-1.5 py-0.5 rounded">
                      ERROR
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-auto p-3 text-[10px] font-mono leading-normal">
                  {!queryResult ? (
                    <div className="text-slate-600 italic flex flex-col items-center justify-center h-full space-y-1">
                      <Terminal className="w-8 h-8 opacity-20 text-slate-500" />
                      <span>Execute a query to inspect records.</span>
                    </div>
                  ) : queryResult.error ? (
                    <div className="text-rose-400 whitespace-pre-wrap flex gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <div className="font-bold">SQL Execution Error:</div>
                        <div className="mt-1 leading-relaxed">{queryResult.error}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-emerald-400 font-semibold">{queryResult.message}</div>
                      
                      {queryResult.columns.length > 0 && (
                        <div className="border border-slate-800 rounded-lg overflow-hidden max-w-full">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-850 bg-slate-950 text-slate-400">
                                {queryResult.columns.map((c: string, idx: number) => (
                                  <th key={idx} className="p-2 pr-4">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30 text-slate-300">
                              {queryResult.rows.map((row: any[], rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-slate-800/20">
                                  {row.map((cell: any, cIdx: number) => (
                                    <td key={cIdx} className="p-2 pr-4 max-w-[120px] truncate" title={String(cell)}>
                                      {cell === null ? <em className="text-slate-600">NULL</em> : String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE TABLE BUILDER ================= */}
      {showCreateTableModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-lg shadow-2xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-400" />
                CREATE TABLE Constructor
              </h4>
              <button
                onClick={() => setShowCreateTableModal(false)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTableSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Table Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. queue_metrics"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Columns Configuration
                  </span>
                  <button
                    type="button"
                    onClick={addColumnField}
                    className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Column
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-slate-850 p-2.5 rounded-xl bg-slate-950/45">
                  {newTableCols.map((col, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="column_name"
                        value={col.name}
                        onChange={(e) => updateColumnField(idx, 'name', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs font-mono text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none"
                      />
                      
                      <select
                        value={col.type}
                        onChange={(e) => updateColumnField(idx, 'type', e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="INT">INT</option>
                        <option value="VARCHAR(255)">VARCHAR(255)</option>
                        <option value="FLOAT">FLOAT</option>
                        <option value="TEXT">TEXT</option>
                        <option value="TIMESTAMP">TIMESTAMP</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeColumnField(idx)}
                        disabled={newTableCols.length <= 1}
                        className="p-1.5 text-rose-400 hover:bg-rose-950/30 rounded disabled:opacity-30 cursor-pointer"
                        title="Remove column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTableModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Create Table Schema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
