# Consular Processing: Full-Stack Discrete-Event Simulation Dashboard

An interactive, high-fidelity full-stack simulation modeling applicant flows through a multi-stage consular office. The engine utilizes advanced discrete-event queuing and stochastic parameters to simulate Document Verification (prioritized), Cashier Counters (FIFO), and Biometric Enrollment stations. 

The dashboard provides real-time analytical reporting, high-performance telemetry charts, and an interactive **SQL database query console** to query, insert, or manipulate the local transaction database.

---

## 🚀 Key Features

* **Discrete-Event Simulation (DES)**: Accurate timing simulation mirroring SimPy paradigms, scheduling applicant arrivals, queue allocations, and stochastically-modeled service completions over an 8-hour shift (480 minutes).
* **Multi-Stage Queuing Model**:
  * **Document Verification**: Prioritized resource queue (Courtesy/Priority bypasses Scheduled applicants) with log-normal service times ($\mu = 1.0$, $\sigma = 0.2$). Includes configurable document failure probabilities.
  * **Cashier Counters**: FIFO queue with exponential service intervals ($\text{mean} = 1.5$ minutes).
  * **Biometric Stations**: FIFO queue with triangular sampling ($\text{min} = 4$, $\text{mode} = 5$, $\text{max} = 7$ minutes).
* **Full-Stack Caching DB Console**: Features an interactive SQL editor allowing real-time executions against simulated relational tables `SimulationParameters` and `RunLogs`.
* **Flexible UI Themes**: Swap between Cyber Cosmic, Emerald Terminal, and Slate Minimal styles dynamically.

---

## 🛠️ Tech Stack & Architecture

### Frontend (SPA)
* **React 19 & TypeScript**: Component-driven architecture using robust state management and TypeScript type safety.
* **Tailwind CSS**: Sleek, high-contrast, professional visual themes.
* **Lucide Icons**: Consistent, vector icon assets.
* **Recharts**: Fluent render pipelines for queue history and resource utilization timeseries graphs.

### Backend (Server)
* **Express & Node.js**: Fast API router serving the frontend assets, running simulation requests, and managing database operations.
* **Dynamic SQL Query Parser**: In-house lightweight parser supporting complex DDL & DML statements:
  * **Semicolon Immunity**: Transparently strips and resolves trailing semicolons (`;`).
  * **Case-Insensitive Table Resolvers**: Allows querying `runlogs` or `SimulationParameters` in any casing format.
  * **Quote-Aware String Extraction**: Correctly parses commas inside quoted values (e.g., `'Smith, John'` or `'Special, Courtesy'`) without disrupting tuple parsing.
* **JSON DB File Cache**: File-based persistence in `/data/dfa_simulation.json` tracking historical simulation parameter configurations and raw agent logs.

---

## 📂 Core SQL Tables Schema

### 1. `SimulationParameters`
Stores setup attributes for each discrete-event timeline run.
```sql
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
```

### 2. `RunLogs`
Maintains step-by-step transaction details for every applicant.
```sql
CREATE TABLE RunLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(50),
    agent_id INT NOT NULL,
    agent_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    initial_wait_time FLOAT NOT NULL,
    total_time_in_system FLOAT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES SimulationParameters(run_id) ON DELETE CASCADE
);
```

---

## 🌐 Backend API Documentation

### 1. Simulation Controls
* **`POST /api/run-simulation`** (or `/run-simulation`): Executes a new consular queue simulation.
  * **Body Parameters**:
    ```json
    {
      "verifiers": 3,
      "cashiers": 2,
      "biometrics": 4,
      "doc_failure_prob": 0.10,
      "courtesy_alloc": 0.15,
      "total_applicants": 200
    }
    ```
  * **Response**:
    ```json
    {
      "run_id": "run_a1b2c3d4e_1688000000",
      "total_processed": 200,
      "avg_wait_time": 4.821
    }
    ```

### 2. Historical Run Analytics
* **`GET /api/runs`**: Returns all previous simulation configurations.
* **`GET /api/runs/:runId`**: Resolves detailed reports including parameters, complete logs, and timeseries queue snapshots.
* **`DELETE /api/runs/:runId`**: Permanently removes historical records from parameters and logs caches.

### 3. Live SQL Sandbox Query Engine
* **`POST /api/db/query`**: Run a custom SQL statement.
  * **Body Parameters**:
    ```json
    { "sql": "SELECT run_id, total_applicants, avg_wait_time FROM SimulationParameters WHERE verifiers = 3 LIMIT 10;" }
    ```
  * **Supported Syntax**:
    * `SELECT <cols> FROM <table> [WHERE <clause>] [LIMIT <num>]`
    * `INSERT INTO <table> (<cols>) VALUES (<vals>)`
    * `UPDATE <table> SET <col>=<val> [WHERE <clause>]`
    * `DELETE FROM <table> [WHERE <clause>]`
    * `CREATE TABLE <table> (<cols>)`
    * `DROP TABLE <table>`

### 4. Interactive Schema Operations
* **`GET /api/db/tables`**: Query lists of tables, structural columns, and active record counts.
* **`GET /api/db/tables/:tableName/rows`**: Returns raw table arrays.
* **`POST /api/db/tables/:tableName/rows`**: Append a new row dict directly to a table.
* **`PUT /api/db/tables/:tableName/rows/:rowIndex`**: Updates a specific row.
* **`DELETE /api/db/tables/:tableName/rows/:rowIndex`**: Deletes a row index.

---

## ⚡ Setup & Development

### Dependencies Installation
```bash
npm install
```

### Run Local Development Server
Boot both Vite UI assets and Express API server seamlessly:
```bash
npm run dev
```

### Build & Start Production Server
Bundle both packages into optimized standalone execution payloads:
```bash
npm run build
npm start
```
