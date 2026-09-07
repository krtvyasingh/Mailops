/**
 * Module: SLA Breach Predictor
 * 
 * Analyzes ticket complexity, agent queue depth, and remaining SLA window
 * to forecast probable SLA breaches before they occur.
 */

export interface SLAPrediction {
  threadId: string;
  assignedAgentId: string;
  minutesRemaining: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BREACHED';
  predictedResolutionMinutes: number;
}

export function predictSLABreach(
  threadId: string,
  assignedAgentId: string,
  slaTargetTimestamp: number,
  agentAvgResolutionMinutes: number,
  agentQueueDepth: number
): SLAPrediction {
  const now = Date.now();
  const minutesRemaining = Math.max(0, Math.round((slaTargetTimestamp - now) / 60000));
  const predictedResolutionMinutes = agentAvgResolutionMinutes * (1 + agentQueueDepth * 0.2);

  let riskLevel: SLAPrediction['riskLevel'] = 'LOW';
  if (minutesRemaining === 0) riskLevel = 'BREACHED';
  else if (predictedResolutionMinutes > minutesRemaining) riskLevel = 'HIGH';
  else if (predictedResolutionMinutes > minutesRemaining * 0.75) riskLevel = 'MEDIUM';

  return {
    threadId,
    assignedAgentId,
    minutesRemaining,
    riskLevel,
    predictedResolutionMinutes
  };
}
