export interface KYCDocumentResult {
  success: boolean;
  documentType?: string;
  extractedData?: Record<string, any>;
  error?: string;
}

export const verifyDocument = async (file: File, documentType: string): Promise<KYCDocumentResult> => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('type', documentType);

  try {
    const response = await fetch('/api/verify-document', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Document verification failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Document verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to verify document' 
    };
  }
};
