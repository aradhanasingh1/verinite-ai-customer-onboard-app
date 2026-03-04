import axios from 'axios';
const ORCHESTRATION_SERVICE_URL = 'http://localhost:4000';
interface AISuggestionResponse {
  suggestions: string[];
  explanation: string;
}
export const getAISuggestions = async (field: string, value: string): Promise<AISuggestionResponse> => {
  try {
    // For address fields, use the verification endpoint
    if (field === 'address') {
      const response = await axios.post(`${ORCHESTRATION_SERVICE_URL}/onboarding/verify-address`, {
        line1: value,  // The address agent will parse this
        city: '',
        state: '',
        postalCode: '',
        country: ' '  // Default, adjust as needed
      });
      return {
        suggestions: response.data.suggestions || [],
        explanation: response.data.explanation || 'Address verification suggestions'
      };
    }
    // For non-address fields, get suggestions from the orchestration service
    const response = await axios.post(`${ORCHESTRATION_SERVICE_URL}/api/chat/message`, {
      sessionId: 'suggestion-session',
      message: `Provide suggestions for ${field} with value: ${value}`
    });
    return {
      suggestions: [response.data.message], // Adjust based on response format
      explanation: 'AI-generated suggestions'
    };
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return {
      suggestions: getFallbackSuggestions(field, value),
      explanation: 'Default suggestions (service unavailable)'
    };
  }
};

// Fallback suggestions when AI service is unavailable
const getFallbackSuggestions = (field: string, value: string): string[] => {
  const suggestions: Record<string, string[]> = {
    email: [
      `${value.replace(/@.*$/, '')}@example.com`,
      `${value.replace(/[^a-zA-Z0-9]/g, '')}@domain.com`
    ],
    phone: [
      value.replace(/\D/g, '').slice(0, 10),
      `+1${value.replace(/\D/g, '').slice(0, 10)}`
    ],
    dateOfBirth: [
      new Date().toISOString().split('T')[0], // Today's date
      '1990-01-01'
    ],
    fullName: [
      value
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    ]
  };

  return suggestions[field] || [value];
};
