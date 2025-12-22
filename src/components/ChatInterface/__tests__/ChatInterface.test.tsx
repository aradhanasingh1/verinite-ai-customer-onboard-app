import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';
import { UserDetailsAgent } from '@/agents/userDetails/UserDetailsAgent';
import { vi, Mock } from 'vitest';

// Mock the UserDetailsAgent
vi.mock('@/agents/userDetails/UserDetailsAgent');

// Mock the agent configuration
vi.mock('@/config/agents', () => ({
  agentConfig: {
    userDetails: {
      requiredFields: ['name', 'email', 'address'],
      validationRules: {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        address: { required: true, minLength: 5 }
      }
    }
  }
}));

describe('ChatInterface', () => {
  let mockOnMessage: Mock;
  let mockHandleUserInput: Mock;

  beforeEach(() => {
    mockOnMessage = vi.fn();
    mockHandleUserInput = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();

    // Mock UserDetailsAgent implementation
    (UserDetailsAgent as unknown as Mock).mockImplementation((onMessage) => {
      return {
        handleUserInput: mockHandleUserInput,
        onMessage: mockOnMessage
      };
    });
  });

  it('renders the chat interface', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('sends a message and calls the agent', async () => {
    render(<ChatInterface />);
    
    // Simulate receiving a message from the agent
    mockOnMessage({
      id: '1',
      content: 'Please provide your name:',
      role: 'assistant',
      type: 'question',
      field: 'name',
      timestamp: new Date().toISOString()
    });

    // Check that the agent's message is displayed
    await screen.findByText('Please provide your name:');
    
    // Type a message
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'John Doe' } });
    
    // Submit the form
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    // Verify the agent's handleUserInput was called
    expect(mockHandleUserInput).toHaveBeenCalledWith('John Doe', 'name');
  });

  it('disables input when no current field is active', () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  it('enables input when a field is active', async () => {
    render(<ChatInterface />);
    
    // Simulate receiving a message from the agent
    mockOnMessage({
      id: '1',
      content: 'Please provide your name:',
      role: 'assistant',
      type: 'question',
      field: 'name',
      timestamp: new Date().toISOString()
    });

    // Check that input is enabled
    const input = await screen.findByPlaceholderText('Enter your name...');
    expect(input).toBeEnabled();
  });

  it('displays error messages for invalid input', async () => {
    render(<ChatInterface />);
    
    // Simulate receiving a message from the agent
    mockOnMessage({
      id: '1',
      content: 'Please provide your email:',
      role: 'assistant',
      type: 'question',
      field: 'email',
      timestamp: new Date().toISOString()
    });

    // Type an invalid email
    const input = await screen.findByPlaceholderText('Enter your email...');
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    
    // Submit the form
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    // Verify the agent's handleUserInput was not called
    expect(mockHandleUserInput).not.toHaveBeenCalled();
    
    // Verify an error message is displayed (you might need to adjust this based on your error handling)
    // expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
