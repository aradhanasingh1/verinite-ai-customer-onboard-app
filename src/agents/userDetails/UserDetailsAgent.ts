// src/agents/userDetails/UserDetailsAgent.ts
import { v4 as uuidv4 } from 'uuid';
import { agentConfig } from '@/config/agents';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { ChatMessage } from '@/types/chat';

export class UserDetailsAgent {
  private collectedData: Record<string, any> = {};
  private currentFieldIndex: number = 0;
  private onMessage: (message: ChatMessage) => void;

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

  private createMessage(content: string, type: ChatMessage['type'], field?: string): ChatMessage {
    return {
      id: uuidv4(),
      content,
      role: 'assistant',
      type,
      field,
      timestamp: new Date()
    };
  }

  private askForNextField() {
    const field = this.getCurrentField();
    if (!field) {
      this.onComplete();
      return;
    }

    const fieldLabel = FeedbackProvider.getFieldLabel(field);
    const message = this.createMessage(
      `Please provide your ${fieldLabel}:`,
      'question',
      field
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
      this.onMessage(this.createMessage(error, 'error'));
      return;
    }

    // Store the data
    this.collectedData[field] = content;
    this.currentFieldIndex++;

    // Acknowledge
    this.onMessage(
      this.createMessage(
        `Got it! Your ${FeedbackProvider.getFieldLabel(field)} is: ${content}`,
        'text'
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
    this.onMessage(
      this.createMessage(
        "Great! I've collected all the necessary information. Let's proceed with document verification.",
        'text'
      )
    );
    // Here you would trigger the next agent (e.g., DocumentValidator)
  }

  getCollectedData() {
    return { ...this.collectedData };
  }
}