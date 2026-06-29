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
