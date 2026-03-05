// src/lib/auditStore.ts
// Client-side audit trail store — persists onboarding steps in localStorage

import type { RiskToleranceLevel, ApplicationStatus, AgentMetadata, AuditStep } from '../types/audit';

export type StepStatus = 'completed' | 'in_progress' | 'failed' | 'skipped' | 'pending';

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

export interface AuditSession {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  applicationStatus: 'in_progress' | 'approved' | 'denied' | 'escalated' | 'pending';
  finalDecision?: string;
  traceId?: string;
  steps: AuditStep[];
  applicantName?: string;
}

const STORAGE_KEY = 'verinite_audit_trail';

function loadSession(): AuditSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuditSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Start a fresh audit session (call at beginning of onboarding) */
export function startAuditSession(applicantName?: string): AuditSession {
  const session: AuditSession = {
    sessionId: `sess_${Date.now()}`,
    startedAt: new Date().toISOString(),
    applicationStatus: 'in_progress',
    steps: [],
    applicantName,
  };
  saveSession(session);
  
  // Check if user set a default risk tolerance before starting the session
  let defaultLevel: RiskToleranceLevel = 'HIGH'; // Default to HIGH for auto-approval
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('verinite_default_risk_tolerance');
    console.log('[startAuditSession] Checking localStorage for default risk tolerance:', stored);
    if (stored === 'HIGH' || stored === 'LOW') {
      defaultLevel = stored;
      console.log('[startAuditSession] Using stored default:', defaultLevel);
    } else {
      console.log('[startAuditSession] No stored default found, using HIGH');
    }
  }
  
  console.log('[startAuditSession] Setting risk tolerance for session', session.sessionId, 'to', defaultLevel);
  
  // Set default risk tolerance (either user's choice or HIGH)
  // This ensures the API doesn't return 404 when fetching risk tolerance
  setRiskTolerance(defaultLevel, session.sessionId).catch(error => {
    console.warn('Failed to set default risk tolerance:', error);
  });
  
  return session;
}

/** Load the current session, or create one if none exists */
export function getOrCreateSession(): AuditSession {
  return loadSession() || startAuditSession();
}

/** Add a new step to the audit trail */
export function recordStep(
  stepKey: string,
  title: string,
  description: string,
  category: StepCategory,
  status: StepStatus = 'completed',
  options?: {
    detail?: string;
    icon?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }
): AuditStep {
  const session = getOrCreateSession();

  // Mark any previous "in_progress" step of the same key as completed
  session.steps = session.steps.map((s) =>
    s.stepKey === stepKey && s.status === 'in_progress'
      ? { ...s, status: 'completed' }
      : s
  );

  const timestamp = new Date().toISOString();
  
  const step: AuditStep = {
    id: generateId(),
    applicationId: session.sessionId,
    stepKey,
    title,
    description,
    category,
    status,
    timestamp,
    detail: options?.detail,
    icon: options?.icon,
    durationMs: options?.durationMs,
    metadata: options?.metadata,
    // Default values for new required fields (for backward compatibility)
    agentName: 'legacy',
    agentMetadata: {
      agentName: 'legacy',
      inputs: {},
      outputs: {},
      executionTime: options?.durationMs || 0,
    },
    createdAt: timestamp,
    immutable: true,
  };

  session.steps.push(step);
  saveSession(session);
  return step;
}

/** Update the final application status and decision */
export function finaliseAudit(
  decision: 'approved' | 'denied' | 'escalated' | 'pending',
  traceId?: string,
  finalDecision?: string
): void {
  const session = getOrCreateSession();
  session.completedAt = new Date().toISOString();
  session.applicationStatus = decision;
  session.finalDecision = finalDecision;
  session.traceId = traceId;
  saveSession(session);
}

/** Update applicant name after it's known */
export function setApplicantName(name: string): void {
  const session = getOrCreateSession();
  session.applicantName = name;
  saveSession(session);
}

/** Get the current session (read-only) */
export function getCurrentSession(): AuditSession | null {
  return loadSession();
}

/** Clear the stored audit trail */
export function clearAudit(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Risk Tolerance Management Functions
// ============================================================================

const RISK_TOLERANCE_KEY_PREFIX = 'verinite_risk_tolerance_';
const RISK_TOLERANCE_API_URL = '/api/audit/risk-tolerance';

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 100, // 100ms, 200ms, 400ms
};

