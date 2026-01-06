// src/agents/userDetails/UserDetailsAgent.ts
import { v4 as uuidv4 } from 'uuid';
import { agentConfig } from '@/config/agents';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { ChatMessage } from '@/types/chat';

type FieldType = 'text' | 'select' | 'date' | 'phone' | 'email' | 'address';

interface FieldConfig {
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
}

export class UserDetailsAgent {
  private collectedData: Record<string, any> = {};
  private currentFieldIndex: number = 0;
  private onMessage: (message: ChatMessage) => void;

  private fieldConfigs: Record<string, FieldConfig> = {
    fullName: {
      label: 'Full Name',
      type: 'text',
      placeholder: 'John Doe'
    },
    gender: {
      label: 'Gender',
      type: 'select',
      options: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    email: {
      label: 'Email Address',
      type: 'email',
      placeholder: 'john@example.com'
    },
    dateOfBirth: {
      label: 'Date of Birth',
      type: 'date',
      placeholder: 'YYYY-MM-DD'
    },
    aadhaarNumber: {
      label: 'Aadhaar Number',
      type: 'text',
      placeholder: '123412341234'
    },
    phone: {
      label: 'Phone Number',
      type: 'phone',
      placeholder: '1234567890'
    },
    address: {
      label: 'Full Address',
      type: 'address',
      placeholder: '123 Main St, City, Country'
    },
    employmentStatus: {
      label: 'Employment Status',
      type: 'select',
      options: ['Employed', 'Self-employed', 'Student', 'Unemployed', 'Retired']
    },
    employerName: {
      label: 'Employer or Business',
      type: 'text',
      placeholder: 'Acme Corp'
    },
    jobTitle: {
      label: 'Job Title / Role',
      type: 'text',
      placeholder: 'Product Manager'
    },
    annualIncome: {
      label: 'Annual Income',
      type: 'text',
      placeholder: '75000'
    },
    payFrequency: {
      label: 'Pay Frequency',
      type: 'select',
      options: ['Monthly', 'Bi-weekly', 'Weekly', 'Semi-monthly', 'Annual']
    },
    housingStatus: {
      label: 'Housing Status',
      type: 'select',
      options: ['Own', 'Rent', 'Family', 'Other']
    },
    housingPayment: {
      label: 'Monthly Housing Payment',
      type: 'text',
      placeholder: '1200'
    },
    cardPreference: {
      label: 'Card Preference',
      type: 'select',
      options: ['Cashback', 'Travel', 'Low APR', 'No preference']
    },
    consent: {
      label: 'Consent',
      type: 'select',
      options: ['Yes, I agree']
    }
  };

  constructor(onMessage: (message: ChatMessage) => void) {
    this.onMessage = onMessage;
    this.initializeConversation();
  }

  private initializeConversation() {
    this.askForNextField();
  }

  private getCurrentField() {
    return agentConfig.userDetails.requiredFields[this.currentFieldIndex];
  }

  private createMessage(
    content: string, 
    type: ChatMessage['type'], 
    field?: string,
    suggestions?: string[],
    metadata?: Record<string, any>
  ): ChatMessage {
    return {
      id: uuidv4(),
      content,
      role: 'assistant',
      type,
      field,
      suggestions: suggestions || [],
      metadata,
      timestamp: new Date()
    };
  }

  private getFieldPrompt(field: string): string {
    const config = this.fieldConfigs[field];
    if (!config) return `Please provide your ${field}:`;

    switch (field) {
      case 'fullName':
        return "What's your full name?";
      case 'gender':
        return 'How do you identify yourself?';
      case 'email':
        return 'What\'s your email address?';
      case 'dateOfBirth':
        return 'When were you born? (YYYY-MM-DD)';
      case 'phone':
        return 'What\'s your phone number?';
      case 'aadhaarNumber':
        return 'Please provide your 12-digit Aadhaar number.';
      case 'address':
        return 'What\'s your full address (street, city, country)?';
      case 'employmentStatus':
        return 'What is your employment status?';
      case 'employerName':
        return 'Who is your employer or business name?';
      case 'jobTitle':
        return 'What is your current job title or role?';
      case 'annualIncome':
        return 'What is your annual income (numbers only)?';
      case 'payFrequency':
        return 'How often are you paid?';
      case 'housingStatus':
        return 'What is your housing status? (Own, Rent, Family, Other)';
      case 'housingPayment':
        return 'What is your monthly housing payment? Enter 0 if none.';
      case 'cardPreference':
        return 'What type of credit card would you prefer? (Cashback, Travel, Low APR, No preference)';
      case 'consent':
        return 'Do you consent to a credit check and electronic signature? Reply "yes" to proceed.';
      default:
        return `Please provide your ${field}:`;
    }
  }

  private askForNextField() {
    const field = this.getCurrentField();
    if (!field) {
      this.onComplete();
      return;
    }

    const config = this.fieldConfigs[field];
    const prompt = this.getFieldPrompt(field);
    
    const message = this.createMessage(
      prompt,
      'question',
      field,
      config?.type === 'select' ? config.options : undefined
    );
    
    this.onMessage(message);
  }

  async handleUserInput(content: string, field: string): Promise<void> {
    // Validate the input
    const error = FeedbackProvider.getValidationError(
      field, 
      content, 
      agentConfig.userDetails.validationRules
    );

    if (error) {
      this.onMessage(this.createMessage(error, 'error', field, []));
      return;
    }

    // Store the data
    this.collectedData[field] = content;
    this.currentFieldIndex++;

    const acknowledgedValue = this.maskSensitive(field, content);
    // Acknowledge
    this.onMessage(
      this.createMessage(
        `Got it! Your ${FeedbackProvider.getFieldLabel(field)} is: ${acknowledgedValue}`,
        'text',
        field,
        []
      )
    );

    // Move to next field or complete
    if (this.currentFieldIndex < agentConfig.userDetails.requiredFields.length) {
      setTimeout(() => this.askForNextField(), 500);
    } else {
      this.onComplete();
    }
  }

  private onComplete() {
    const summaryLines = Object.entries(this.collectedData).map(
      ([key, value]) => `${FeedbackProvider.getFieldLabel(key)}: ${this.maskSensitive(key, value)}`
    );

    this.onMessage(
      this.createMessage(
        "Great! I've collected all the necessary information. Review the summary below and submit your application when you're ready.",
        'info',
        'complete',
        [],
        {
          collectedData: { ...this.collectedData },
          summary: summaryLines
        }
      )
    );
    // Here you would trigger the next agent (e.g., DocumentValidator)
  }

  getCollectedData() {
    return { ...this.collectedData };
  }

  private maskSensitive(field: string, value: string) {
    if (field === 'annualIncome' || field === 'housingPayment') {
      const numeric = value.replace(/[^0-9.]/g, '');
      return numeric ? `$${numeric}` : value;
    }
    if (field === 'aadhaarNumber') {
      const digits = value.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      return digits.length > 4 ? `********${last4}` : value;
    }
    return value;
  }
}
