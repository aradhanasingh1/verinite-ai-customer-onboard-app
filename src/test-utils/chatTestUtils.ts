import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/components/ChatInterface/ChatInterface';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { vi, Mock } from 'vitest';

// Mock the UserDetailsAgent
vi.mock('@/agents/userDetails/UserDetailsAgent');

// Mock the agent configuration
vi.mock('@/config/agents', () => ({
  agentConfig: {
    userDetails: {
      requiredFields: ['name', 'email', 'address', 'document'],
      validationRules: {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        address: { required: true, minLength: 5 },
        document: { required: true }
      }
    }
  }
}));

export const setupChatTest = () => {
  const mockOnMessage = vi.fn();
  const mockHandleUserInput = vi.fn();

  // Mock UserDetailsAgent implementation
  (UserDetailsAgent as unknown as Mock).mockImplementation((onMessage) => {
    return {
      handleUserInput: mockHandleUserInput,
      onMessage: (msg: any) => {
        mockOnMessage(msg);
        onMessage(msg);
      }
    };
  });

  const utils = render(<ChatInterface />);
  
  return {
    ...utils,
    mockHandleUserInput,
    mockOnMessage,
    user: userEvent.setup(),
    // Helper to simulate agent message
    simulateAgentMessage: (message: any) => {
      mockOnMessage({
        id: `msg-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        timestamp: new Date().toISOString(),
        ...message
      });
    },
    // Helper to send user message
    sendUserMessage: async (text: string) => {
      const input = screen.getByRole('textbox');
      await user.type(input, text);
      fireEvent.submit(screen.getByRole('form'));
    }
  };
};
