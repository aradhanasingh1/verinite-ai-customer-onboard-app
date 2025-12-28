// src/components/ChatInterface/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/utils/dateUtils';
import { verifyAddress } from '@/services/addressVerificationService';
import { getAISuggestions } from '@/services/aiSuggestionService';
import { DocumentUpload } from '../DocumentUpload/DocumentUpload';
import { uploadDocument, startOnboarding } from '@/services/documentService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
];

// File validation function
const validateFile = (file: File, documentType: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds 10MB limit (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: PDF, JPG, PNG`);
  }

  // Document type-specific validations
  if (documentType === 'passport' && !file.name.toLowerCase().includes('passport')) {
    // Optional: warn if filename doesn't match document type
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

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
const [showDocumentUpload, setShowDocumentUpload] = useState(false);
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
        setShowDocumentUpload(true);
        addBotMessage(`Great! I've verified your address: ${result.normalizedAddress}`);
        // Pass the verified address to the agent
       agent.handleUserInput(
  `My address is ${result.normalizedAddress}`, 
  'address'
);
      } else {
        // Show suggestions for invalid address
      const suggestions = result.suggestions?.length 
  ? result.suggestions.map(suggestion => 
      typeof suggestion === 'string' ? suggestion : suggestion.formattedAddress || 
      `${suggestion.line1}${suggestion.line2 ? ', ' + suggestion.line2 : ''}, ${suggestion.city}, ${suggestion.state} ${suggestion.postalCode}`
    ) 
  : [];
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

const handleDocumentUpload = async (file: File, documentType: string) => {
  try {
    // Validate file before upload
    const fileValidation = validateFile(file, documentType);
    if (!fileValidation.isValid) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: `Validation Error: ${fileValidation.errors.join(', ')}`,
        role: 'assistant',
        type: 'error',
        suggestions: [],
        timestamp: new Date().toISOString(),
      }]);
      return;
    }

    const context = {
      customerId: 'current-customer-id', // Replace with actual customer ID
      applicationId: 'current-application-id' // Replace with actual application ID
    };

    const uploadResponse = await uploadDocument(file, documentType, context);
    
    // Add upload success message with document type info
    const documentTypeLabel = DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType;
    setMessages(prev => [...prev, {
      id: `doc-${Date.now()}`,
      content: `✅ ${documentTypeLabel} uploaded successfully! Starting verification...`,
      role: 'assistant',
      type: 'text', 
      suggestions: [], 
      timestamp: new Date().toISOString(),
    }]);
    
    // Start the onboarding process after successful upload
    const onboardingResponse = await startOnboarding(uploadResponse.documentId, documentType, context);
    const traceId = onboardingResponse.traceId;
    
    if (traceId) {
      // Poll for the final decision
      const checkStatus = async (): Promise<void> => {
        try {
          const statusResponse = await fetch(`${API_BASE_URL}/onboarding/trace/${traceId}`);
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'completed') {
            // Extract final decision from various possible locations
            const finalDecision = statusData.finalDecision || 
                                 statusData.result?.final || 
                                 statusData.result?.data?.final ||
                                 statusData.data?.final ||
                                 'PENDING';
            
            // Display the final decision in chat
            const decisionMessage = finalDecision === 'APPROVE' 
              ? '✅ Verification approved! Your document has been verified successfully.'
              : finalDecision === 'DENY'
              ? '❌ Verification denied. Please review your document and try again.'
              : finalDecision === 'ESCALATE'
              ? `⚠️ Verification requires manual review. We will contact you shortly.Status:  ${statusData.finalDecision} `
              : `📋 Verification status: ${finalDecision}`;
            
            setMessages(prev => [...prev, {
              id: `decision-${Date.now()}`,
              content: decisionMessage,
              role: 'assistant',
              type: 'text',
              suggestions: [],
              timestamp: new Date().toISOString(),
            }]);
          } else if (statusData.status === 'pending') {
            // Still processing, check again after a delay
            setTimeout(checkStatus, 1000);
          } else {
            // Error or unknown status
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              content: 'Verification status could not be determined. Please try again.',
              role: 'assistant',
              type: 'error',
              suggestions: [],
              timestamp: new Date().toISOString(),
            }]);
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            content: 'Error checking verification status. Please try again later.',
            role: 'assistant',
            type: 'error',
            suggestions: [],
            timestamp: new Date().toISOString(),
          }]);
        }
      };
      
      // Start polling after a short delay
      setTimeout(checkStatus, 1000);
    }
    
    return onboardingResponse;
  } catch (error) {
    console.error('Document upload failed:', error);
    setMessages(prev => [...prev, {
      id: `error-${Date.now()}`,
      content: 'Failed to upload document. Please try again.',
      role: 'assistant',
      type: 'error',
      suggestions: [],
      timestamp: new Date().toISOString(),
    }]);
    throw error;
  }
};
 // In the ChatInterface component, update the return statement to this:
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
          </div>
          <div className="message-time">
            {formatTime(typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp)}
          </div>
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
      ))}
      <div ref={messagesEndRef} />
    </div>

    {/* Show document upload after address verification */}
    {showDocumentUpload && (
      <div className="p-4 border-t">
        <DocumentUpload 
          onUpload={handleDocumentUpload} 
          disabled={isVerifying}
        />
      </div>
    )}

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