// src/components/ChatInterface/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/utils/dateUtils';
import { verifyAddress } from '@/services/addressVerificationService';
import { getAISuggestions } from '@/services/aiSuggestionService';

interface Address {
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
function ClientSideChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentField, setCurrentField] = useState<string | null>(null);

  // Initialize agent
  const [agent] = useState(() => {
    return new UserDetailsAgent((message) => {
      // Update current field based on the message field
      if (message.field) {
        setCurrentField(message.field);
      }
      
      const normalizedMessage = {
        ...message,
        timestamp: message.timestamp instanceof Date 
          ? message.timestamp.toISOString()
          : message.timestamp
      };
      setMessages(prev => [...prev, normalizedMessage]);
    });
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


const formatAddress = (address: Address | null | undefined): string => {
  if (!address) return '';
  const { line1, line2, city, state, postalCode, country } = address;
  return [line1, line2, city && state && postalCode ? `${city}, ${state} ${postalCode}` : null, country]
    .filter(Boolean)
    .join(', ');
};
  // Handle address verification
  const handleAddressVerification = async (address: string) => {
    setIsVerifying(true);
    
    try {
      const result = await verifyAddress(address);
      
      if (result.valid) {
        // Address is valid
        addBotMessage(`Great! I've verified your address: ${result.normalizedAddress}`);
        // Pass the verified address to the agent
       agent.handleUserInput(
  `My address is ${result.normalizedAddress}`, 
  'address'
);
      } else {
        // Show suggestions for invalid address
        const suggestions = result.suggestions?.length ? result.suggestions : [];
        addBotMessage(
          `I couldn't verify that address. ${result.error || 'Please try again.'}`,
          suggestions
        );
      }
    } catch (error) {
      console.error('Address verification error:', error);
      addBotMessage('Sorry, there was an error verifying your address. Please try again later.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper to add bot messages
  const addBotMessage = (content: string, suggestions: string[] = []) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(), // Ensure consistent string format
      type: 'bot',
      suggestions
    };
    setMessages(prev => [...prev, message]);
  };

  // Helper function to validate input based on field type
  const validateInput = async (field: string, value: string): Promise<{ isValid: boolean; error?: string; suggestions?: string[] }> => {
    const trimmedValue = value.trim();
    
    // Common validation patterns
    const validations: Record<string, { pattern: RegExp; error: string; suggestions?: string[] }> = {
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        error: 'Please enter a valid email address (e.g., user@example.com)',
        suggestions: ['user@example.com', 'name@domain.com']
      },
      phone: {
        pattern: /^[0-9]{10,15}$/,
        error: 'Please enter a valid phone number (10-15 digits)',
        suggestions: ['1234567890', '9876543210']
      },
      dateOfBirth: {
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        error: 'Please enter a valid date in YYYY-MM-DD format',
        suggestions: ['1990-01-01', '1985-12-31']
      },
      fullName: {
        pattern: /^[a-zA-Z\s]{2,50}$/,
        error: 'Please enter a valid full name (2-50 letters and spaces only)'
      },
      gender: {
        pattern: /^(male|female|other|prefer not to say)$/i,
        error: 'Please select a valid option',
        suggestions: ['Male', 'Female', 'Other', 'Prefer not to say']
      }
    };

    // Required field check
    if (!trimmedValue) {
      return {
        isValid: false,
        error: 'This field is required',
        suggestions: validations[field]?.suggestions || []
      };
    }

    // Apply specific validation if available
    const validation = validations[field];
    if (validation && !validation.pattern.test(trimmedValue)) {
      try {
        // Get AI-powered suggestions for invalid input
        const aiResponse = await getAISuggestions(field, trimmedValue);
        return {
          isValid: false,
          error: validation.error,
          suggestions: [...new Set([
            ...(validation.suggestions || []),
            ...(aiResponse.suggestions || [])
          ])].slice(0, 3) // Limit to 3 suggestions max
        };
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
        // Fallback to default suggestions if AI service fails
        return {
          isValid: false,
          error: validation.error,
          suggestions: validation.suggestions || []
        };
      }
    }

    return { isValid: true };
  };

  // Handle form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputValue.trim() || isVerifying) return;

  const userInput = inputValue.trim();
  
  // Add user message to chat
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    content: userInput,
    role: 'user',
    timestamp: new Date().toISOString(),
    type: 'user',
    suggestions: []
  };
  setMessages(prev => [...prev, userMessage]);
  setInputValue('');

  // If no current field is set, ask the user to answer the previous question
  if (!currentField) {
    addBotMessage('Please answer the previous question first.');
    return;
  }

  try {
    // Validate input before processing
    const validation = await validateInput(currentField, userInput);
    if (!validation.isValid) {
      // Show error message with suggestions if available
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: validation.error || 'Invalid input',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'error',
        suggestions: validation.suggestions || []
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Process the input based on the current field
    if (currentField === 'address') {
      await handleAddressVerification(userInput);
    } else {
      agent.handleUserInput(userInput, currentField);
    }
  } catch (error) {
    console.error('Error processing input:', error);
    const errorMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: 'Sorry, something went wrong. Please try again.',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      type: 'error',
      suggestions: []
    };
    setMessages(prev => [...prev, errorMessage]);
  }
};

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // Auto-submit the suggestion
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    // @ts-ignore - we need to dispatch the event
    document.querySelector('form')?.dispatchEvent(submitEvent);
  };

  // Render messages with suggestions
  return (
    <div className="chat-interface">
      <div className="messages">
        {messages.map((message, index) => (
          <div 
  key={index} 
  className={`message ${message.type || 'text'}`.trim()}
>
  <div className="message-content">
    {message.content}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="suggestions">
                  <p>Did you mean:</p>
                  {message.suggestions.map((suggestion, i) => (
                    <div 
                      key={i}
                      className="suggestion"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="message-time">
              {formatTime(typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={currentField === 'address' ? 'Enter your address...' : 'Type your message...'}
          disabled={isVerifying}
        />
        <button type="submit" disabled={isVerifying || !inputValue.trim()}>
          {isVerifying ? 'Verifying...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

// Wrap with any providers if needed
export default function ChatInterface() {
  return <ClientSideChat />;
}