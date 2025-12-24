interface LoanContext {
  creditScore: number;
  // Add other properties that might be used in the context
}
export interface AgentResponse {
    status: 'success' | 'error';
    message: string;
    data?: Record<string, any>;
    error?: any;
}
export interface AddressVerificationRequest {
    address: string;
    country?: string;
    sessionId?: string;
}

export interface AddressVerificationResponse extends AgentResponse {
    data?: {
        isValid: boolean;
        normalizedAddress?: string;
        components?: Record<string, string>;
        confidence?: number;
        suggestions?: string[];
    };
}
export const agentConfig = {
  userDetails: {
    requiredFields: ['fullName', 'gender', 'email', 'dateOfBirth', 'phone', 'address'],
    validationRules: {
      fullName: { 
        required: true, 
        minLength: 2,
        error: 'Please enter your full name (at least 2 characters)'
      },
      gender: { 
        required: true,
        validate: (value: string) => 
          ['male', 'female', 'other', 'prefer not to say'].includes(value.toLowerCase()),
        error: 'Please select a valid gender option'
      },
      email: { 
        required: true, 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        error: 'Please enter a valid email address'
      },
      dateOfBirth: { 
        required: true,
        validate: (value: string) => {
          const dob = new Date(value);
          const today = new Date();
          const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
          return !isNaN(dob.getTime()) && dob <= minAgeDate;
        },
        error: 'You must be at least 18 years old'
      },
      phone: { 
        required: true, 
        pattern: /^\d{10}$/,
        error: 'Please enter a valid 10-digit phone number'
      },
      address: { 
        required: true, 
        minLength: 10,
        error: 'Please enter a valid address (at least 10 characters)'
      }
    }
  },
  documents: {
    required: [
      { type: 'PAN', alternatives: ['PAN_APPLICATION'] },
      { type: 'AADHAAR', alternatives: ['DRIVING_LICENSE', 'PASSPORT'] }
    ]
  },
  loanRules: [
    {
      condition: (ctx: LoanContext) => ctx.creditScore > 750,
      action: (ctx: LoanContext) => ({ approved: true, amount: 1000000, interestRate: 8.5 })
    }
    // More rules...
  ]
};