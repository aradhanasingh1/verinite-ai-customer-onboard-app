// src/components/ChatInterface/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, User, Bot, AlertCircle, CheckCircle2, Info, ArrowRight, Activity, Settings, Settings2, ChevronDown, ShieldCheck, Zap } from 'lucide-react';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/utils/dateUtils';
import { verifyAddress } from '@/services/addressVerificationService';
import { getAISuggestions } from '@/services/aiSuggestionService';
import { verifyDocument } from '@/services/kycService';
import { DocumentUpload } from '../DocumentUpload/DocumentUpload';
import { uploadDocument, startOnboarding } from '@/services/documentService';
import { recordStep, finaliseAudit, startAuditSession, setApplicantName, getCurrentSession, getRiskToleranceAsync } from '@/lib/auditStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

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
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Sync messagesRef with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Helper to add bot messages
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

  const [showSettings, setShowSettings] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<any>(null);
  const [agentSelection, setAgentSelection] = useState<Record<string, string>>({});

  // Fetch available agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/config/agents`);
        const data = await response.json();
        setAvailableAgents(data);

        // Initialize with default/active versions
        const initialSelection: Record<string, string> = {};
        Object.entries(data).forEach(([slot, config]: [string, any]) => {
          initialSelection[slot] = config.active;
        });
        setAgentSelection(initialSelection);
      } catch (error) {
        console.error('Failed to fetch agent config:', error);
      }
    };
    fetchAgents();
  }, []);
  const initialized = useRef(false);

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

  // Start conversation and audit session
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeChatSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/session/start`, { method: 'POST' });
        const data = await response.json();
        setCurrentSessionId(data.sessionId);
        setCurrentField('fullName'); // Set the current field to fullName since backend asks for it
        addBotMessage(data.assistantMessage); // Display initial bot message
      } catch (error) {
        console.error('Failed to create chat session:', error);
        addBotMessage('Sorry, I could not start the chat session. Please try again later.');
      }
    };

    initializeChatSession();
    
    // Check if session already exists (user might have come from landing page)
    const existingSession = getCurrentSession();
    if (!existingSession) {
      console.log('[ChatInterface] No existing session, creating new one');
      startAuditSession();
    } else {
      console.log('[ChatInterface] Using existing session:', existingSession.sessionId);
    }
    
    recordStep('session_start', 'Chat Initialized', 'Customer started the onboarding chat assistant.', 'session', 'completed', { icon: '👋' });

    // Don't call agent.initialize() here - the backend already sends the first message
  }, [agent]);

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
  const handleAddressVerification = async (addressString: string) => {
    setIsVerifying(true);

    try {
      // Pass an address object, not a free-text string
      const result = await verifyAddress({
        line1: addressString,
        city: '',
        state: '',
        postalCode: '',
        country: '' // Intentionally left blank, not defaulted to 'US'
      });

      if (result.valid) {
        // Address is valid
        setShowDocumentUpload(true);
        addBotMessage(`Great! I've verified your address: ${result.normalizedAddress}`);
        // Pass the normalized address to the agent
        agent.handleUserInput(result.normalizedAddress || addressString, 'address');
        recordStep('address_verify', 'Address Verified', `Verified address: ${result.normalizedAddress}`, 'address', 'completed', {
          icon: '📍',
          detail: result.normalizedAddress,
          metadata: { provider: 'Standard Verification' }
        });
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

        // Audit Identity Steps
        if (currentField === 'fullName') {
          setApplicantName(userInput);
          recordStep('id_name', 'Name Collected', `Applicant provided full name: ${userInput}`, 'identity', 'completed', { icon: '👤' });
        } else if (currentField === 'gender') {
          recordStep('id_gender', 'Gender Collected', `Applicant identity: ${userInput}`, 'identity', 'completed', { icon: '⚥' });
        } else if (currentField === 'dateOfBirth') {
          recordStep('id_dob', 'Date of Birth Collected', `DOB recorded successfully.`, 'identity', 'completed', { icon: '📅', detail: userInput });
        }
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

      const collectedData = agent.getCollectedData();

      const parsedDocument = await verifyDocument(file, documentType);
      const parsedExtractedData = parsedDocument.success ? parsedDocument.extractedData : undefined;
      const parsedVerificationFields = parsedDocument.success
        ? (parsedDocument.verificationFields || {})
        : {};

      if (parsedDocument.success && parsedExtractedData) {
        const parsedLines = [
          parsedExtractedData.documentType ? `Type: ${parsedExtractedData.documentType}` : null,
          parsedExtractedData.name ? `Name: ${parsedExtractedData.name}` : null,
          parsedExtractedData.idNumber ? `ID Number: ${parsedExtractedData.idNumber}` : null,
        ].filter(Boolean);

        setMessages(prev => [...prev, {
          id: `ocr-${Date.now()}`,
          content: parsedLines.length
            ? `Document parsed for KYC:\n${parsedLines.join('\n')}`
            : 'Document parsed, but no major KYC fields were confidently extracted.',
          role: 'assistant',
          type: 'info',
          suggestions: [],
          timestamp: new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `ocr-warning-${Date.now()}`,
          content: `Could not extract structured KYC fields from this document: ${parsedDocument.error || 'Unknown parsing error'}`,
          role: 'assistant',
          type: 'info',
          suggestions: [],
          timestamp: new Date().toISOString(),
        }]);
      }

      // Sync enriched slots before upload so backend orchestration can use OCR output.
      if (currentSessionId) {
        const enrichedSlots = {
          ...collectedData,
          ...(parsedExtractedData?.name ? { fullName: parsedExtractedData.name } : {}),
          ...(parsedExtractedData?.idNumber ? { idNumber: parsedExtractedData.idNumber } : {}),
          ...(parsedExtractedData?.documentType ? { idType: parsedExtractedData.documentType } : {}),
        };
        console.log('[ChatInterface] Syncing collected+OCR data to backend:', enrichedSlots);

        try {
          const syncResponse = await fetch(`${API_BASE_URL}/chat/session/${currentSessionId}/sync-slots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots: enrichedSlots })
          });
          
          if (!syncResponse.ok) {
            console.warn('[ChatInterface] Sync failed with status:', syncResponse.status);
            const errorText = await syncResponse.text();
            console.warn('[ChatInterface] Sync error response:', errorText);
          } else {
            console.log('[ChatInterface] Successfully synced data to backend session');
          }
        } catch (syncError) {
          console.warn('[ChatInterface] Failed to sync data, continuing with upload:', syncError);
        }
      } else {
        console.warn('[ChatInterface] No session ID available, skipping sync');
      }

      const context = {
        customerId: 'current-customer-id', // Replace with actual customer ID
        applicationId: 'current-application-id', // Replace with actual application ID
        applicant: collectedData,
        payload: {
          extractedFields: {
            ...parsedVerificationFields,
            idType:
              parsedExtractedData?.documentType ||
              parsedVerificationFields.idType ||
              documentType,
          }
        }
      };

      // Format document type for display
      const documentTypeLabel = documentType.charAt(0).toUpperCase() + documentType.slice(1).replace(/_/g, ' ');

      setMessages(prev => [...prev, {
        id: `upload-${Date.now()}`,
        content: `📄 Document uploaded: ${documentTypeLabel}\n\nVerifying your ${documentTypeLabel.toLowerCase()}...`,
        role: 'assistant',
        type: 'text',
        timestamp: new Date().toISOString(),
        suggestions: []
      }]);

      // Ensure we have a valid session before uploading
      if (!currentSessionId) {
        console.error('[ChatInterface] No session ID available for upload');
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: 'Session not initialized. Please refresh the page and try again.',
          role: 'assistant',
          type: 'error',
          suggestions: [],
          timestamp: new Date().toISOString(),
        }]);
        return;
      }

      recordStep('doc_upload_start', 'Upload Started', `Uploading ${documentType.toUpperCase()}: ${file.name}`, 'documents', 'in_progress', { icon: '📤' });

      const uploadResponse = await uploadDocument(file, currentSessionId); // Pass sessionId
      const documentId = uploadResponse.attachmentId; // Extract documentId from upload response

      recordStep('doc_upload_success', 'Upload Success', `File ${file.name} uploaded successfully.`, 'documents', 'completed', { icon: '✅', detail: `ID: ${documentId}` });
      recordStep('kyc_start', 'KYC Orchestration', 'Handing over to Multi-Agent Orchestrator for full verification.', 'kyc', 'in_progress', { icon: '🧠', metadata: { agentSelection } });

      // Confirm the extracted details with the orchestrator to save them to session.slots
        if (uploadResponse.pendingConfirmation && currentSessionId) {
          try {
            const confirmResponse = await fetch(`${API_BASE_URL}/chat/session/${currentSessionId}/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ confirmed: true }) // Assuming auto-confirmation for now
            });
            
            if (!confirmResponse.ok) {
              console.warn('[ChatInterface] Confirm failed with status:', confirmResponse.status);
            }
          } catch (confirmError) {
            console.warn('[ChatInterface] Failed to confirm, continuing:', confirmError);
          }
        }

        // Get the current risk tolerance from the audit store
        const session = getCurrentSession();
        let riskToleranceValue = 'high'; // Default to high for auto-approval
        let riskToleranceLevel: 'HIGH' | 'LOW' = 'HIGH';
        if (session?.sessionId) {
          try {
            const riskTolerance = await getRiskToleranceAsync(session.sessionId);
            if (riskTolerance) {
              riskToleranceValue = riskTolerance.toLowerCase();
              riskToleranceLevel = riskTolerance;
              console.log(`[ChatInterface] Using risk tolerance: ${riskToleranceValue}`);
              
              // Record audit step showing risk tolerance is being applied
              const riskDescription = riskToleranceLevel === 'HIGH'
                ? 'Applying HIGH risk tolerance: Will auto-approve if document matches application.'
                : 'Applying LOW risk tolerance: Will escalate for manual review.';
              
              recordStep(
                'risk_tolerance_applied',
                `Risk Tolerance Applied: ${riskToleranceLevel}`,
                riskDescription,
                'risk',
                'completed',
                {
                  icon: riskToleranceLevel === 'HIGH' ? '🚀' : '🛡️',
                  detail: riskToleranceLevel === 'HIGH' 
                    ? 'Decision Rule: HIGH + Document Match → APPROVE' 
                    : 'Decision Rule: LOW → ESCALATE (Manual Review)',
                  metadata: {
                    level: riskToleranceLevel,
                    appliedAt: new Date().toISOString(),
                    expectedBehavior: riskToleranceLevel === 'HIGH'
                      ? 'Auto-approve on document match'
                      : 'Manual review required'
                  }
                }
              );
            }
          } catch (error) {
            console.warn('[ChatInterface] Failed to get risk tolerance, using default (high):', error);
          }
        }

        // Start the onboarding process after successful upload and confirmation
        const onboardingResponse = await startOnboarding(
        documentId, // Pass the extracted documentId
        documentType,
        context,
        agentSelection, // Pass user selection
        riskToleranceValue, // Pass the risk tolerance from the toggle
        currentSessionId ?? undefined // Pass the current sessionId
      );
      const traceId = onboardingResponse.traceId;
      setCurrentTraceId(traceId); // Set the current trace ID

      if (traceId) {
        // Poll for the final decision
        const checkStatus = async (): Promise<void> => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/onboarding/trace/${traceId}`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
              // Extract final decision from various possible locations
              let finalDecision = statusData.finalDecision ||
                statusData.result?.final ||
                statusData.result?.data?.final ||
                statusData.data?.final ||
                'PENDING';

              console.log('[ChatInterface] Final Decision:', finalDecision);
              console.log('[ChatInterface] Risk Tolerance:', riskToleranceLevel);

              // Display the final decision in chat with risk tolerance context
              const reasons = statusData.result?.reasons || statusData.result?.data?.reasons || [];
              const reasonText = reasons.length > 0 ? `\n\nReason(s):\n• ${reasons.join('\n• ')}` : '';

              let decisionMessage = '';
              if (finalDecision === 'APPROVE') {
                decisionMessage = `🎉 APPLICATION APPROVED!\n\nYour application has been automatically approved.\n\nRisk Tolerance: ${riskToleranceLevel}\nDecision: Document verification successful and risk tolerance allows auto-approval.`;
              } else if (finalDecision === 'DENY') {
                decisionMessage = `❌ APPLICATION DENIED\n\nYour application has been denied.${reasonText}\n\nRisk Tolerance: ${riskToleranceLevel}`;
              } else if (finalDecision === 'ESCALATE') {
                const escalateReason = riskToleranceLevel === 'LOW' 
                  ? 'Risk tolerance is set to LOW, requiring manual review.'
                  : 'Document verification requires additional review.';
                decisionMessage = `⚠️ MANUAL REVIEW REQUIRED\n\nYour application has been escalated for manual review.\n\nRisk Tolerance: ${riskToleranceLevel}\nReason: ${escalateReason}${reasonText}`;
              } else {
                decisionMessage = `📋 Verification status: ${finalDecision}`;
              }

              setMessages(prev => [...prev, {
                id: `decision-${Date.now()}`,
                content: decisionMessage,
                role: 'assistant',
                type: 'text',
                suggestions: [],
                timestamp: new Date().toISOString(),
              }]);

              // Mark as completed to show Audit Trail link
              setIsCompleted(true);
              setCurrentField(null); // Stop asking questions

              // Update Audit Trail with final status
              const isApproved = finalDecision === 'APPROVE';

              finaliseAudit(
                isApproved ? 'approved' : (finalDecision === 'DENY' ? 'denied' : 'escalated'),
                traceId,
                finalDecision
              );

              // Detailed Audit Record for the final step
              const finalStatusLabel = finalDecision === 'APPROVE' ? 'Approved' : (finalDecision === 'DENY' ? 'Declined' : 'Escalated');
              const finalIcon = finalDecision === 'APPROVE' ? '🏁' : (finalDecision === 'DENY' ? '❌' : '⚠️');

              recordStep('onboarding_final', `Decision: ${finalStatusLabel}`,
                `The orchestration engine has finished. Status: ${finalDecision}${reasons.length ? '. ' + reasons[0] : ''}`,
                'decision',
                finalDecision === 'APPROVE' ? 'completed' : (finalDecision === 'DENY' ? 'failed' : 'pending'),
                {
                  icon: finalIcon,
                  metadata: {
                    result: statusData.result,
                    reasons: reasons
                  }
                }
              );
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

  return (
    <div className="chat-interface shadow-2xl relative overflow-y-auto flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* Agent Selection Panel */}
      {showSettings && availableAgents && (
        <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 p-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Agent Orchestration</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="ml-auto text-[10px] text-slate-400 hover:text-white font-bold"
            >
              CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(availableAgents).map(([slot, slotConfig]: [string, any]) => (
              <div key={slot} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
                  {slot.replace('_', ' ')}
                  <span className="text-indigo-400">active</span>
                </label>
                <div className="relative">
                  <select
                    value={agentSelection[slot]}
                    onChange={(e) => setAgentSelection(prev => ({ ...prev, [slot]: e.target.value }))}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    {Object.entries(slotConfig.versions).map(([versionId, config]: [string, any]) => (
                      <option key={versionId} value={versionId}>
                        {versionId.replace('_', ' ').toUpperCase()} ({config.type})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-70">
            <div className="p-6 bg-indigo-50 rounded-3xl shadow-sm">
              <Bot size={48} className="text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-slate-700">Hello! I'm here to help with your onboarding.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message group relative ${message.role === 'user' ? 'user' : 'assistant'} ${message.type === 'error' ? 'error' : ''}`.trim()}
          >
            <div className="flex items-start gap-2">
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  {message.type === 'error' ? (
                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertCircle size={16} className="text-red-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Bot size={14} />
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className={`message-content text-sm leading-relaxed break-words whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'bg-emerald-600 text-white ml-auto max-w-[85%]' 
                    : message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                }`}>
                  {message.content}
                </div>

                <div className={`message-time text-[10px] text-slate-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  {formatTime(typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <User size={14} />
                  </div>
                </div>
              )}
            </div>

            {message.suggestions && message.suggestions.length > 0 && (
              <div className="suggestions mt-3 pl-8">
                <div className="suggestion-label flex items-center gap-1 text-xs text-slate-500 mb-2">
                  <Info size={12} />
                  <span>Quick reply</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      className="suggestion bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95 shadow-sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Document Upload Section */}
      {showDocumentUpload && (
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <CheckCircle2 size={14} />
            Step 2: Document Verification
          </div>
          <div className="upload-overlay">
            <DocumentUpload
              onUpload={handleDocumentUpload}
              disabled={isVerifying}
            />
          </div>
        </div>
      )}

      {/* Input Area - Hidden when completed */}
      {!showDocumentUpload && !isCompleted && (
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200 flex items-center gap-2">
          <div className="relative flex-1 group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentField === 'address' ? 'e.g. 123 Main St, Bengaluru, Karnataka, India' : 'Type your message...'}
              disabled={isVerifying}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {isVerifying && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isVerifying || !inputValue.trim()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 text-white disabled:opacity-50 disabled:bg-slate-300 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 shadow-md"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
}

import { NavBar } from '../NavBar/NavBar';

// Wrap with any providers if needed
export default function ChatInterface() {
  return (
    <div className="flex flex-col h-screen">
      <NavBar />
      <ClientSideChat />
    </div>
  );
}
