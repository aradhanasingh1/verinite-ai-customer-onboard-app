import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const uploadDocument = async (file: File, documentType: string, context: any) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('documentType', documentType);
  formData.append('customerId', context.customerId || 'default-customer');
  formData.append('applicationId', context.applicationId || 'default-application');

  const response = await axios.post(`${API_BASE_URL}/kyc/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const startOnboarding = async (documentId: string) => {
  const response = await axios.post(`${API_BASE_URL}/onboarding/start`, {
    documentId,
    timestamp: new Date().toISOString(),
  });
  
  return response.data;
};