import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const uploadDocument = async (file: File, sessionId: string) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/chat/session/${sessionId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const startOnboarding = async (documentId: string, documentType?: string, context?: any, agentSelection?: Record<string, string>, riskProfile?: string, sessionId?: string) => {
  const response = await axios.post(`${API_BASE_URL}/onboarding/start`, {
    documentId,
    documentType: documentType,
    customerId: context?.customerId || 'current-customer-id',
    applicationId: context?.applicationId || 'current-application-id',
    agentSelection,
    riskProfile,
    sessionId, // Pass the sessionId here
    slot: 'KYC',
    payload: {
      documentId,
      documentType,
      documents: context?.documents || [],
      applicant: context?.applicant || context || {},
      extractedFields: context?.payload?.extractedFields || {}, // Include extractedFields
      risk_tolerance: riskProfile, // Add risk tolerance inside payload for decision gateway
      riskProfile: riskProfile // Also add as riskProfile for compatibility
    },
    timestamp: new Date().toISOString(),
  });
  return response.data;
};