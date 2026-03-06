import { Dispatch, SetStateAction } from "react";
export interface SuccessStepProps {
  onNewSubmission: () => void;
  finalDecision?: string | null;
}
export interface FormData {
  fullName: string;
  email: string;
  gender: string;
  cibilScore: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  idType: string;
  idNumber: string;
  dateOfBirth: string;
  occupation: string;
  annualIncome: string;
  sourceOfFunds: string;
  purposeOfAccount: string;
  termsAccepted: boolean;
}

export interface VerifiedAddress {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
export interface VerificationResult {
  isValid: boolean;
  message: string;
  verifiedAddress?: string;
}

export interface FormStepProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  verifiedAddress?: VerifiedAddress | null;
  setErrors?: (errors: Record<string, string>) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onExtractedDataChange?: (data: any) => void;
}

export type Proposal = 'approve' | 'deny' | 'escalate';
export interface AgentOutput {
  proposal: Proposal;
  confidence: number;
  reasons: string[];
  policy_refs: string[];
  flags: Record<string, any>;
  metadata?: {
    agent_name?: string;
    version?: string;
    slot?: string;
    [key: string]: any;
  };
}

export interface AgentContext {
    customerId: string;
    applicationId: string;
    slot: string;
    payload: Record<string, any>;
}