/**
 * Delay helper for retry logic with exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attemptNumber: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attemptNumber >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }
    const delayMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, attemptNumber - 1);
    await delay(delayMs);
    return retryWithBackoff(fn, attemptNumber + 1);
  }
}

/**
 * Set risk tolerance level for an application
 * Persists to localStorage immediately and syncs to backend with retry logic
 * Also records an audit step explaining the risk tolerance impact
 * 
 * @param level - Risk tolerance level (HIGH or LOW)
 * @param applicationId - Unique application identifier
 * @throws Error if persistence fails after all retry attempts
 */
export async function setRiskTolerance(
  level: RiskToleranceLevel,
  applicationId: string
): Promise<void> {
  // Validate inputs
  if (!level || (level !== 'HIGH' && level !== 'LOW')) {
    throw new Error('Invalid risk tolerance level. Must be HIGH or LOW.');
  }
  if (!applicationId || applicationId.trim() === '') {
    throw new Error('Application ID is required.');
  }

  // Store in localStorage immediately for fast access
  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${RISK_TOLERANCE_KEY_PREFIX}${applicationId}`;
      localStorage.setItem(storageKey, level);
    } catch (error) {
      console.warn('Failed to store risk tolerance in localStorage:', error);
      // Continue to API persistence even if localStorage fails
    }
  }

  // Persist to backend with retry logic
  await retryWithBackoff(async () => {
    const response = await fetch(RISK_TOLERANCE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId,
        level,
        userId: 'current_user', // TODO: Replace with actual user ID from auth context
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Failed to persist risk tolerance: ${response.statusText}`
      );
    }

    return response.json();
  });

  // Record audit step explaining the risk tolerance impact
  const description = level === 'HIGH'
    ? 'Risk tolerance set to HIGH. Applications with matching documents will be automatically approved.'
    : 'Risk tolerance set to LOW. All applications will be escalated for manual review.';
  
  const expectedOutcome = level === 'HIGH'
    ? 'If document matches application → Auto-Approve. Otherwise → Standard evaluation.'
    : 'All applications → Manual Review (Escalate)';

  recordStep(
    'risk_tolerance_set',
    `Risk Tolerance: ${level}`,
    description,
    'risk',
    'completed',
    {
      icon: level === 'HIGH' ? '🚀' : '🛡️',
      detail: expectedOutcome,
      metadata: {
        level,
        timestamp: new Date().toISOString(),
        impact: {
          high: 'Auto-approve on document match',
          low: 'Manual review required'
        }[level.toLowerCase()],
        businessRule: level === 'HIGH'
          ? 'HIGH + Document Match → APPROVE'
          : 'LOW → ESCALATE (Manual Review)'
      }
    }
  );
}

/**
 * Get risk tolerance level for an application
 * Checks localStorage first, falls back to backend API if not found
 * 
 * @param applicationId - Unique application identifier
 * @returns Risk tolerance level or null if not set
 */
export function getRiskTolerance(
  applicationId: string
): RiskToleranceLevel | null {
  if (!applicationId || applicationId.trim() === '') {
    return null;
  }

  // Check localStorage first for immediate access
  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${RISK_TOLERANCE_KEY_PREFIX}${applicationId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored === 'HIGH' || stored === 'LOW') {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to read risk tolerance from localStorage:', error);
      // Fall through to return null
    }
  }

  // If not in localStorage, return null
  // Note: For async backend fallback, use getRiskToleranceAsync()
  return null;
}

/**
 * Get risk tolerance level for an application (async version with backend fallback)
 * Checks localStorage first, falls back to backend API if not found
 * 
 * @param applicationId - Unique application identifier
 * @returns Risk tolerance level or null if not set
 */
