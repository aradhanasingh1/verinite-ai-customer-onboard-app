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
    phone: {
      label: 'Phone Number',
      type: 'phone',
      placeholder: '1234567890'
    },
    address: {
      label: 'Full Address',
      type: 'address',
      placeholder: '123 Main St, City, Country'
    }
  };

  constructor(onMessage: (message: ChatMessage) => void) {
    this.onMessage = onMessage;
  }

  public initialize() {
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
    suggestions?: string[]
  ): ChatMessage {
    return {
      id: uuidv4(),
      content,
      role: 'assistant',
      type,
      field,
      suggestions: suggestions || [],
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
      case 'address':
        return 'What\'s your full address (street, city, country)?';
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

    // Acknowledge
    this.onMessage(
      this.createMessage(
        `Got it! Your ${FeedbackProvider.getFieldLabel(field)} is: ${content}`,
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

  // Method to send collected data to backend session
  async syncToBackendSession(sessionId: string, apiBaseUrl: string): Promise<void> {
    try {
      const response = await fetch(`${apiBaseUrl}/chat/session/${sessionId}/sync-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: this.collectedData })
      });
      
      if (!response.ok) {
        console.warn('Failed to sync data to backend session');
      }
    } catch (error) {
      console.error('Error syncing to backend session:', error);
    }
  }

  private onComplete() {
    this.onMessage(
      this.createMessage(
        "Great! I've collected all the necessary information. Let's proceed with document verification.",
        'text',
        undefined,
        []
      )
    );
    // Here you would trigger the next agent (e.g., DocumentValidator)
  }

  getCollectedData() {
    return { ...this.collectedData };
  }
}