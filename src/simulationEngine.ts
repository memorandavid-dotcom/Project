import { SimulationParams, AgentEventLog, QueueLengthLog, ResourceUtilizationLog, SimulationResult, AgentType } from './types.js';

// Random sampling helpers
function sampleUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function sampleExponential(mean: number): number {
  return -Math.log(1 - Math.random()) * mean;
}

// Box-Muller transform for standard normal Z ~ N(0, 1)
function sampleStandardNormal(): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random(); // Avoid ln(0)
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Log-normal distribution helper
function sampleLognormal(mean: number, sigma: number): number {
  // Translate target mean and standard deviation of log-normal to the parameters mu and sigma of underlying normal
  const variance = sigma * sigma;
  const meanSquared = mean * mean;
  const normalVariance = Math.log(1 + variance / meanSquared);
  const normalSigma = Math.sqrt(normalVariance);
  const normalMu = Math.log(mean) - 0.5 * normalVariance;
  
  const z = sampleStandardNormal();
  return Math.exp(normalMu + normalSigma * z);
}

// Triangular distribution helper
function sampleTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const f = (mode - min) / (max - min);
  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

// Event interface
interface SimEvent {
  time: number;
  priority: number; // secondary ordering
  id: number;       // event creation order for tie-breaking
  callback: () => void;
}

