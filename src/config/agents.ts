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
    requiredFields: [
      'fullName',
      'gender',
      'email',
      'phone',
      'dateOfBirth',
      'aadhaarNumber',
      'address',
      'employmentStatus',
      'employerName',
      'jobTitle',
      'annualIncome',
      'payFrequency',
      'housingStatus',
      'housingPayment',
      'cardPreference',
      'consent'
    ],
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
      aadhaarNumber: {
        required: true,
        pattern: /^\d{12}$/,
        error: 'Enter a 12-digit Aadhaar number (numbers only)'
      },
      address: { 
        required: true, 
        minLength: 10,
        error: 'Please enter a valid address (at least 10 characters)'
      },
      employmentStatus: {
        required: true,
        validate: (value: string) =>
          ['employed', 'self-employed', 'student', 'unemployed', 'retired'].includes(value.toLowerCase()),
        error: 'Select a valid employment status option'
      },
      employerName: {
        required: true,
        minLength: 2,
        error: 'Please enter your employer or business name'
      },
      jobTitle: {
        required: true,
        minLength: 2,
        error: 'Please enter your job title or role'
      },
      annualIncome: {
        required: true,
        validate: (value: string) => {
          const income = parseFloat(value.replace(/[^0-9.]/g, ''));
          return !isNaN(income) && income > 0;
        },
        error: 'Enter your annual income as a number'
      },
      payFrequency: {
        required: true,
        validate: (value: string) =>
          ['monthly', 'bi-weekly', 'weekly', 'semi-monthly', 'annual'].includes(value.toLowerCase()),
        error: 'Select a valid pay frequency option'
      },
      housingStatus: {
        required: true,
        validate: (value: string) =>
          ['own', 'rent', 'family', 'other'].includes(value.toLowerCase()),
        error: 'Select a valid housing status option'
      },
      housingPayment: {
        required: true,
        validate: (value: string) => {
          const payment = parseFloat(value.replace(/[^0-9.]/g, ''));
          return !isNaN(payment) && payment >= 0;
        },
        error: 'Enter your monthly housing payment as a number (0 allowed if none)'
      },
      cardPreference: {
        required: true,
        validate: (value: string) =>
          ['cashback', 'travel', 'low apr', 'no preference'].includes(value.toLowerCase()),
        error: 'Choose a card preference (cashback, travel, low APR, or no preference)'
      },
      consent: {
        required: true,
        validate: (value: string) =>
          ['yes', 'y', 'agree', 'i agree', 'approve'].includes(value.toLowerCase()),
        error: 'Please confirm consent to run a credit check (reply yes to proceed)'
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
