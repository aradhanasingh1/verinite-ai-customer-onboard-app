const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export interface CreditApplicationPayload {
  applicant: Record<string, any>;
  productPreferences?: Record<string, any>;
  consents?: Record<string, any>;
  documents?: Record<string, any>[];
}

export interface CreditApplicationResponse {
  traceId?: string;
  status?: string;
  message?: string;
  result?: Record<string, any>;
  data?: Record<string, any>;
}

export const submitCreditApplication = async (
  payload: CreditApplicationPayload
): Promise<CreditApplicationResponse> => {
  const response = await fetch('/api/credit-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to submit credit application');
  }

  return response.json();
};

export const pollCreditDecision = async (traceId: string): Promise<CreditApplicationResponse> => {
  const response = await fetch(`${API_BASE_URL}/onboarding/trace/${traceId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to check application status');
  }

  return response.json();
};
