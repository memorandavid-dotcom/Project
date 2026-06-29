import uuid
import math
import random
import numpy as np
import simpy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import mysql.connector

app = FastAPI(
    title="Data-Driven Consular Agent-Based Simulation",
    description="FastAPI + SimPy discrete-event simulation engine with MySQL integration."
)

# CORS configuration to allow local HTML frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schema for parameters validation
class SimulationParams(BaseModel):
    verifiers: int = Field(default=3, ge=1, le=10)
    cashiers: int = Field(default=2, ge=1, le=10)
    biometrics: int = Field(default=4, ge=1, le=10)
    doc_failure_prob: float = Field(default=0.10, ge=0.0, le=1.0)
    courtesy_alloc: float = Field(default=0.10, ge=0.0, le=1.0)
    total_applicants: int = Field(default=200, ge=50, le=1000)

class ConsularSimulation:
    def __init__(self, env, params: SimulationParams):
        self.env = env
        self.params = params
        
        # PriorityResource allows Courtesy (priority=0) to bypass Scheduled (priority=1) applicants
        self.verifiers = simpy.PriorityResource(env, capacity=params.verifiers)
        # Standard FIFO Resources
        self.cashiers = simpy.Resource(env, capacity=params.cashiers)
        self.biometrics = simpy.Resource(env, capacity=params.biometrics)
        
        self.logs = []
        self.agent_counter = 0

    def get_lognormal_service_time(self, mean=1.0, sigma=0.2):
        # Calculate parameters for normal distribution
        variance = sigma ** 2
        normal_variance = math.log(1.0 + variance / (mean ** 2))
        normal_sigma = math.sqrt(normal_variance)
        normal_mu = math.log(mean) - 0.5 * normal_variance
        
        # Sample log-normal
        return random.lognormvariate(normal_mu, normal_sigma)

    def get_exponential_service_time(self, mean=1.5):
        return random.expovariate(1.0 / mean)

    def get_triangular_service_time(self, low=4, mode=5, high=7):
        return random.triangular(low, high, mode)

    def agent_process(self, agent_id, agent_type):
        arrival_time = self.env.now
        
        # --- Stage 1: Document Verification ---
        verify_wait_start = self.env.now
        priority = 0 if agent_type == "Courtesy" else 1
        
        # Request verifier with priority
        with self.verifiers.request(priority=priority) as request:
            yield request
            verify_wait_end = self.env.now
            verify_wait_time = verify_wait_end - verify_wait_start
            
            # Service time
            service_duration = self.get_lognormal_service_time()
            yield self.env.timeout(service_duration)
            
            # Check for document verification failure
            if random.random() < self.params.doc_failure_prob:
                # Agent fails and exits system early
                total_time_in_system = self.env.now - arrival_time
                self.logs.append({
                    "agent_id": agent_id,
                    "agent_type": agent_type,
                    "status": "failed_verification",
                    "initial_wait_time": verify_wait_time,
                    "total_time_in_system": total_time_in_system
                })
                return

        # --- Stage 2: Cashier Counter ---
        cashier_wait_start = self.env.now
        with self.cashiers.request() as request:
            yield request
            cashier_wait_end = self.env.now
            cashier_wait_time = cashier_wait_end - cashier_wait_start
            
            service_duration = self.get_exponential_service_time()
            yield self.env.timeout(service_duration)

        # --- Stage 3: Biometric Station ---
        biometrics_wait_start = self.env.now
        with self.biometrics.request() as request:
            yield request
            biometrics_wait_end = self.env.now
            biometrics_wait_time = biometrics_wait_end - biometrics_wait_start
            
            service_duration = self.get_triangular_service_time()
            yield self.env.timeout(service_duration)

        # Successful completion
        total_time_in_system = self.env.now - arrival_time
        accumulated_wait = verify_wait_time + cashier_wait_time + biometrics_wait_time
        
        self.logs.append({
            "agent_id": agent_id,
            "agent_type": agent_type,
            "status": "completed",
            "initial_wait_time": accumulated_wait,
            "total_time_in_system": total_time_in_system
        })

    def arrival_generator(self):
        # 480 minutes window. Mean arrival rate to fit total_applicants
        mean_interarrival = 480.0 / self.params.total_applicants
        
        while self.agent_counter < self.params.total_applicants:
            self.agent_counter += 1
            agent_type = "Courtesy" if random.random() < self.params.courtesy_alloc else "Scheduled"
            self.env.process(self.agent_process(self.agent_counter, agent_type))
            
            # Sample next arrival spacing
            yield self.env.timeout(random.expovariate(1.0 / mean_interarrival))

