// src/types/audit.ts
// Core TypeScript interfaces and types for risk tolerance audit enhancement

/**
 * Risk tolerance level determines the approval threshold for applications
 * - HIGH: Applications are automatically approved
 * - LOW: Applications are escalated for manual review
 */
export type RiskToleranceLevel = 'HIGH' | 'LOW';

/**
 * Application status represents the final outcome of a customer onboarding application
 */
export type ApplicationStatus = 
  | 'in_progress' 
  | 'approved' 
  | 'denied' 
  | 'escalated' 
  | 'pending';

/**
 * Step category classifies the type of processing step in the audit trail
 */
export type StepCategory = 
  | 'session' 
  | 'identity' 
  | 'address' 
  | 'documents' 
  | 'kyc' 
  | 'aml' 
  | 'credit' 
  | 'risk' 
  | 'decision';

/**
 * Step status indicates the current state of a processing step
 */
export type StepStatus = 
  | 'completed' 
  | 'in_progress' 
  | 'failed' 
  | 'skipped' 
  | 'pending';

/**
 * Risk tolerance record tracks changes to risk tolerance levels
 */
export interface RiskToleranceRecord {
  id: string;
  applicationId: string;
  level: RiskToleranceLevel;
  setBy: string; // userId
  setAt: string; // ISO timestamp
  previousLevel?: RiskToleranceLevel;
}

/**
 * Application status record tracks the determination of application outcomes
 */
export interface ApplicationStatusRecord {
  applicationId: string;
  status: ApplicationStatus;
  determinedBy: 'risk_tolerance' | 'manual_review' | 'agent_decision';
  riskTolerance?: RiskToleranceLevel;
  updatedAt: string;
  reason?: string;
}

/**
 * Agent metadata captures comprehensive information about agent processing steps
 */
export interface AgentMetadata {
  agentName: string;
  agentVersion?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  decision?: {
    outcome: string;
    confidence?: number;
    reasoning?: string;
  };
  executionTime: number; // milliseconds
  errors?: Array<{
    code: string;
    message: string;
    timestamp: string;
  }>;
  context?: Record<string, unknown>;
}

/**
 * Enhanced audit step with agent metadata support
 */
export interface AuditStep {
  id: string;
  applicationId: string;
  stepKey: string;
  title: string;
  description: string;
  detail?: string;
  category: StepCategory;
  status: StepStatus;
  timestamp: string;
  durationMs?: number;
  icon?: string;
  
  // Agent metadata fields
  agentName: string;
  agentMetadata: AgentMetadata;
  
  // Immutability tracking
  createdAt: string;
  immutable: boolean; // Always true after creation
  
  // Legacy support
  metadata?: Record<string, unknown>;
}

/**
 * Audit filters for filtering agent process steps
 */
export interface AuditFilters {
  agentNames: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories: StepCategory[];
  statuses: StepStatus[];
}
