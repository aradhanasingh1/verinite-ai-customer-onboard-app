// src/utils/legacyMetadataParser.ts
import type { AuditStep } from '@/types/audit';

interface StateTransition {
  state: string;
  timestamp: string;
  data?: {
    agentOutput?: {
      proposal?: string;
      confidence?: number;
      reasons?: string[];
      policy_refs?: string[];
      flags?: Record<string, any>;
      metadata?: {
        agent_name?: string;
        slot?: string;
        version?: string;
        [key: string]: any;
      };
    };
    durationMs?: number;
  };
}

/**
 * Parse legacy metadata and convert state machine transitions into audit steps
 */
export function parseLegacyMetadataToSteps(metadata: any, applicationId: string): AuditStep[] {
  try {
    const result = metadata?.result || metadata;
    const stateMachine = result?.stateMachine;
    
    if (!stateMachine?.history) {
      return [];
    }

    const steps: AuditStep[] = [];
    const history: StateTransition[] = stateMachine.history;

    // Group transitions by agent/slot
    const completedStates = history.filter(t => t.state.includes('COMPLETED') && t.data?.agentOutput);

    completedStates.forEach((transition, index) => {
      const agentOutput = transition.data!.agentOutput!;
      const slot = agentOutput.metadata?.slot || 'UNKNOWN';
      const agentName = agentOutput.metadata?.agent_name || 'legacy';
      
      // Map slot to category and create step
      const category = mapSlotToCategory(slot);
      const stepKey = `${slot.toLowerCase()}_verification`;
      const title = formatSlotTitle(slot);
      
      // Determine status based on proposal
      let status: 'completed' | 'failed' | 'pending' = 'completed';
      if (agentOutput.proposal === 'deny') {
        status = 'failed';
      } else if (agentOutput.proposal === 'escalate') {
        status = 'pending';
      }

      // Create description
      const description = agentOutput.reasons && agentOutput.reasons.length > 0
        ? agentOutput.reasons[0]
        : `${title} ${agentOutput.proposal || 'completed'}`;

      // Create the audit step
      const step: AuditStep = {
        id: `legacy_${stepKey}_${index}`,
        applicationId,
        stepKey,
        title,
        description,
        category,
        status,
        timestamp: transition.timestamp,
        agentName,
        agentMetadata: {
          agentName,
          agentVersion: agentOutput.metadata?.version,
          inputs: {
            slot,
            documentType: agentOutput.metadata?.documentType,
            riskTolerance: agentOutput.metadata?.riskTolerance,
          },
          outputs: {
            proposal: agentOutput.proposal,
            confidence: agentOutput.confidence,
            reasons: agentOutput.reasons,
            policy_refs: agentOutput.policy_refs,
            flags: agentOutput.flags,
          },
          decision: {
            outcome: agentOutput.proposal?.toUpperCase() || 'UNKNOWN',
            confidence: agentOutput.confidence,
            reasoning: agentOutput.reasons?.join('; '),
          },
          executionTime: transition.data?.durationMs || 0,
        },
        createdAt: transition.timestamp,
        immutable: true,
        durationMs: transition.data?.durationMs,
        icon: getIconForCategory(category),
        metadata: {
          legacyData: true,
          originalState: transition.state,
          policyRefs: agentOutput.policy_refs,
          flags: agentOutput.flags,
        },
      };

      steps.push(step);
    });

    return steps;
  } catch (error) {
    console.error('Failed to parse legacy metadata:', error);
    return [];
  }
}

/**
 * Map slot name to audit step category
 */
function mapSlotToCategory(slot: string): 'kyc' | 'aml' | 'credit' | 'risk' | 'address' | 'decision' {
  const slotLower = slot.toLowerCase();
  
  if (slotLower.includes('kyc')) return 'kyc';
  if (slotLower.includes('aml')) return 'aml';
  if (slotLower.includes('credit')) return 'credit';
  if (slotLower.includes('risk')) return 'risk';
  if (slotLower.includes('address')) return 'address';
  
  return 'decision';
}

/**
 * Format slot name into readable title
 */
function formatSlotTitle(slot: string): string {
  const titles: Record<string, string> = {
    'KYC': 'KYC Verification',
    'AML': 'AML Screening',
    'CREDIT': 'Credit Assessment',
    'RISK': 'Risk Evaluation',
    'ADDRESS_VERIFICATION': 'Address Verification',
  };

  return titles[slot] || slot.replace(/_/g, ' ').split(' ').map(w => 
    w.charAt(0) + w.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Get icon for category
 */
function getIconForCategory(category: string): string {
  const icons: Record<string, string> = {
    kyc: '🔍',
    aml: '🛡️',
    credit: '💳',
    risk: '⚠️',
    address: '📍',
    decision: '⚖️',
  };

  return icons[category] || '📋';
}

/**
 * Check if a step has legacy metadata that can be parsed
 */
export function hasLegacyMetadata(step: AuditStep): boolean {
  return !!(step.metadata && 
    typeof step.metadata === 'object' && 
    (step.metadata as any).result?.stateMachine?.history);
}

/**
 * Extract final decision from legacy metadata
 */
export function extractFinalDecision(metadata: any): string | null {
  try {
    const result = metadata?.result || metadata;
    return result?.final || result?.finalDecision || null;
  } catch {
    return null;
  }
}