@app.post("/run-simulation")
def run_simulation(params: SimulationParams):
    run_id = str(uuid.uuid4())
    
    # 1. Execute Discrete-Event Simulation using SimPy
    env = simpy.Environment()
    sim = ConsularSimulation(env, params)
    env.process(sim.arrival_generator())
    env.run() # Run until all events are processed
    
    # 2. Extract logs and calculate average wait time
    if not sim.logs:
        raise HTTPException(status_code=500, detail="Simulation run finished with empty logs.")
        
    total_wait = sum(log["initial_wait_time"] for log in sim.logs)
    avg_wait_time = total_wait / len(sim.logs)
    total_processed = len(sim.logs)

    # 3. Integrate MySQL Database Logging
    db_config = {
        "host": "localhost",
        "user": "root",
        "password": "your_secure_password",
        "database": "dfa_simulation"
    }

    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        # Insert parameters table
        insert_params_query = """
            INSERT INTO SimulationParameters 
            (run_id, verifiers, cashiers, biometrics, doc_failure_prob, courtesy_alloc, total_applicants)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_params_query, (
            run_id,
            params.verifiers,
            params.cashiers,
            params.biometrics,
            params.doc_failure_prob,
            params.courtesy_alloc,
            params.total_applicants
        ))

        # Batch insert logs using cursor.executemany
        insert_logs_query = """
            INSERT INTO RunLogs 
            (run_id, agent_id, agent_type, status, initial_wait_time, total_time_in_system)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        batch_data = [
            (
                run_id,
                log["agent_id"],
                log["agent_type"],
                log["status"],
                float(log["initial_wait_time"]),
                float(log["total_time_in_system"])
            )
            for log in sim.logs
        ]
        cursor.executemany(insert_logs_query, batch_data)
        
        connection.commit()
        cursor.close()
        connection.close()

    except mysql.connector.Error as err:
        print(f"Database insertion failed: {err}")
        # Note: In production or a connected local sandbox context, you would return error or log locally.
        # We catch the exception and proceed to return results so UI is not completely blocked, or log warning.

    return {
        "run_id": run_id,
        "total_processed": total_processed,
        "avg_wait_time": round(avg_wait_time, 4)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ==============================================================================
# SCHEMA CREATION SQL COMMANDS FOR REFERENCE:
# ==============================================================================
# 
# CREATE DATABASE dfa_simulation;
# USE dfa_simulation;
# 
# CREATE TABLE SimulationParameters (
#     run_id VARCHAR(50) PRIMARY KEY,
#     verifiers INT NOT NULL,
#     cashiers INT NOT NULL,
#     biometrics INT NOT NULL,
#     doc_failure_prob FLOAT NOT NULL,
#     courtesy_alloc FLOAT NOT NULL,
#     total_applicants INT NOT NULL,
#     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
# );
# 
# CREATE TABLE RunLogs (
#     id INT AUTO_INCREMENT PRIMARY KEY,
#     run_id VARCHAR(50),
#     agent_id INT NOT NULL,
#     agent_type VARCHAR(20) NOT NULL,
#     status VARCHAR(30) NOT NULL,
#     initial_wait_time FLOAT NOT NULL,
#     total_time_in_system FLOAT NOT NULL,
#     FOREIGN KEY (run_id) REFERENCES SimulationParameters(run_id) ON DELETE CASCADE
# );
# ==============================================================================
