// In addressVerificationService.ts
import { addressVerificationApi } from './apiClient';

export interface AddressVerificationResult {
  valid: boolean;
  normalizedAddress?: string;
  suggestions: string[];
  error?: string;
}

export const verifyAddress = async (address: string): Promise<AddressVerificationResult> => {
  try {
    console.log('Verifying address:', address);
    const response = await addressVerificationApi.verifyAddress({
      address: {
        line1: address,
        city: '',
        state: '',
        postalCode: '',
        country: 'US'
      }
    });
    
    console.log('Verification response:', response);
    
    // Handle the response based on the proposal field
    if (response.proposal === 'approve') {
      return {
        valid: true,
        normalizedAddress: response.normalizedAddress || address,
        suggestions: []
      };
    } else {
      // If not approved, return with error message from reasons or default message
      return {
        valid: false,
        suggestions: response.suggestions || [],
        error: response.reasons?.[0] || 'Address could not be verified. Please check and try again.'
      };
    }
  } catch (error) {
    console.error('Address verification error:', error);
    return {
      valid: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Failed to verify address'
    };
  }
};
// For API route usage
export async function POST(request: Request) {
  const { address } = await request.json();
  const result = await verifyAddress(address);
  return Response.json(result);
}