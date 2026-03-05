// In addressVerificationService.ts
import { addressVerificationApi } from './apiClient';

export interface SimpleAddress {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface AddressSuggestion {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress?: string; // For the fully formatted display string
}
export interface AddressVerificationResult {
  valid: boolean;
  normalizedAddress?: string;
  suggestions?: AddressSuggestion[];
  error?: string;
}

function formatSuggestion(suggestion: Partial<AddressSuggestion>): AddressSuggestion {
  // Ensure all required fields have default values
  const formatted: AddressSuggestion = {
    line1: suggestion.line1 || '',
    line2: suggestion.line2,
    city: suggestion.city || '',
    state: suggestion.state || '',
    postalCode: suggestion.postalCode || '',
    country: suggestion.country || '',
    // Create a nicely formatted display string
    formattedAddress: [
      suggestion.line1,
      suggestion.line2,
      [suggestion.city, suggestion.state, suggestion.postalCode].filter(Boolean).join(' '),
      suggestion.country
    ].filter(Boolean).join(', ')
  };
  return formatted;
}

export const verifyAddress = async (addressData: SimpleAddress): Promise<AddressVerificationResult> => {
  try {
    console.log('Verifying address object:', addressData);

    // Ensure all fields are present as strings (even if empty) to satisfy backend expectation
    const payload = {
      address: {
        line1: addressData.line1 || '',
        city: addressData.city || '',
        state: addressData.state || '',
        postalCode: addressData.postalCode || '',
        country: addressData.country || ''
      }
    };

    console.log('[FRONTEND] DEBUG: Address data being sent:', JSON.stringify(payload, null, 2));

    const response = await addressVerificationApi.verifyAddress(payload);

    console.log('Verification response:', response);

    if (response.verified === true || response.proposal === 'approve') {
      const normalized = response.normalizedAddress ||
        (response.data?.normalizedAddress ?
          formatAddress(response.data.normalizedAddress) :
          addressData.line1);

      return {
        valid: true,
        normalizedAddress: normalized,
        suggestions: []
      };
    } else {
      // Get raw suggestions from either root level or nested in data
      const rawSuggestions = response.suggestions || response.data?.suggestions || [];

      // Format all suggestions using our helper
      const suggestions = rawSuggestions.map((suggestion: any) =>
        formatSuggestion({
          line1: suggestion.line1 || suggestion.addressLine1 || '',
          line2: suggestion.line2 || suggestion.addressLine2,
          city: suggestion.city || suggestion.locality || '',
          state: suggestion.state || suggestion.region || '',
          postalCode: suggestion.postalCode || suggestion.postal || suggestion.postalCode || '',
          country: suggestion.country || suggestion.countryCode || ''
        })
      );

      const errorReason = response.reasons?.[0] ||
        response.data?.reasons?.[0] ||
        'Address could not be verified. Please check and try again.';

      // Check for Groq-related rejections
      if (errorReason.toLowerCase().includes('groq') ||
        response.verificationMethod === 'groq' ||
        response.data?.verificationMethod === 'groq') {
        console.warn('Address verification rejected by Groq:', { errorReason, response });
      }

      return {
        valid: false,
        suggestions,
        error: errorReason
      };
    }
  } catch (error) {
    console.error('Address verification error:', error);
    let errorMessage = 'Failed to verify address';
    if (error instanceof Error) {
      errorMessage = `Address verification failed: ${error.message}`;

      // Check if the error is related to Groq
      if (error.message.toLowerCase().includes('groq')) {
        console.warn('Groq-related error in address verification:', error);
      }
    }
    return {
      valid: false,
      suggestions: [],
      error: errorMessage
    };
  }
};
// Helper function to format address components into a single string
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;

  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country
  ].filter(Boolean);

  return parts.join(', ');
}
// For API route usage
export async function POST(request: Request) {
  const { address } = await request.json();
  const result = await verifyAddress(address);
  return Response.json(result);
}