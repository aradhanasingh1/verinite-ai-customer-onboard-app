import axios, { AxiosInstance } from 'axios';

const ORCHESTRATION_SERVICE_URL = 'http://localhost:4000';

// const ADDRESS_VERIFICATION_SERVICE_URL = process.env.NEXT_PUBLIC_ADDRESS_VERIFICATION_SERVICE_URL || '/api/verify-address';

const orchestrationClient: AxiosInstance = axios.create({
  baseURL: ORCHESTRATION_SERVICE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Add request interceptor for logging
orchestrationClient.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
});
// Add response interceptor for error handling
orchestrationClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url);
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    return Promise.reject(error);
  }
);
const addressVerificationClient: AxiosInstance = axios.create({
  baseURL: ORCHESTRATION_SERVICE_URL, // Point to orchestration service
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chatbot API
export const chatbotApi = {
  // Session management
  createSession: async () => {
    const response = await orchestrationClient.post('/api/sessions');
    return response.data;
  },

  // Chat interactions
  sendMessage: async (sessionId: string, message: string, files: File[] = []) => {
    const formData = new FormData();
    formData.append('message', message);
    
    // Add files if any
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await orchestrationClient.post(
      `/api/sessions/${sessionId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Get session status
  getSessionStatus: async (sessionId: string) => {
    const response = await orchestrationClient.get(`/api/sessions/${sessionId}/status`);
    return response.data;
  },
};

// Address Verification API
export const addressVerificationApi = {
  verifyAddress: async (addressData: any) => {
    try {
      console.log('Sending address for verification:', addressData);
      const response = await orchestrationClient.post(
        '/onboarding/verify-address',
        {
          address: {
            line1: addressData.address?.line1 || addressData.line1 || '',
            city: addressData.address?.city || '',
            state: addressData.address?.state || '',
            postalCode: addressData.address?.postalCode || '',
            country: addressData.address?.country || ''
          }
        },
        {
          timeout: 30000
        }
      );
      console.log('Received verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in address verification API call:', error);
      throw error;
    }
  }
};