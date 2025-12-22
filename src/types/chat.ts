export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date | string;  // Allow both Date and string
  type?: 'text' | 'error' | 'info' | 'question' | 'suggestion';
  field?: string;
  metadata?: Record<string, any>;
}