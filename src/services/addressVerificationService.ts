export interface AddressVerificationResult {
  valid: boolean;
  normalizedAddress?: string;
  suggestions?: string[];
  error?: string;
}

export const verifyAddress = async (address: string): Promise<AddressVerificationResult> => {
  try {
    const response = await fetch('/api/verify-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    
    if (!response.ok) {
      throw new Error('Address verification failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Address verification error:', error);
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Failed to verify address' 
    };
  }
};
