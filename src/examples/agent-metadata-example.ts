// Example agent metadata for testing the enhanced FlowNode component
// This demonstrates how agent metadata from the orchestration system will be displayed

import type { AuditStep, AgentMetadata } from '../types/audit';

/**
 * Example KYC Agent Step with comprehensive metadata
 */
export const kycAgentStepExample: AuditStep = {
  id: 'step_1234567890_abc12',
  applicationId: 'sess_1234567890',
  stepKey: 'kyc_verification',
  title: 'KYC Verification Completed',
  description: 'Identity verification performed by KYC Agent',
  category: 'kyc',
  status: 'completed',
  timestamp: new Date().toISOString(),
  durationMs: 2500,
  icon: '🔍',
  agentName: 'KYC Agent',
  agentMetadata: {
    agentName: 'KYC Agent',
    agentVersion: '2.1.0',
    inputs: {
      fullName: 'John Doe',
      dateOfBirth: '1990-01-15',
      documentType: 'passport',
      documentNumber: 'AB1234567',
      country: 'USA',
    },
    outputs: {
      verificationStatus: 'verified',
      matchScore: 0.95,
      documentValid: true,
      faceMatch: true,
      livenessCheck: true,
    },
    decision: {
      outcome: 'Approved',
      confidence: 0.95,
      reasoning: 'Document is valid, face match successful, liveness check passed. High confidence verification.',
    },
    executionTime: 2500,
    context: {
      verificationMethod: 'biometric',
      documentSource: 'government_database',
      checksPerformed: ['document_validity', 'face_match', 'liveness', 'data_consistency'],
    },
  },
  createdAt: new Date().toISOString(),
  immutable: true,
};

/**
 * Example AML Agent Step with screening results
 */
