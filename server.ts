import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { runConsularSimulation } from './src/simulationEngine.js';
import { SimulationParams } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON-based database path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dfa_simulation.json');

// Initialize local database directories and tables
function initDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initialDb = {
        SimulationParameters: [] as any[],
        RunLogs: [] as any[],
        runs: [] as any[], // full simulation result cache for interactive charts
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
    }
  } catch (err) {
    console.error('Error initializing simulated MySQL database:', err);
  }
}
initDb();

function readDb() {
  try {
    initDb();
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return { SimulationParameters: [], RunLogs: [], runs: [] };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

// Generate UUID-like run id
function generateUUID(): string {
  return 'run_' + Math.random().toString(36).substring(2, 11) + '_' + Math.floor(Date.now() / 1000);
}

// --- API Endpoints ---

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run Simulation endpoint (both root and /api/ paths to satisfy various integration scenarios)
const handleRunSimulation = (req: express.Request, res: express.Response) => {
  try {
    const {
      verifiers,
      cashiers,
      biometrics,
      doc_failure_prob,
      courtesy_alloc,
      total_applicants,
    } = req.body;

    // Parameter validations
    if (
      verifiers === undefined ||
      cashiers === undefined ||
      biometrics === undefined ||
      doc_failure_prob === undefined ||
      courtesy_alloc === undefined ||
      total_applicants === undefined
    ) {
      return res.status(400).json({
        error: 'Missing required parameters. Ensure you supply verifiers, cashiers, biometrics, doc_failure_prob, courtesy_alloc, and total_applicants.',
      });
    }

    const params: SimulationParams = {
      verifiers: parseInt(verifiers),
      cashiers: parseInt(cashiers),
      biometrics: parseInt(biometrics),
      doc_failure_prob: parseFloat(doc_failure_prob),
      courtesy_alloc: parseFloat(courtesy_alloc),
      total_applicants: parseInt(total_applicants),
    };

    const runId = generateUUID();

    // 1. Run SimPy-equivalent discrete event simulation
    const result = runConsularSimulation(params, runId);

    // 2. Log simulated tables to JSON-db (SimulationParameters & RunLogs)
    const db = readDb();
    
    // Simulate: INSERT INTO SimulationParameters ...
    db.SimulationParameters.push({
      run_id: runId,
      verifiers: params.verifiers,
      cashiers: params.cashiers,
      biometrics: params.biometrics,
      doc_failure_prob: params.doc_failure_prob,
      courtesy_alloc: params.courtesy_alloc,
      total_applicants: params.total_applicants,
      timestamp: new Date().toISOString(),
    });

    // Simulate: batch insert into RunLogs using cursor.executemany-like structure
    const batchLogs = result.logs.map(log => ({
      run_id: runId,
      agent_id: log.agent_id,
      agent_type: log.agent_type,
      status: log.status,
      initial_wait_time: log.initial_wait_time,
      total_time_in_system: log.total_time_in_system,
    }));
    db.RunLogs.push(...batchLogs);

    // Store complete result for React high-fidelity telemetry charts
    db.runs.push({
      run_id: runId,
      timestamp: result.timestamp,
      parameters: result.parameters,
      total_processed: result.total_processed,
      avg_wait_time: result.avg_wait_time,
      avg_verify_wait: result.avg_verify_wait,
      avg_cashier_wait: result.avg_cashier_wait,
      avg_biometrics_wait: result.avg_biometrics_wait,
      avg_total_wait: result.avg_total_wait,
      avg_verify_service: result.avg_verify_service,
      avg_cashier_service: result.avg_cashier_service,
      avg_biometrics_service: result.avg_biometrics_service,
      avg_total_system_time: result.avg_total_system_time,
      verification_fail_count: result.verification_fail_count,
      completion_count: result.completion_count,
      queue_history: result.queue_history,
      utilization_history: result.utilization_history,
    });

    writeDb(db);

    // Return the exact JSON dictionary as required by instructions
    res.json({
      run_id: runId,
      total_processed: result.total_processed,
      avg_wait_time: result.avg_wait_time,
    });
  } catch (error: any) {
    console.error('Error running simulation:', error);
    res.status(500).json({
      error: 'An unexpected database/simulation error occurred.',
      details: error.message,
    });
  }
};

app.post('/run-simulation', handleRunSimulation);
app.post('/api/run-simulation', handleRunSimulation);

// Query Runs list
app.get('/api/runs', (req, res) => {
  const db = readDb();
  res.json(db.runs);
});

// Query detailed logs for a single run (simulating a SQL JOIN / selective retrieval)
app.get('/api/runs/:runId', (req, res) => {
  const { runId } = req.params;
  const db = readDb();
  
  // Find parameters
  const params = db.SimulationParameters.find((p: any) => p.run_id === runId);
  // Find event logs
  const logs = db.RunLogs.filter((l: any) => l.run_id === runId);
  // Find fully cached analytical report
  const analyticalReport = db.runs.find((r: any) => r.run_id === runId);

  if (!analyticalReport) {
    return res.status(404).json({ error: 'Simulation run logs not found.' });
  }

  res.json({
    run_id: runId,
    parameters: params,
    logs: logs,
    analytics: analyticalReport,
  });
});

// Delete specific run
app.delete('/api/runs/:runId', (req, res) => {
  const { runId } = req.params;
  const db = readDb();
  
  db.SimulationParameters = db.SimulationParameters.filter((p: any) => p.run_id !== runId);
  db.RunLogs = db.RunLogs.filter((l: any) => l.run_id !== runId);
  db.runs = db.runs.filter((r: any) => r.run_id !== runId);

  writeDb(db);
  res.json({ success: true, message: `Successfully cleared run ${runId}` });
});

// Fetch raw DB tables (to simulate database query viewer for educational purposes)
app.get('/api/db-viewer', (req, res) => {
  const db = readDb();
  res.json({
    SimulationParameters: db.SimulationParameters,
    RunLogs: db.RunLogs.slice(-200), // Clip to latest 200 logs for response size sanity
    total_logs_count: db.RunLogs.length,
  });
});

// Helper to find actual table name with case-insensitivity
function findRealTableName(tableName: string, db: any): string | null {
  if (!tableName) return null;
  const keys = Object.keys(db);
  const lowerName = tableName.trim().toLowerCase();
  for (const k of keys) {
    if (k.toLowerCase() === lowerName) {
      return k;
    }
  }
  return null;
}

// Helper to split values while respecting quotes
function splitSqlValues(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (char === ',' && !inSingleQuote && !inDoubleQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Helper functions for dynamic SQL execution
function getColumnsForTable(tableName: string, db: any): string[] {
  const realName = findRealTableName(tableName, db) || tableName;
  if (db._schemas && db._schemas[realName]) {
    return db._schemas[realName].map((c: any) => c.name);
  }
  // Try to inspect first item in array
  if (db[realName] && db[realName].length > 0) {
    return Object.keys(db[realName][0]);
  }
  // Hardcoded defaults
  if (realName.toLowerCase() === 'simulationparameters') {
    return ['run_id', 'verifiers', 'cashiers', 'biometrics', 'doc_failure_prob', 'courtesy_alloc', 'total_applicants', 'timestamp'];
  }
  if (realName.toLowerCase() === 'runlogs') {
    return ['run_id', 'agent_id', 'agent_type', 'status', 'initial_wait_time', 'total_time_in_system'];
  }
  return [];
}

function evalWhereClause(row: any, whereClause: string): boolean {
  const clause = whereClause.trim();
  const operators = ['!=', '<=', '>=', '=', '<', '>', 'like'];
  let foundOp = '';
  for (const op of operators) {
    if (clause.includes(op)) {
      foundOp = op;
      break;
    }
  }

  if (!foundOp) return true;

  const [colRaw, valRaw] = clause.split(foundOp);
  const col = colRaw.trim();
  let val = valRaw.trim();

  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }

  const rowVal = row[col];

  if (foundOp === '=') {
    return String(rowVal) === String(val);
  }
  if (foundOp === '!=') {
    return String(rowVal) !== String(val);
  }
  if (foundOp === '<') {
    return Number(rowVal) < Number(val);
  }
  if (foundOp === '>') {
    return Number(rowVal) > Number(val);
  }
  if (foundOp === '<=') {
    return Number(rowVal) <= Number(val);
  }
  if (foundOp === '>=') {
    return Number(rowVal) >= Number(val);
  }
  if (foundOp === 'like') {
    const regex = new RegExp(val.replace(/%/g, '.*'), 'i');
    return regex.test(String(rowVal));
  }

  return false;
}

// Get all tables and their columns/schemas
app.get('/api/db/tables', (req, res) => {
  try {
    const db = readDb();
    db._schemas = db._schemas || {};
    
    // Ensure default schemas exist
    if (!db._schemas.SimulationParameters) {
      db._schemas.SimulationParameters = [
        { name: 'run_id', type: 'VARCHAR(50)' },
        { name: 'verifiers', type: 'INT' },
        { name: 'cashiers', type: 'INT' },
        { name: 'biometrics', type: 'INT' },
        { name: 'doc_failure_prob', type: 'FLOAT' },
        { name: 'courtesy_alloc', type: 'FLOAT' },
        { name: 'total_applicants', type: 'INT' },
        { name: 'timestamp', type: 'TIMESTAMP' },
      ];
    }
    if (!db._schemas.RunLogs) {
      db._schemas.RunLogs = [
        { name: 'run_id', type: 'VARCHAR(50)' },
        { name: 'agent_id', type: 'INT' },
        { name: 'agent_type', type: 'VARCHAR(20)' },
        { name: 'status', type: 'VARCHAR(30)' },
        { name: 'initial_wait_time', type: 'FLOAT' },
        { name: 'total_time_in_system', type: 'FLOAT' },
      ];
    }

    const tables = Object.keys(db).filter(k => k !== 'runs' && !k.startsWith('_'));
    const response: any = {};
    tables.forEach(t => {
      response[t] = {
        columns: db._schemas[t] || (db[t].length > 0 ? Object.keys(db[t][0]).map(k => ({ name: k, type: typeof db[t][0][k] === 'number' ? 'NUMBER' : 'TEXT' })) : []),
        rowsCount: db[t].length,
      };
    });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create table
app.post('/api/db/tables', (req, res) => {
  try {
    const { tableName, columns } = req.body; // columns is [{ name, type }]
    if (!tableName) return res.status(400).json({ error: 'Table name is required.' });
    if (!columns || !Array.isArray(columns)) return res.status(400).json({ error: 'Columns array is required.' });

    const db = readDb();
    if (db[tableName]) {
      return res.status(400).json({ error: `Table '${tableName}' already exists.` });
    }

    db[tableName] = [];
    db._schemas = db._schemas || {};
    db._schemas[tableName] = columns;
    writeDb(db);
    res.json({ success: true, message: `Table '${tableName}' created successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Drop table
app.delete('/api/db/tables/:tableName', (req, res) => {
  try {
    const { tableName } = req.params;
    if (tableName.toLowerCase() === 'simulationparameters' || tableName.toLowerCase() === 'runlogs') {
      return res.status(400).json({ error: 'Cannot delete core system tables.' });
    }

    const db = readDb();
    const realName = findRealTableName(tableName, db);
    if (!realName || !db[realName]) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    delete db[realName];
    if (db._schemas) delete db._schemas[realName];
    writeDb(db);
    res.json({ success: true, message: `Table '${realName}' dropped successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get rows for a table
app.get('/api/db/tables/:tableName/rows', (req, res) => {
  try {
    const { tableName } = req.params;
    const db = readDb();
    const realName = findRealTableName(tableName, db);
    if (!realName || !db[realName]) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }
    res.json(db[realName]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Insert row
app.post('/api/db/tables/:tableName/rows', (req, res) => {
  try {
    const { tableName } = req.params;
    const rowData = req.body;
    const db = readDb();
    const realName = findRealTableName(tableName, db);
    if (!realName || !db[realName]) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }

    db[realName].push(rowData);
    writeDb(db);
    res.json({ success: true, message: 'Row inserted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update row by index
app.put('/api/db/tables/:tableName/rows/:rowIndex', (req, res) => {
  try {
    const { tableName, rowIndex } = req.params;
    const idx = parseInt(rowIndex);
    const rowData = req.body;
    const db = readDb();
    const realName = findRealTableName(tableName, db);
    if (!realName || !db[realName]) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }
    if (idx < 0 || idx >= db[realName].length) {
      return res.status(404).json({ error: 'Row index out of range.' });
    }

    db[realName][idx] = { ...db[realName][idx], ...rowData };
    writeDb(db);
    res.json({ success: true, message: 'Row updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete row by index
app.delete('/api/db/tables/:tableName/rows/:rowIndex', (req, res) => {
  try {
    const { tableName, rowIndex } = req.params;
    const idx = parseInt(rowIndex);
    const db = readDb();
    const realName = findRealTableName(tableName, db);
    if (!realName || !db[realName]) {
      return res.status(404).json({ error: `Table '${tableName}' not found.` });
    }
    if (idx < 0 || idx >= db[realName].length) {
      return res.status(404).json({ error: 'Row index out of range.' });
    }

    db[realName].splice(idx, 1);
    writeDb(db);
    res.json({ success: true, message: 'Row deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Execute SQL query endpoint
app.post('/api/db/query', (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'No SQL query provided.' });
  }

  // Pre-process query: trim and strip trailing semicolon if exists
  let query = sql.trim();
  if (query.endsWith(';')) {
    query = query.slice(0, -1).trim();
  }
  const db = readDb();

  try {
    // 1. CREATE TABLE
    const createMatch = query.match(/create\s+table\s+(\w+)\s*\(([^)]+)\)/i);
    if (createMatch) {
      const tableName = createMatch[1];
      const columnsPart = createMatch[2];
      
      const realName = findRealTableName(tableName, db);
      if (realName) {
        throw new Error(`Table '${realName}' already exists.`);
      }

      const cols = columnsPart.split(',').map((c: string) => {
        const parts = c.trim().split(/\s+/);
        return { name: parts[0], type: parts[1] || 'TEXT' };
      });

      db[tableName] = [];
      db._schemas = db._schemas || {};
      db._schemas[tableName] = cols;
      writeDb(db);

      return res.json({
        message: `Table '${tableName}' created successfully with ${cols.length} columns.`,
        columns: ['Column Name', 'Data Type'],
        rows: cols.map((c: any) => [c.name, c.type]),
      });
    }

    // 2. DROP TABLE
    const dropMatch = query.match(/drop\s+table\s+(\w+)/i);
    if (dropMatch) {
      const tableName = dropMatch[1];
      const realName = findRealTableName(tableName, db);
      if (!realName) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }
      if (realName.toLowerCase() === 'simulationparameters' || realName.toLowerCase() === 'runlogs') {
        throw new Error('Cannot drop core system tables.');
      }
      delete db[realName];
      if (db._schemas) delete db._schemas[realName];
      writeDb(db);
      return res.json({
        message: `Table '${realName}' dropped successfully.`,
        columns: ['Status'],
        rows: [['Dropped']],
      });
    }

    // 3. INSERT INTO
    const insertMatch = query.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const colsStr = insertMatch[2];
      const valsStr = insertMatch[3];

      const realName = findRealTableName(tableName, db);
      if (!realName) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const cols = colsStr.split(',').map((c: string) => c.trim());
      const vals = splitSqlValues(valsStr).map((v: string) => {
        let trimmed = v.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          return trimmed.slice(1, -1);
        }
        if (trimmed.toLowerCase() === 'null') return null;
        if (!isNaN(Number(trimmed))) return Number(trimmed);
        return trimmed;
      });

      if (cols.length !== vals.length) {
        throw new Error(`Column count (${cols.length}) does not match value count (${vals.length}).`);
      }

      const rowObj: any = {};
      cols.forEach((col, idx) => {
        rowObj[col] = vals[idx];
      });

      db[realName].push(rowObj);
      writeDb(db);

      return res.json({
        message: `1 row inserted into '${realName}' successfully.`,
        columns: cols,
        rows: [vals],
      });
    }

    // 4. UPDATE
    const updateMatch = query.match(/update\s+(\w+)\s+set\s+(.+?)(?:\s+where\s+(.+))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];

      const realName = findRealTableName(tableName, db);
      if (!realName) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const updates: any = {};
      splitSqlValues(setClause).forEach((item: string) => {
        const eqIdx = item.indexOf('=');
        if (eqIdx === -1) return;
        const col = item.substring(0, eqIdx).trim();
        const val = item.substring(eqIdx + 1).trim();
        let parsedVal: any = val;
        if ((parsedVal.startsWith("'") && parsedVal.endsWith("'")) || (parsedVal.startsWith('"') && parsedVal.endsWith('"'))) {
          parsedVal = parsedVal.slice(1, -1);
        } else if (!isNaN(Number(parsedVal))) {
          parsedVal = Number(parsedVal);
        } else if (parsedVal.toLowerCase() === 'true') {
          parsedVal = true;
        } else if (parsedVal.toLowerCase() === 'false') {
          parsedVal = false;
        }
        updates[col] = parsedVal;
      });

      let matchCount = 0;
      db[realName] = db[realName].map((row: any) => {
        if (!whereClause || evalWhereClause(row, whereClause)) {
          matchCount++;
          return { ...row, ...updates };
        }
        return row;
      });

      writeDb(db);
      return res.json({
        message: `${matchCount} rows updated in '${realName}' successfully.`,
        columns: ['Match Count'],
        rows: [[matchCount]],
      });
    }

    // 5. DELETE
    const deleteMatch = query.match(/delete\s+from\s+(\w+)(?:\s+where\s+(.+))?$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2];

      const realName = findRealTableName(tableName, db);
      if (!realName) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      const originalCount = db[realName].length;
      if (!whereClause) {
        db[realName] = [];
      } else {
        db[realName] = db[realName].filter((row: any) => !evalWhereClause(row, whereClause));
      }

      const deletedCount = originalCount - db[realName].length;
      writeDb(db);

      return res.json({
        message: `${deletedCount} rows deleted from '${realName}' successfully.`,
        columns: ['Deleted Count'],
        rows: [[deletedCount]],
      });
    }

    // 6. SELECT
    const selectMatch = query.match(/select\s+(.+?)\s+from\s+(\w+)(?:\s+where\s+(.+?))?(?:\s+limit\s+(\d+))?$/i);
    if (selectMatch) {
      const colsStr = selectMatch[1].trim();
      const tableName = selectMatch[2].trim();
      const whereClause = selectMatch[3];
      const limitStr = selectMatch[4];

      const realName = findRealTableName(tableName, db);
      if (!realName) {
        throw new Error(`Table '${tableName}' does not exist.`);
      }

      let rowsFiltered = db[realName];
      if (whereClause) {
        rowsFiltered = rowsFiltered.filter((row: any) => evalWhereClause(row, whereClause));
      }

      let limit = rowsFiltered.length;
      if (limitStr) {
        limit = parseInt(limitStr);
      }

      const columns = colsStr === '*' ? getColumnsForTable(realName, db) : colsStr.split(',').map(c => c.trim());
      const rows = rowsFiltered.slice(0, limit).map((row: any) => {
        return columns.map(col => (row[col] !== undefined ? row[col] : null));
      });

      return res.json({
        message: `${rows.length} rows returned from '${realName}'.`,
        columns,
        rows,
      });
    }

    // Unrecognized fallback
    throw new Error("Unsupported SQL command. Supported statements include SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, and DROP TABLE.");

  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Start full-stack server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Consular Server] Running on http://localhost:${PORT}`);
  });
}

startServer();

/**
 * SQL Schema Commands (For MySQL/PostgreSQL Setup Reference):
 * 
 * CREATE DATABASE dfa_simulation;
 * USE dfa_simulation;
 * 
 * CREATE TABLE SimulationParameters (
 *     run_id VARCHAR(50) PRIMARY KEY,
 *     verifiers INT NOT NULL,
 *     cashiers INT NOT NULL,
 *     biometrics INT NOT NULL,
 *     doc_failure_prob FLOAT NOT NULL,
 *     courtesy_alloc FLOAT NOT NULL,
 *     total_applicants INT NOT NULL,
 *     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * 
 * CREATE TABLE RunLogs (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     run_id VARCHAR(50),
 *     agent_id INT NOT NULL,
 *     agent_type VARCHAR(20) NOT NULL,
 *     status VARCHAR(30) NOT NULL,
 *     initial_wait_time FLOAT NOT NULL,
 *     total_time_in_system FLOAT NOT NULL,
 *     FOREIGN KEY (run_id) REFERENCES SimulationParameters(run_id) ON DELETE CASCADE
 * );
 */
