// src/services/apiClient.ts
import axios, { AxiosInstance } from 'axios';

// Configuration
const ORCHESTRATION_SERVICE_URL = '/api/chat';
const ADDRESS_VERIFICATION_SERVICE_URL = '/api/verify';
// Create axios instances for each service
const orchestrationClient: AxiosInstance = axios.create({
  baseURL: ORCHESTRATION_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const addressVerificationClient: AxiosInstance = axios.create({
  baseURL: ADDRESS_VERIFICATION_SERVICE_URL,
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
  verifyAddress: async (addressData: any, document?: File) => {
    const formData = new FormData();
    Object.entries(addressData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    if (document) {
      formData.append('document', document);
    }

    const response = await addressVerificationClient.post(
      '/api/v1/verify',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};