export const amlAgentStepExample: AuditStep = {
  id: 'step_1234567891_def34',
  applicationId: 'sess_1234567890',
  stepKey: 'aml_screening',
  title: 'AML Screening Completed',
  description: 'Anti-money laundering screening performed by AML Agent',
  category: 'aml',
  status: 'completed',
  timestamp: new Date(Date.now() + 3000).toISOString(),
  durationMs: 1800,
  icon: '🛡️',
  agentName: 'AML Agent',
  agentMetadata: {
    agentName: 'AML Agent',
    agentVersion: '3.0.1',
    inputs: {
      fullName: 'John Doe',
      dateOfBirth: '1990-01-15',
      nationality: 'USA',
      occupation: 'Software Engineer',
      sourceOfFunds: 'Employment',
    },
    outputs: {
      screeningResult: 'clear',
      watchlistMatches: 0,
      pepStatus: false,
      sanctionsMatch: false,
      adverseMediaHits: 0,
      riskScore: 12,
    },
    decision: {
      outcome: 'Pass',
      confidence: 0.98,
      reasoning: 'No matches found in watchlists, PEP databases, or sanctions lists. Low risk profile.',
    },
    executionTime: 1800,
    context: {
      databasesChecked: ['OFAC', 'UN_Sanctions', 'EU_Sanctions', 'PEP_Database', 'Adverse_Media'],
      screeningDate: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  createdAt: new Date(Date.now() + 3000).toISOString(),
  immutable: true,
};

/**
 * Example Credit Agent Step with assessment results
 */
export const creditAgentStepExample: AuditStep = {
  id: 'step_1234567892_ghi56',
  applicationId: 'sess_1234567890',
  stepKey: 'credit_assessment',
  title: 'Credit Assessment Completed',
  description: 'Credit worthiness evaluation performed by Credit Agent',
  category: 'credit',
  status: 'completed',
  timestamp: new Date(Date.now() + 6000).toISOString(),
  durationMs: 3200,
  icon: '💳',
  agentName: 'Credit Agent',
  agentMetadata: {
    agentName: 'Credit Agent',
    agentVersion: '1.5.2',
    inputs: {
      fullName: 'John Doe',
      dateOfBirth: '1990-01-15',
      ssn: '***-**-1234',
      annualIncome: 85000,
      employmentStatus: 'employed',
      requestedCreditLimit: 10000,
    },
    outputs: {
      creditScore: 720,
      creditRating: 'Good',
      approvedCreditLimit: 8000,
      interestRate: 12.5,
      debtToIncomeRatio: 0.28,
      paymentHistory: 'excellent',
    },
    decision: {
      outcome: 'Approved',
      confidence: 0.87,
      reasoning: 'Good credit score (720), stable employment, low debt-to-income ratio. Approved with $8,000 limit.',
    },
    executionTime: 3200,
    context: {
      creditBureauUsed: 'Experian',
      tradelines: 5,
      oldestAccount: '2015-03-01',
      recentInquiries: 2,
      publicRecords: 0,
    },
  },
  createdAt: new Date(Date.now() + 6000).toISOString(),
  immutable: true,
};

/**
 * Example Address Verification Agent Step
 */
export const addressAgentStepExample: AuditStep = {
  id: 'step_1234567893_jkl78',
  applicationId: 'sess_1234567890',
  stepKey: 'address_verification',
  title: 'Address Verification Completed',
  description: 'Address validation performed by Address Verification Agent',
  category: 'address',
  status: 'completed',
  timestamp: new Date(Date.now() + 9000).toISOString(),
  durationMs: 1500,
  icon: '📍',
  agentName: 'Address Verification Agent',
  agentMetadata: {
    agentName: 'Address Verification Agent',
    agentVersion: '2.0.0',
    inputs: {
      street: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
    },
    outputs: {
      addressValid: true,
      standardizedAddress: '123 Main St, San Francisco, CA 94102, USA',
      deliverability: 'deliverable',
      residentialStatus: 'residential',
      occupancyType: 'single_family',
      matchConfidence: 0.92,
    },
    decision: {
      outcome: 'Success',
      confidence: 0.92,
      reasoning: 'Address validated against USPS database. Deliverable residential address.',
    },
    executionTime: 1500,
    context: {
      validationSource: 'USPS',
      geocode: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      lastVerified: new Date().toISOString(),
    },
  },
  createdAt: new Date(Date.now() + 9000).toISOString(),
  immutable: true,
};

/**
 * Example Agent Step with errors
 */
export const agentStepWithErrorsExample: AuditStep = {
  id: 'step_1234567894_mno90',
  applicationId: 'sess_1234567890',
  stepKey: 'risk_evaluation',
  title: 'Risk Evaluation Completed with Warnings',
  description: 'Risk assessment performed by Risk Agent with some warnings',
  category: 'risk',
  status: 'completed',
  timestamp: new Date(Date.now() + 12000).toISOString(),
  durationMs: 2800,
  icon: '⚖️',
  agentName: 'Risk Agent',
  agentMetadata: {
    agentName: 'Risk Agent',
    agentVersion: '1.8.0',
    inputs: {
      kycScore: 0.95,
      amlScore: 0.98,
      creditScore: 720,
      addressVerified: true,
      riskTolerance: 'HIGH',
    },
    outputs: {
      overallRiskScore: 25,
      riskLevel: 'low',
      recommendation: 'approve',
      flaggedFactors: [],
    },
    decision: {
      outcome: 'Escalate for Manual Review',
      confidence: 0.75,
      reasoning: 'Overall risk score is low, but some data sources had timeout issues. Recommend manual review.',
    },
    executionTime: 2800,
    errors: [
      {
        code: 'TIMEOUT_WARNING',
        message: 'Credit bureau API response time exceeded threshold (3000ms)',
        timestamp: new Date(Date.now() + 11500).toISOString(),
      },
      {
        code: 'DATA_QUALITY_WARNING',
        message: 'Address verification confidence below optimal threshold (92% < 95%)',
        timestamp: new Date(Date.now() + 11800).toISOString(),
      },
    ],
    context: {
      evaluationModel: 'risk_model_v3',
      thresholds: {
        low_risk: 30,
        medium_risk: 60,
        high_risk: 100,
      },
    },
  },
  createdAt: new Date(Date.now() + 12000).toISOString(),
  immutable: true,
};

/**
 * All example steps for testing
 */
export const allExampleSteps: AuditStep[] = [
  kycAgentStepExample,
  amlAgentStepExample,
  creditAgentStepExample,
  addressAgentStepExample,
  agentStepWithErrorsExample,
];

/**
 * Helper function to add example steps to localStorage for testing
 */
export function loadExampleStepsToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  
  const session = {
    sessionId: 'sess_1234567890',
    startedAt: new Date().toISOString(),
    applicationStatus: 'in_progress' as const,
    steps: allExampleSteps,
    applicantName: 'John Doe',
  };
  
  localStorage.setItem('verinite_audit_trail', JSON.stringify(session));
  console.log('Example agent metadata steps loaded to localStorage');
}