export function runConsularSimulation(
  params: SimulationParams,
  runId: string = Math.random().toString(36).substring(2, 11)
): SimulationResult {
  const { verifiers, cashiers, biometrics, doc_failure_prob, courtesy_alloc, total_applicants } = params;
  const simDuration = 480; // 480 minutes operational window

  // Event Queue
  let eventList: SimEvent[] = [];
  let eventCounter = 0;

  function scheduleEvent(time: number, priority: number, callback: () => void) {
    eventList.push({ time, priority, id: eventCounter++, callback });
    // Keep sorted by time (ascending), then priority (ascending), then id (ascending)
    eventList.sort((a, b) => {
      if (Math.abs(a.time - b.time) > 1e-9) {
        return a.time - b.time;
      }
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.id - b.id;
    });
  }

  // State Variables
  let simTime = 0;
  const logs: AgentEventLog[] = [];
  const queueHistory: QueueLengthLog[] = [];
  const utilizationHistory: ResourceUtilizationLog[] = [];

  // Resource Tracks
  let verifiersBusy = 0;
  let cashiersBusy = 0;
  let biometricsBusy = 0;

  // Queues
  // Verifier Queue is prioritized: Courtesy applicants first, then Scheduled.
  // We represent queue elements as agent IDs or references.
  interface AgentInQueue {
    agentId: number;
    agentType: AgentType;
    arrivalTime: number;
    verifyWaitStart: number;
  }
  const verifierQueue: AgentInQueue[] = [];

  interface SimpleAgentInQueue {
    agentId: number;
    agentType: AgentType;
    arrivalTime: number;
    waitStart: number;
  }
  const cashierQueue: SimpleAgentInQueue[] = [];
  const biometricsQueue: SimpleAgentInQueue[] = [];

  // Logs mapping
  const agentLogsMap = new Map<number, Partial<AgentEventLog>>();

  // Helper to record timeseries state
  function recordMetrics(time: number) {
    // Avoid double recording identical timestamp states unless needed, but keeping high fidelity
    queueHistory.push({
      time: parseFloat(time.toFixed(4)),
      verify_queue: verifierQueue.length,
      cashier_queue: cashierQueue.length,
      biometrics_queue: biometricsQueue.length,
    });
    utilizationHistory.push({
      time: parseFloat(time.toFixed(4)),
      verifiers_busy: verifiersBusy,
      cashiers_busy: cashiersBusy,
      biometrics_busy: biometricsBusy,
    });
  }

  // --- 1. Arrival Logic ---
  // Arrivals follow an exponential distribution to fit total_applicants within 480 minutes
  const meanInterarrivalTime = simDuration / total_applicants;

  let currentArrivalAgentId = 0;
  let nextArrivalTime = 0;

  function handleAgentArrival(agentId: number) {
    // Determine Agent Type based on courtesy_alloc
    const isCourtesy = Math.random() < courtesy_alloc;
    const agentType: AgentType = isCourtesy ? 'Courtesy' : 'Scheduled';

    // Create partial log
    agentLogsMap.set(agentId, {
      run_id: runId,
      agent_id: agentId,
      agent_type: agentType,
      arrival_time: simTime,
      verify_wait_start: simTime,
    });

    // Proceed to verification stage
    handleVerifyRequest(agentId, agentType);

    // Schedule next arrival if we haven't reached total_applicants
    if (currentArrivalAgentId < total_applicants - 1) {
      currentArrivalAgentId++;
      const interarrival = sampleExponential(meanInterarrivalTime);
      nextArrivalTime += interarrival;
      if (nextArrivalTime <= simDuration) {
        scheduleEvent(nextArrivalTime, 2, () => handleAgentArrival(currentArrivalAgentId));
      }
    }
  }

  // Schedule very first arrival
  const firstInter = sampleExponential(meanInterarrivalTime);
  nextArrivalTime = firstInter;
  if (nextArrivalTime <= simDuration) {
    scheduleEvent(nextArrivalTime, 2, () => handleAgentArrival(currentArrivalAgentId));
  }

  // --- 2. Document Verification Stage (Priority Queue) ---
  function handleVerifyRequest(agentId: number, agentType: AgentType) {
    recordMetrics(simTime);
    if (verifiersBusy < verifiers) {
      // Allocate immediately
      verifiersBusy++;
      startVerify(agentId, agentType);
    } else {
      // Queue up
      verifierQueue.push({
        agentId,
        agentType,
        arrivalTime: simTime,
        verifyWaitStart: simTime,
      });
      // Sort priority queue: Courtesy (0) first, Scheduled (1) second.
      verifierQueue.sort((a, b) => {
        const priorityA = a.agentType === 'Courtesy' ? 0 : 1;
        const priorityB = b.agentType === 'Courtesy' ? 0 : 1;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.arrivalTime - b.arrivalTime; // FIFO within same priority
      });
      recordMetrics(simTime);
    }
  }

  function startVerify(agentId: number, agentType: AgentType) {
    const log = agentLogsMap.get(agentId)!;
    log.verify_service_start = simTime;
    log.verify_wait_time = parseFloat((simTime - log.verify_wait_start!).toFixed(4));

    // Service time follows log-normal distribution (mean=1.0, sigma=0.2)
    const serviceTime = sampleLognormal(1.0, 0.2);
    log.verify_service_time = parseFloat(serviceTime.toFixed(4));
    
    scheduleEvent(simTime + serviceTime, 1, () => endVerify(agentId, agentType));
  }

  function endVerify(agentId: number, agentType: AgentType) {
    verifiersBusy--;
    recordMetrics(simTime);

    const log = agentLogsMap.get(agentId)!;
    log.verify_service_end = simTime;

    // Check document failure probability
    const failed = Math.random() < doc_failure_prob;
    if (failed) {
      log.status = 'failed_verification';
      log.departure_time = parseFloat(simTime.toFixed(4));
      log.total_time_in_system = parseFloat((simTime - log.arrival_time!).toFixed(4));
      log.cashier_wait_start = null;
      log.cashier_service_start = null;
      log.cashier_service_end = null;
      log.cashier_wait_time = null;
      log.cashier_service_time = null;
      log.biometrics_wait_start = null;
      log.biometrics_service_start = null;
      log.biometrics_service_end = null;
      log.biometrics_wait_time = null;
      log.biometrics_service_time = null;
      log.initial_wait_time = log.verify_wait_time!;
      
      logs.push(log as AgentEventLog);
    } else {
      // Proceed to cashier queue
      log.cashier_wait_start = simTime;
      handleCashierRequest(agentId, agentType);
    }

    // Process next agent in verification priority queue
    if (verifierQueue.length > 0) {
      const nextAgent = verifierQueue.shift()!;
      verifiersBusy++;
      recordMetrics(simTime);
      startVerify(nextAgent.agentId, nextAgent.agentType);
    } else {
      recordMetrics(simTime);
    }
  }

  // --- 3. Cashier Stage (Standard FIFO Queue) ---
  function handleCashierRequest(agentId: number, agentType: AgentType) {
    recordMetrics(simTime);
    if (cashiersBusy < cashiers) {
      cashiersBusy++;
      startCashier(agentId, agentType);
    } else {
      cashierQueue.push({
        agentId,
        agentType,
        arrivalTime: simTime,
        waitStart: simTime,
      });
      recordMetrics(simTime);
    }
  }

  function startCashier(agentId: number, agentType: AgentType) {
    const log = agentLogsMap.get(agentId)!;
    log.cashier_service_start = simTime;
    log.cashier_wait_time = parseFloat((simTime - log.cashier_wait_start!).toFixed(4));

    // Service time follows exponential distribution (mean=1.5)
    const serviceTime = sampleExponential(1.5);
    log.cashier_service_time = parseFloat(serviceTime.toFixed(4));

    scheduleEvent(simTime + serviceTime, 1, () => endCashier(agentId, agentType));
  }

  function endCashier(agentId: number, agentType: AgentType) {
    cashiersBusy--;
    recordMetrics(simTime);

    const log = agentLogsMap.get(agentId)!;
    log.cashier_service_end = simTime;

    // Proceed to Biometrics Stage
    log.biometrics_wait_start = simTime;
    handleBiometricsRequest(agentId, agentType);

    // Process next agent in Cashier FIFO queue
    if (cashierQueue.length > 0) {
      const nextAgent = cashierQueue.shift()!;
      cashiersBusy++;
      recordMetrics(simTime);
      startCashier(nextAgent.agentId, nextAgent.agentType);
    } else {
      recordMetrics(simTime);
    }
  }

  // --- 4. Biometrics Stage (Standard FIFO Queue) ---
  function handleBiometricsRequest(agentId: number, agentType: AgentType) {
    recordMetrics(simTime);
    if (biometricsBusy < biometrics) {
      biometricsBusy++;
      startBiometrics(agentId, agentType);
    } else {
      biometricsQueue.push({
        agentId,
        agentType,
        arrivalTime: simTime,
        waitStart: simTime,
      });
      recordMetrics(simTime);
    }
  }

  function startBiometrics(agentId: number, agentType: AgentType) {
    const log = agentLogsMap.get(agentId)!;
    log.biometrics_service_start = simTime;
    log.biometrics_wait_time = parseFloat((simTime - log.biometrics_wait_start!).toFixed(4));

    // Service time follows triangular distribution (min=4, mode=5, max=7)
    const serviceTime = sampleTriangular(4, 5, 7);
    log.biometrics_service_time = parseFloat(serviceTime.toFixed(4));

    scheduleEvent(simTime + serviceTime, 1, () => endBiometrics(agentId, agentType));
  }

  function endBiometrics(agentId: number, agentType: AgentType) {
    biometricsBusy--;
    recordMetrics(simTime);

    const log = agentLogsMap.get(agentId)!;
    log.biometrics_service_end = simTime;
    log.status = 'completed';
    log.departure_time = parseFloat(simTime.toFixed(4));
    log.total_time_in_system = parseFloat((simTime - log.arrival_time!).toFixed(4));
    log.initial_wait_time = parseFloat(
      (log.verify_wait_time! + log.cashier_wait_time! + log.biometrics_wait_time!).toFixed(4)
    );

    logs.push(log as AgentEventLog);

    // Process next agent in Biometrics FIFO queue
    if (biometricsQueue.length > 0) {
      const nextAgent = biometricsQueue.shift()!;
      biometricsBusy++;
      recordMetrics(simTime);
      startBiometrics(nextAgent.agentId, nextAgent.agentType);
    } else {
      recordMetrics(simTime);
    }
  }

  // --- Run Event Loop ---
  while (eventList.length > 0) {
    const nextEvent = eventList.shift()!;
    simTime = nextEvent.time;
    nextEvent.callback();
  }

  // Sort logs by agent ID to keep reports beautifully ordered
  logs.sort((a, b) => a.agent_id - b.agent_id);

  // Compute final aggregated analytics
  const completions = logs.filter(l => l.status === 'completed');
  const totalProcessed = logs.length;
  
  let totalVerifyWait = 0;
  let totalVerifyService = 0;
  let totalCashierWait = 0;
  let totalCashierService = 0;
  let totalBiometricsWait = 0;
  let totalBiometricsService = 0;
  let totalWaitTime = 0;
  let totalSystemTime = 0;

  logs.forEach(l => {
    totalVerifyWait += l.verify_wait_time;
    totalVerifyService += l.verify_service_time;
    totalWaitTime += l.initial_wait_time;
    totalSystemTime += l.total_time_in_system;
    
    if (l.status === 'completed') {
      totalCashierWait += l.cashier_wait_time || 0;
      totalCashierService += l.cashier_service_time || 0;
      totalBiometricsWait += l.biometrics_wait_time || 0;
      totalBiometricsService += l.biometrics_service_time || 0;
    }
  });

  const completionCount = completions.length;
  const verificationFailCount = totalProcessed - completionCount;

  return {
    run_id: runId,
    parameters: params,
    timestamp: new Date().toISOString(),
    total_processed: totalProcessed,
    avg_wait_time: totalProcessed > 0 ? parseFloat((totalWaitTime / totalProcessed).toFixed(4)) : 0,
    
    avg_verify_wait: totalProcessed > 0 ? parseFloat((totalVerifyWait / totalProcessed).toFixed(4)) : 0,
    avg_cashier_wait: completionCount > 0 ? parseFloat((totalCashierWait / completionCount).toFixed(4)) : 0,
    avg_biometrics_wait: completionCount > 0 ? parseFloat((totalBiometricsWait / completionCount).toFixed(4)) : 0,
    avg_total_wait: totalProcessed > 0 ? parseFloat((totalWaitTime / totalProcessed).toFixed(4)) : 0,
    
    avg_verify_service: totalProcessed > 0 ? parseFloat((totalVerifyService / totalProcessed).toFixed(4)) : 0,
    avg_cashier_service: completionCount > 0 ? parseFloat((totalCashierService / completionCount).toFixed(4)) : 0,
    avg_biometrics_service: completionCount > 0 ? parseFloat((totalBiometricsService / completionCount).toFixed(4)) : 0,
    avg_total_system_time: totalProcessed > 0 ? parseFloat((totalSystemTime / totalProcessed).toFixed(4)) : 0,
    
    verification_fail_count: verificationFailCount,
    completion_count: completionCount,
    
    logs,
    queue_history: queueHistory.slice(0, 1000), // Clip to avoid huge objects, but keep high enough resolution
    utilization_history: utilizationHistory.slice(0, 1000),
  };
}
