// src/components/ChatInterface/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { ChatMessage } from '@/types/chat';
import { formatTime } from '@/utils/dateUtils';
import { verifyAddress } from '@/services/addressVerificationService';

// Log orchestration events
const logOrchestration = (event: string, data: any) => {
  console.log(`[Orchestration] ${event}:`, data);
  // In a real app, you would send this to your orchestration service
};

// Client-side only chat component
function ClientSideChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize agent
  const [agent] = useState(() => {
    return new UserDetailsAgent((message) => {
      const normalizedMessage = {
        ...message,
        timestamp: message.timestamp instanceof Date 
          ? message.timestamp.toISOString()
          : message.timestamp
      };
      setMessages(prev => [...prev, normalizedMessage]);
      setCurrentField(normalizedMessage.field || null);
    });
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDocumentUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    logOrchestration('DocumentUploadStarted', { fileName: file.name, type: file.type });

    try {
      const formData = new FormData();
      formData.append('document', file);
      
      // Call KYC service via orchestration
      logOrchestration('KYCDocumentSubmission', { field: currentField });
      
      // In a real app, this would be an API call to your orchestration layer
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        logOrchestration('KYCSuccess', { documentType: result.documentType });
        
        // Get Groq suggestions for the uploaded document
        const suggestions = await getGroqSuggestions('document_verification', {
          documentType: result.documentType,
          status: 'verified'
        });
        
        // Add suggestions to the chat
        if (suggestions && suggestions.length > 0) {
          setMessages(prev => [...prev, {
            id: `suggestion-${Date.now()}`,
            content: `Here are some suggestions based on your document:\n${suggestions.join('\n')}`,
            role: 'assistant',
            type: 'suggestion',
            timestamp: new Date()
          }]);
        }
      } else {
        throw new Error(result.error || 'Document verification failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      logOrchestration('KYCError', { error: error.message });
      
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: 'Failed to process document. Please try again.',
        role: 'assistant',
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getGroqSuggestions = async (context: string, data: any) => {
    try {
      logOrchestration('GroqRequest', { context, data });
      
      const response = await fetch('/api/groq/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, data })
      });
      
      const result = await response.json();
      logOrchestration('GroqResponse', { context, result });
      
      return result.suggestions || [];
    } catch (error) {
      console.error('Error getting Groq suggestions:', error);
      return [];
    }
  };

  // Update the handleSubmit function in ChatInterface.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if ((!inputValue.trim() && !currentField?.startsWith('document_')) || !currentField) return;

  // Log user input to orchestration
  logOrchestration('UserInput', { 
    field: currentField, 
    value: currentField === 'address' ? '***' : inputValue // Mask sensitive data
  });

  // Add user message
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: inputValue,
    role: 'user',
    type: 'text',
    field: currentField,
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInputValue('');

  // Process address through orchestration
  if (currentField === 'address') {
    try {
      const response = await fetch('/api/orchestration/verify-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: inputValue })
      });

      const result = await response.json();
      
      if (result.valid) {
        // Address is valid, proceed with the agent
        agent.handleUserInput(inputValue, currentField);
      } else {
        // Show validation error
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: result.message || 'Please enter a valid address',
          role: 'assistant',
          type: 'error',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Address verification error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: 'Failed to verify address. Please try again.',
        role: 'assistant',
        type: 'error',
        timestamp: new Date()
      }]);
    }
  } else {
    // For non-address fields, proceed normally
    agent.handleUserInput(inputValue, currentField);
  }
};

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.content}
              <div className="text-xs opacity-70 mt-1">
                {formatTime(new Date(message.timestamp))}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Document Upload Input */}
      {currentField?.startsWith('document_') && (
        <div className="p-4 border-t">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])}
            className="hidden"
            id="document-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="document-upload"
            className={`flex items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer ${
              isUploading ? 'opacity-50' : 'hover:border-blue-500'
            }`}
          >
            {isUploading ? (
              <span className="text-gray-500">Uploading document...</span>
            ) : (
              <span className="text-gray-600">
                Click or drag to upload {currentField.replace('document_', '')}
              </span>
            )}
          </label>
        </div>
      )}

      {/* Text Input */}
      {!currentField?.startsWith('document_') && (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type={currentField === 'email' ? 'email' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                currentField
                  ? `Enter your ${currentField.replace('_', ' ')}...`
                  : 'Type your message...'
              }
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!currentField}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || !currentField}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ChatInterface() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Return a simple placeholder during SSR
  if (!isMounted) {
    return (
      <div className="h-[600px] max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
        <div className="h-full flex items-center justify-center">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  // Render the actual chat interface on the client side
  return <ClientSideChat />;
}