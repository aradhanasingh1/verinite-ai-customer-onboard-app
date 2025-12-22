interface LoanContext {
  creditScore: number;
  // Add other properties that might be used in the context
}

export const agentConfig = {
  userDetails: {
    requiredFields: ['fullName', 'email', 'phone', 'dateOfBirth'],
    validationRules: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\d{10}$/
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