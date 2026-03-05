export interface KYCExtractedField {
  key: string;
  value: string;
  confidence: number | null;
}

export interface KYCDocumentResult {
  success: boolean;
  documentType?: string;
  documentTypeConfidence?: number | null;
  extractedData?: {
    name: string | null;
    documentType: string;
    idNumber: string | null;
    rawText: string;
    fields: KYCExtractedField[];
  };
  verificationFields?: Record<string, string>;
  modelInfo?: {
    ocrModel: string;
    extractionModel: string;
  };
  warnings?: string[];
  error?: string;
  statusCode?: number;
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

    const responseJson = (await response.json()) as KYCDocumentResult;
    if (!response.ok) {
      return {
        success: false,
        error: responseJson.error || 'Document verification failed',
        statusCode: response.status,
      };
    }

    return responseJson;
  } catch (error) {
    console.error('Document verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify document',
    };
  }
};