export async function getRiskToleranceAsync(
  applicationId: string
): Promise<RiskToleranceLevel | null> {
  // Try localStorage first
  const localValue = getRiskTolerance(applicationId);
  if (localValue) {
    return localValue;
  }

  // Fall back to backend API
  try {
    const response = await fetch(`${RISK_TOLERANCE_API_URL}/${applicationId}`);
    
    if (response.status === 404) {
      return null; // Not set yet
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch risk tolerance: ${response.statusText}`);
    }

    const data = await response.json();
    const level = data.level;

    // Cache in localStorage for future access
    if (typeof window !== 'undefined' && (level === 'HIGH' || level === 'LOW')) {
      try {
        const storageKey = `${RISK_TOLERANCE_KEY_PREFIX}${applicationId}`;
        localStorage.setItem(storageKey, level);
      } catch (error) {
        console.warn('Failed to cache risk tolerance in localStorage:', error);
      }
    }

    return level || null;
  } catch (error) {
    console.error('Failed to fetch risk tolerance from backend:', error);
    return null;
  }
}

/**
 * Determine application status based on risk tolerance level
 * 
 * Business logic:
 * - HIGH risk tolerance → "approved" status (automatic approval)
 * - LOW risk tolerance → "escalated" status (manual review required)
 * 
 * @param riskTolerance - Risk tolerance level
 * @returns Application status based on risk tolerance
 */
export function determineApplicationStatus(
  riskTolerance: RiskToleranceLevel
): ApplicationStatus {
  if (riskTolerance === 'HIGH') {
    return 'approved';
  } else if (riskTolerance === 'LOW') {
    return 'escalated';
  }
  
  // This should never happen with proper typing, but handle defensively
  throw new Error(`Invalid risk tolerance level: ${riskTolerance}`);
}

// ============================================================================
// Agent Step Recording Functions
// ============================================================================

const AGENT_STEP_API_URL = '/api/audit/steps';

/**
 * Validate required fields in agent metadata
 * 
 * @param metadata - Agent metadata to validate
 * @throws Error if required fields are missing or invalid
 */
function validateAgentMetadata(metadata: AgentMetadata): void {
  if (!metadata.agentName || metadata.agentName.trim() === '') {
    throw new Error('Agent metadata must include agentName');
  }
  
  if (!metadata.inputs || typeof metadata.inputs !== 'object') {
    throw new Error('Agent metadata must include inputs object');
  }
  
  if (!metadata.outputs || typeof metadata.outputs !== 'object') {
    throw new Error('Agent metadata must include outputs object');
  }
  
  if (typeof metadata.executionTime !== 'number' || metadata.executionTime < 0) {
    throw new Error('Agent metadata must include valid executionTime (non-negative number)');
  }
}

/**
 * Record an agent processing step with comprehensive metadata
 * Persists to localStorage immediately and syncs to backend with retry logic
 * 
 * @param agentName - Name of the agent performing the step
 * @param stepKey - Machine-readable key for the step
 * @param title - Human-readable title for the step
 * @param description - Description of what happened in this step
 * @param category - Category of the step (session, identity, etc.)
 * @param metadata - Comprehensive agent metadata including inputs, outputs, decisions
 * @param status - Status of the step (defaults to 'completed')
 * @returns Promise resolving to the created AuditStep
 * @throws Error if validation fails or persistence fails after all retry attempts
 */
export async function recordAgentStep(
  agentName: string,
  stepKey: string,
  title: string,
  description: string,
  category: StepCategory,
  metadata: AgentMetadata,
  status: StepStatus = 'completed'
): Promise<AuditStep> {
  // Validate required fields
  if (!agentName || agentName.trim() === '') {
    throw new Error('agentName is required');
  }
  
  if (!stepKey || stepKey.trim() === '') {
    throw new Error('stepKey is required');
  }
  
  if (!title || title.trim() === '') {
    throw new Error('title is required');
  }
  
  if (!description || description.trim() === '') {
    throw new Error('description is required');
  }
  
  // Validate agent metadata
  validateAgentMetadata(metadata);
  
  // Get current session to associate step with application
  const session = getOrCreateSession();
  const timestamp = new Date().toISOString();
  
  // Create the audit step with immutability flag
  const step: AuditStep = {
    id: generateId(),
    applicationId: session.sessionId,
    stepKey,
    title,
    description,
    category,
    status,
    timestamp,
    agentName,
    agentMetadata: metadata,
    createdAt: timestamp,
    immutable: true, // Always true after creation
    durationMs: metadata.executionTime,
  };
  
  // Store in localStorage immediately for fast access
  if (typeof window !== 'undefined') {
    try {
      // Add step to session
      session.steps.push(step);
      saveSession(session);
    } catch (error) {
      console.warn('Failed to store agent step in localStorage:', error);
      // Continue to API persistence even if localStorage fails
    }
  }
  
  // Persist to backend with retry logic
  await retryWithBackoff(async () => {
    const response = await fetch(AGENT_STEP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId: step.applicationId,
        agentName: step.agentName,
        stepKey: step.stepKey,
        title: step.title,
        description: step.description,
        category: step.category,
        status: step.status,
        metadata: step.agentMetadata,
        timestamp: step.timestamp,
        stepId: step.id,
        createdAt: step.createdAt,
        immutable: step.immutable,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Failed to persist agent step: ${response.statusText}`
      );
    }

    return response.json();
  });
  
  return step;
}
