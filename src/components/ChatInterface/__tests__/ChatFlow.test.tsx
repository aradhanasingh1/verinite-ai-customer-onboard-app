import { screen, waitFor } from '@testing-library/react';
import { setupChatTest } from '@/test-utils/chatTestUtils';
import { vi } from 'vitest';

// Mock services
vi.mock('@/services/addressVerificationService', () => ({
  verifyAddress: vi.fn()
}));

vi.mock('@/services/kycService', () => ({
  verifyDocument: vi.fn()
}));

describe('Chat Flow - Address and KYC Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes address verification and KYC document flow', async () => {
    const { user, mockHandleUserInput, mockOnMessage } = setupChatTest();
    
    // Mock services
    const { verifyAddress } = await import('@/services/addressVerificationService');
    const { verifyDocument } = await import('@/services/kycService');
    
    (verifyAddress as any).mockResolvedValue({
      valid: true,
      normalizedAddress: '123 Main St, Anytown, CA 12345',
      suggestions: []
    });

    (verifyDocument as any).mockResolvedValue({
      success: true,
      documentType: 'passport',
      extractedData: { /* extracted fields */ }
    });

    // --- PHASE 1: Name Collection ---
    mockOnMessage({
      id: '1',
      content: 'Please provide your full name:',
      role: 'assistant',
      type: 'question',
      field: 'name'
    });

    await user.type(
      await screen.findByPlaceholderText('Enter your full name...'), 
      'John Doe'
    );
    screen.getByRole('form').dispatchEvent(new Event('submit', { cancelable: true }));

    // --- PHASE 2: Address Collection ---
    mockOnMessage({
      id: '2',
      content: 'Please provide your address:',
      role: 'assistant',
      type: 'question',
      field: 'address'
    });

    const addressInput = await screen.findByPlaceholderText('Enter your address...');
    await user.type(addressInput, '123 Main St');
    screen.getByRole('form').dispatchEvent(new Event('submit', { cancelable: true }));

    await waitFor(() => {
      expect(verifyAddress).toHaveBeenCalledWith('123 Main St');
    });

    // --- PHASE 3: Document Upload ---
    mockOnMessage({
      id: '3',
      content: 'Please upload a government-issued ID:',
      role: 'assistant',
      type: 'document_upload',
      field: 'document'
    });

    // Test document upload
    const file = new File(['test'], 'passport.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(verifyDocument).toHaveBeenCalled();
    });
  });

  it('handles address verification with suggestions', async () => {
    const { user, mockOnMessage } = setupChatTest();
    
    const { verifyAddress } = await import('@/services/addressVerificationService');
    (verifyAddress as any).mockResolvedValue({
      valid: false,
      suggestions: ['123 Main Street', '123 Main St, Anytown']
    });

    mockOnMessage({
      id: '1',
      content: 'Please provide your address:',
      role: 'assistant',
      type: 'question',
      field: 'address'
    });

    await user.type(
      await screen.findByPlaceholderText('Enter your address...'),
      '123 Main'
    );
    screen.getByRole('form').dispatchEvent(new Event('submit', { cancelable: true }));

    // Verify suggestions are shown
    await screen.findByText('Did you mean one of these?');
    expect(screen.getByText('123 Main Street')).toBeInTheDocument();
  });
});
