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
import { submitCreditApplication, pollCreditDecision } from '@/services/creditCardService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
];

const QUICK_OPTIONS: Record<string, string[]> = {
  gender: ['Male', 'Female', 'Other', 'Prefer not to say'],
  employmentStatus: ['Employed', 'Self-employed', 'Student', 'Unemployed', 'Retired'],
  payFrequency: ['Monthly', 'Bi-weekly', 'Weekly', 'Semi-monthly', 'Annual'],
  housingStatus: ['Own', 'Rent', 'Family', 'Other'],
  cardPreference: ['Cashback', 'Travel', 'Low APR', 'No preference'],
  consent: ['Yes, I agree']
};

const validateFile = (file: File, documentType: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds 10MB limit (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('Invalid file type. Allowed: PDF, JPG, PNG');
  }

  if (documentType === 'passport' && !file.name.toLowerCase().includes('passport')) {
    // Optional filename hint only
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

function ClientSideChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [isReadyForSubmit, setIsReadyForSubmit] = useState(false);
  const [applicationDecision, setApplicationDecision] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [addressNormalized, setAddressNormalized] = useState<string | null>(null);
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);

  const [agent] = useState(() => {
    return new UserDetailsAgent((message) => {
      if (message.field) {
        if (message.field === 'complete') {
          setCurrentField(null);
        } else {
          setCurrentField(message.field);
        }
      }

      if (message.metadata?.collectedData) {
        setCollectedData(message.metadata.collectedData);
        setIsReadyForSubmit(true);
        setSubmissionError(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAddressVerification = async (address: string) => {
    setIsVerifying(true);
    
    try {
      const result = await verifyAddress(address);
      const normalized = result.normalizedAddress || address;
      
      if (result.valid) {
        setShowDocumentUpload(true);
        setAddressNormalized(normalized);
        addBotMessage(`Great! I've verified your address: ${normalized}`);
        agent.handleUserInput(normalized, 'address');
      } else {
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

  const addBotMessage = (content: string, suggestions: string[] = []) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      type: 'bot',
      suggestions
    };
    setMessages(prev => [...prev, message]);
  };

  const validateInput = async (field: string, value: string): Promise<{ isValid: boolean; error?: string; suggestions?: string[] }> => {
    const trimmedValue = value.trim();
    
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
        suggestions: QUICK_OPTIONS.gender
      },
      aadhaarNumber: {
        pattern: /^\d{12}$/,
        error: 'Enter your 12-digit Aadhaar number (numbers only)',
        suggestions: ['123412341234', '999988887777']
      },
      employmentStatus: {
        pattern: /^(employed|self-employed|student|unemployed|retired)$/i,
        error: 'Select employed, self-employed, student, unemployed, or retired',
        suggestions: QUICK_OPTIONS.employmentStatus
      },
      employerName: {
        pattern: /^.{2,}$/,
        error: 'Please enter your employer or business name'
      },
      jobTitle: {
        pattern: /^.{2,}$/,
        error: 'Please enter your job title or role'
      },
      annualIncome: {
        pattern: /^[0-9,.]+$/,
        error: 'Enter your annual income as numbers only (e.g., 85000)',
        suggestions: ['60000', '85000', '120000']
      },
      payFrequency: {
        pattern: /^(monthly|bi-weekly|weekly|semi-monthly|annual)$/i,
        error: 'Select monthly, semi-monthly, bi-weekly, weekly, or annual',
        suggestions: QUICK_OPTIONS.payFrequency
      },
      housingStatus: {
        pattern: /^(own|rent|family|other)$/i,
        error: 'Select Own, Rent, Family, or Other',
        suggestions: QUICK_OPTIONS.housingStatus
      },
      housingPayment: {
        pattern: /^[0-9,.]+$/,
        error: 'Enter your monthly housing payment as numbers only',
        suggestions: ['0', '750', '1200', '1800']
      },
      cardPreference: {
        pattern: /^(cashback|travel|low apr|no preference)$/i,
        error: 'Choose cashback, travel, low APR, or no preference',
        suggestions: QUICK_OPTIONS.cardPreference
      },
      consent: {
        pattern: /^(yes|y|agree|i agree|approve)$/i,
        error: 'Please reply "yes" to continue',
        suggestions: ['Yes', 'Yes, I agree']
      }
    };

    if (!trimmedValue) {
      return {
        isValid: false,
        error: 'This field is required',
        suggestions: validations[field]?.suggestions || []
      };
    }

    const validation = validations[field];
    if (validation && !validation.pattern.test(trimmedValue)) {
      try {
        const aiResponse = await getAISuggestions(field, trimmedValue);
        return {
          isValid: false,
          error: validation.error,
          suggestions: [...new Set([
            ...(validation.suggestions || []),
            ...(aiResponse.suggestions || [])
          ])].slice(0, 3)
        };
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
        return {
          isValid: false,
          error: validation.error,
          suggestions: validation.suggestions || []
        };
      }
    }

    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isVerifying) return;

    const userInput = inputValue.trim();
    
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

    if (!currentField && !isReadyForSubmit) {
      addBotMessage('Please answer the previous question first.');
      return;
    }

    try {
      const validation = currentField ? await validateInput(currentField, userInput) : { isValid: true };
      if (!validation.isValid) {
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

      if (currentField === 'address') {
        await handleAddressVerification(userInput);
      } else if (currentField) {
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

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    // @ts-ignore - dispatching form submit programmatically
    document.querySelector('form')?.dispatchEvent(submitEvent);
  };

  const handleDocumentUpload = async (file: File, documentType: string) => {
    try {
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
        customerId: 'current-customer-id',
        applicationId: 'current-application-id'
      };

      const uploadResponse = await uploadDocument(file, documentType, context);
      
      const documentTypeLabel = DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType;
      setMessages(prev => [...prev, {
        id: `doc-${Date.now()}`,
        content: `${documentTypeLabel} uploaded successfully! Starting verification...`,
        role: 'assistant',
        type: 'text', 
        suggestions: [], 
        timestamp: new Date().toISOString(),
      }]);
      
      const onboardingResponse = await startOnboarding(uploadResponse.documentId, documentType, context);
      const traceId = onboardingResponse.traceId;
      
      if (traceId) {
        const checkStatus = async (): Promise<void> => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/onboarding/trace/${traceId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
              const finalDecision = statusData.finalDecision || 
                                   statusData.result?.final || 
                                   statusData.result?.data?.final ||
                                   statusData.data?.final ||
                                   'PENDING';
              
              const decisionMessage = finalDecision === 'APPROVE' 
                ? 'Verification approved! Your document has been verified successfully.'
                : finalDecision === 'DENY'
                ? 'Verification denied. Please review your document and try again.'
                : finalDecision === 'ESCALATE'
                ? `Verification requires manual review. We will contact you shortly. Status: ${statusData.status}`
                : `Verification status: ${finalDecision}`;
              
              setMessages(prev => [...prev, {
                id: `decision-${Date.now()}`,
                content: decisionMessage,
                role: 'assistant',
                type: 'text',
                suggestions: [],
                timestamp: new Date().toISOString(),
              }]);
            } else if (statusData.status === 'pending') {
              setTimeout(checkStatus, 1000);
            } else {
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

  const buildApplicationPayload = () => {
    const parseNumber = (value: string) => {
      const numeric = parseFloat((value || '').replace(/[^0-9.]/g, ''));
      return isNaN(numeric) ? undefined : numeric;
    };

    return {
      applicant: {
        fullName: collectedData.fullName,
        gender: collectedData.gender,
        email: collectedData.email,
        phone: collectedData.phone,
        dateOfBirth: collectedData.dateOfBirth,
        aadhaarNumber: collectedData.aadhaarNumber,
        address: addressNormalized || collectedData.address,
        employmentStatus: collectedData.employmentStatus,
        employerName: collectedData.employerName,
        jobTitle: collectedData.jobTitle,
        annualIncome: parseNumber(collectedData.annualIncome),
        payFrequency: collectedData.payFrequency,
        housingStatus: collectedData.housingStatus,
        housingPayment: parseNumber(collectedData.housingPayment)
      },
      productPreferences: {
        cardPreference: collectedData.cardPreference
      },
      consents: {
        creditCheck: collectedData.consent
      }
    };
  };

  const pollDecisionStatus = async (traceId: string) => {
    try {
      const statusResponse = await pollCreditDecision(traceId);
      const status = statusResponse.status || (statusResponse as any).result?.status;
      if (status === 'completed') {
        const decision =
          (statusResponse as any).finalDecision ||
          statusResponse.data?.finalDecision ||
          (statusResponse as any).result?.finalDecision ||
          (statusResponse as any).result?.final ||
          'PENDING';
        setApplicationDecision(decision);
        addBotMessage(`Application decision: ${decision}`);
      } else if (status === 'failed') {
        setSubmissionError('Application failed during processing.');
        addBotMessage('Application failed during processing. Please try again.');
      } else {
        setTimeout(() => pollDecisionStatus(traceId), 1200);
      }
    } catch (error) {
      console.error('Error polling decision:', error);
      setSubmissionError('Could not retrieve decision status.');
    }
  };

  const handleSubmitApplication = async () => {
    if (!isReadyForSubmit || isSubmittingApp) return;

    setIsSubmittingApp(true);
    setSubmissionError(null);
    setApplicationDecision(null);

    try {
      const payload = buildApplicationPayload();
      const response = await submitCreditApplication(payload);
      addBotMessage('Submitted your credit card application. I will check the decision shortly.');
      setIsReadyForSubmit(false);
      if (response.traceId) {
        setLatestTraceId(response.traceId);
        pollDecisionStatus(response.traceId);
      }
    } catch (error) {
      console.error('Submit application error:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      setSubmissionError(message);
      addBotMessage('Sorry, I could not submit the application. Please try again.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

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
            {message.field && QUICK_OPTIONS[message.field]?.length ? (
              <div className="suggestions quick-options">
                {QUICK_OPTIONS[message.field].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSuggestionClick(option)}
                    className="suggestion-button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showDocumentUpload && (
        <div className="p-4 border-t">
          <DocumentUpload 
            onUpload={handleDocumentUpload} 
            disabled={isVerifying}
          />
        </div>
      )}

      {isReadyForSubmit && (
        <div className="p-4 border-t bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Review & Submit</h3>
              <p className="text-xs text-gray-600">I have all the details needed for your credit card application.</p>
            </div>
            <button
              type="button"
              onClick={handleSubmitApplication}
              disabled={isSubmittingApp}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmittingApp ? 'Submitting...' : 'Submit application'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
            {Object.entries(collectedData).map(([key, value]) => (
              <div key={key} className="rounded border border-gray-200 p-2">
                <div className="font-medium">{key}</div>
                <div className="text-gray-800 break-words">{String(value)}</div>
              </div>
            ))}
          </div>
          {applicationDecision && (
            <div className="text-sm font-medium text-green-700">
              Decision: {applicationDecision}
            </div>
          )}
          {submissionError && (
            <div className="text-sm text-red-600">
              {submissionError}
            </div>
          )}
          {latestTraceId && (
            <div className="text-[11px] text-gray-500">Tracking ID: {latestTraceId}</div>
          )}
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

export default function ChatInterface() {
  return <ClientSideChat />;
}
