import { jest } from '@jest/globals';
import { createElement } from 'react';
import * as RTL from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MockedClass } from 'jest-mock';
import ChatInterface from '@/components/ChatInterface/ChatInterface';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import type { ChatMessage } from '@/types/chat';

// Mock the UserDetailsAgent
jest.mock('@/agents/userDetails/UserDetailsAgent');

// Mock the agent configuration
jest.mock('@/config/agents', () => ({
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
  const mockOnMessage = jest.fn();
  const mockHandleUserInput = jest.fn(async (_content: string, _field: string) => undefined);
  const mockGetCollectedData = jest.fn(() => ({} as ReturnType<UserDetailsAgent['getCollectedData']>));

  // Mock UserDetailsAgent implementation
  (UserDetailsAgent as unknown as MockedClass<typeof UserDetailsAgent>).mockImplementation(
    (_onMessage: (message: ChatMessage) => void) =>
      ({
        handleUserInput: mockHandleUserInput,
        getCollectedData: mockGetCollectedData
      } as unknown as jest.Mocked<UserDetailsAgent>)
  );

  const utils = RTL.render(createElement(ChatInterface));
  
  return {
    ...utils,
    mockHandleUserInput,
    mockOnMessage,
    mockGetCollectedData,
    user: userEvent.setup(),
    // Helper to simulate agent message
    simulateAgentMessage: (message: Partial<ChatMessage>) => {
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
      const input = utils.getByRole('textbox');
      await userEvent.type(input, text);
      const form = utils.container.querySelector('form');
      if (!form) {
        throw new Error('Chat form not found');
      }
      RTL.fireEvent.submit(form);
    }
  };
};
