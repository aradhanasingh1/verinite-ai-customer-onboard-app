import React, { useState, useRef } from 'react';
import { FormStepProps } from './types';
import { Upload, FileText, Loader2 } from 'lucide-react';

/**
 * Detect document type from filename
 */
function detectDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('aadhar') || lower.includes('aadhaar')) return 'aadhaar';
  if (lower.includes('license') || lower.includes('dl')) return 'drivers_license';
  if (lower.includes('pan')) return 'pan_card';
  if (lower.includes('national') || lower.includes('id')) return 'national_id';
  
  // Default to aadhaar for KYC
  return 'aadhaar';
}

/**
 * Get friendly document name
 */
function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    'passport': 'Passport',
    'aadhaar': 'Aadhaar Card',
    'drivers_license': "Driver's License",
    'pan_card': 'PAN Card',
    'national_id': 'National ID',
  };
  return names[type] || 'Identity Document';
}

const AdditionalInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors, setFormData, onExtractedDataChange }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setVerificationError('');
      
      // First, try filename-based detection as a fallback
      const filenameType = detectDocumentType(file.name);
      console.log('[AdditionalInfoStep] Filename-based detection:', filenameType);
      
      // Set initial type from filename
      setDetectedType(filenameType);
      if (setFormData) {
        setFormData({
          ...formData,
          idType: filenameType
        });
      }
      
      // Record document upload start in audit trail
      const { recordStep } = await import('@/lib/auditStore');
      recordStep(
        'doc_upload_form_start',
        'Document Upload Started',
        `User uploaded document: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        'documents',
        'in_progress',
        {
          icon: '📤',
          detail: `File: ${file.name}`,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            detectedTypeFromFilename: filenameType,
            flow: 'form'
          }
        }
      );
      
      // Then verify with AI to get accurate document type
      setIsVerifying(true);
      try {
        const formDataToSend = new FormData();
        formDataToSend.append('document', file);
        formDataToSend.append('type', 'unknown'); // Don't bias the AI with filename guess
        
        console.log('[AdditionalInfoStep] Sending document to AI for verification...');
        const response = await fetch('/api/verify-document', {
          method: 'POST',
          body: formDataToSend,
        });
        
        const result = await response.json();
        console.log('[AdditionalInfoStep] AI verification result:', result);
        
        // Helper function to extract field value from fields array
        const getFieldValue = (fields: any[], key: string): string | null => {
          if (!fields || !Array.isArray(fields)) return null;
          const field = fields.find((f: any) => f.key?.toLowerCase() === key.toLowerCase());
          return field?.value || null;
        };
        
        if (result.success && result.extractedData?.documentType) {
          const aiDetectedType = result.extractedData.documentType;
          console.log('[AdditionalInfoStep] AI detected document type:', aiDetectedType);
          
          // Normalize the AI detected type
          const normalizedType = aiDetectedType.toLowerCase().replace(/[_\s-]/g, '_');
          let finalType = normalizedType;
          
          // Map common variations
          if (normalizedType.includes('passport')) finalType = 'passport';
          else if (normalizedType.includes('aadhaar') || normalizedType.includes('aadhar')) finalType = 'aadhaar';
          else if (normalizedType.includes('driver') || normalizedType.includes('license')) finalType = 'drivers_license';
          else if (normalizedType.includes('pan')) finalType = 'pan_card';
          else if (normalizedType.includes('national')) finalType = 'national_id';
          
          console.log('[AdditionalInfoStep] Normalized type:', finalType);
          setDetectedType(finalType);
          
          // Extract all available data from document (including from fields array)
          const extractedIdNumber = result.extractedData.idNumber || result.extractedData.number || '';
          const extractedDOB = result.extractedData.dateOfBirth || 
                              result.extractedData.dob || 
                              getFieldValue(result.extractedData.fields, 'dateOfBirth') ||
                              getFieldValue(result.extractedData.fields, 'dob') ||
                              getFieldValue(result.extractedData.fields, 'date_of_birth') || '';
          const extractedAddress = result.extractedData.address || 
                                  getFieldValue(result.extractedData.fields, 'address') || '';
          const extractedName = result.extractedData.name || '';
          
          console.log('[AdditionalInfoStep] Extracted data:', {
            idNumber: extractedIdNumber,
            dateOfBirth: extractedDOB,
            address: extractedAddress,
            name: extractedName
          });
          
          // Update form data with all extracted information
          if (setFormData) {
            setFormData({
              ...formData,
              idType: finalType,
              ...(extractedIdNumber ? { idNumber: extractedIdNumber } : {}),
              ...(extractedDOB ? { dateOfBirth: extractedDOB } : {}),
              ...(extractedName ? { fullName: extractedName } : {}),
            });
          }

          // Store extracted data for display after final decision
          if (onExtractedDataChange) {
            onExtractedDataChange({
              documentType: finalType,
              name: extractedName,
              idNumber: extractedIdNumber,
              dateOfBirth: extractedDOB,
              address: extractedAddress,
              fields: result.extractedData.fields
            });
          }

          // Record OCR extraction in audit trail
          const extractedFields: Record<string, string> = {
            documentType: finalType,
            ...(extractedIdNumber ? { idNumber: extractedIdNumber } : {}),
            ...(extractedDOB ? { dateOfBirth: extractedDOB } : {}),
            ...(extractedAddress ? { address: extractedAddress } : {}),
            ...(extractedName ? { name: extractedName } : {}),
          };

          const extractedFieldsList = Object.entries(extractedFields)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

          // Import recordStep if not already imported
          const { recordStep } = await import('@/lib/auditStore');
          
          recordStep(
            'ocr_extraction_form',
            'Document Data Extracted',
            `OCR successfully extracted ${Object.keys(extractedFields).length} field(s) from the uploaded document.`,
            'documents',
            'completed',
            {
              icon: '🔍',
              detail: extractedFieldsList,
              metadata: {
                extractedFields,
                documentType: finalType,
                confidence: result.confidence || 'N/A',
                extractionMethod: 'OCR + AI',
                flow: 'form'
              }
            }
          );
        } else {
          // AI detection failed, keep filename-based detection
          console.warn('[AdditionalInfoStep] AI detection failed:', result.error || 'No document type returned');
          setVerificationError(result.error ? `AI detection failed: ${result.error}. You can manually enter the document ID below.` : 'AI detection unavailable. You can manually enter the document ID below.');
          
          // Record failed OCR extraction in audit trail
          const { recordStep } = await import('@/lib/auditStore');
          
          recordStep(
            'ocr_extraction_form_failed',
            'Document Extraction Failed',
            `OCR could not extract structured data from the document: ${result.error || 'Unknown error'}`,
            'documents',
            'failed',
            {
              icon: '⚠️',
              detail: result.error || 'No structured data extracted',
              metadata: {
                error: result.error,
                extractionMethod: 'OCR + AI',
                flow: 'form'
              }
            }
          );
        }
      } catch (error) {
        console.error('[AdditionalInfoStep] Document verification error:', error);
        setVerificationError('Could not verify document automatically. Please select document type manually.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Additional Information</h2>
      
      {/* Document Upload Section */}
      <div className="space-y-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
        <div>
          <h3 className="text-sm font-bold text-indigo-900 mb-2 uppercase tracking-wider">
            Upload Identity Document *
          </h3>
          <p className="text-xs text-indigo-700 mb-3">
            Upload any identity document (Aadhaar, Passport, Driver's License, PAN, etc.)
          </p>
        </div>

        {/* Manual Document Type Selector */}
        {/* <div className="space-y-2">
          <label className="block text-sm font-medium text-indigo-900">
            Document Type *
          </label>
          <select
            name="idType"
            value={formData.idType}
            onChange={(e) => {
              handleChange(e);
              setDetectedType(e.target.value);
            }}
            className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            required
          >
            <option value="">Select document type</option>
            <option value="passport">Passport</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="drivers_license">Driver's License</option>
            <option value="pan_card">PAN Card</option>
            <option value="national_id">National ID</option>
          </select>
          {detectedType && (
            <p className="text-xs text-indigo-600">
              {isVerifying ? '🔄 AI is analyzing your document...' : '✓ You can change this if the detection is incorrect'}
            </p>
          )}
        </div> */}

        <label
          htmlFor="document-upload"
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl text-sm font-medium transition-all cursor-pointer 
            ${selectedFile
              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
              : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100/50 text-indigo-700'
            }`}
        >
          <input
            id="document-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                {isVerifying ? (
                  <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <span className="truncate max-w-[200px] font-semibold text-slate-800">{selectedFile.name}</span>
              {isVerifying ? (
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-300 animate-pulse">
                  Verifying with AI...
                </span>
              ) : detectedType ? (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-300">
                  Detected: {getDocumentTypeName(detectedType)}
                </span>
              ) : null}
              {verificationError && (
                <span className="text-xs text-amber-600 text-center max-w-[250px]">
                  {verificationError}
                </span>
              )}
              <span className="text-[10px] opacity-70 text-slate-600">Click to change file</span>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto">
                <Upload className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900">Upload Identity Document</p>
                <p className="text-[10px] opacity-70 uppercase tracking-tighter text-indigo-600">PDF • JPG • PNG (up to 10MB)</p>
              </div>
            </div>
          )}
        </label>
        {errors?.idType && <span className="text-red-500 text-xs">{errors.idType}</span>}
        {verificationError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              ⚠️ {verificationError}
            </p>
          </div>
        )}
      </div>

      {/* Document ID Number Field */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-indigo-900">
          Document ID Number *
          {errors?.idNumber && <span className="text-red-500 text-xs ml-2">{errors.idNumber}</span>}
        </label>
        <input
          type="text"
          name="idNumber"
          value={formData.idNumber}
          onChange={handleChange}
          readOnly={Boolean(formData.idNumber && !verificationError)}
          className={`w-full px-4 py-2 border ${errors?.idNumber ? 'border-red-500' : 'border-indigo-300'} rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${
            formData.idNumber && !verificationError 
              ? 'bg-gray-50 text-gray-700 cursor-not-allowed' 
              : 'bg-white'
          }`}
          placeholder={
            formData.idNumber && !verificationError
              ? formData.idNumber 
              : detectedType === 'aadhaar' 
                ? 'Enter 12-digit Aadhaar number' 
                : detectedType === 'passport' 
                  ? 'Enter passport number' 
                  : 'Enter document ID number'
          }
          required
        />
        <p className="text-xs text-indigo-700">
          {formData.idNumber && !verificationError
            ? `✓ Document ID extracted: ${formData.idNumber}`
            : verificationError
              ? '⚠️ Auto-extraction failed. Please enter your document ID manually.'
              : 'Upload and verify your document to automatically extract the ID number, or enter it manually.'
          }
        </p>
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Occupation *
            {errors?.occupation && <span className="text-red-500 text-xs ml-2">{errors.occupation}</span>}
          </label>
          <input
            type="text"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.occupation ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Annual Income *
            {errors?.annualIncome && <span className="text-red-500 text-xs ml-2">{errors.annualIncome}</span>}
          </label>
          <select
            name="annualIncome"
            value={formData.annualIncome}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.annualIncome ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          >
            <option value="">Select income range</option>
            <option value="0-25000">$0 - $25,000</option>
            <option value="25001-50000">$25,001 - $50,000</option>
            <option value="50001-100000">$50,001 - $100,000</option>
            <option value="100001-200000">$100,001 - $200,000</option>
            <option value="200001+">$200,001+</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Source of Funds *
            {errors?.sourceOfFunds && <span className="text-red-500 text-xs ml-2">{errors.sourceOfFunds}</span>}
          </label>
          <input
            type="text"
            name="sourceOfFunds"
            value={formData.sourceOfFunds}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.sourceOfFunds ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            placeholder="e.g., Employment, Investments, etc."
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Purpose of Account *
            {errors?.purposeOfAccount && <span className="text-red-500 text-xs ml-2">{errors.purposeOfAccount}</span>}
          </label>
          <select
            name="purposeOfAccount"
            value={formData.purposeOfAccount}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.purposeOfAccount ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          >
            <option value="personal">Personal Use</option>
            <option value="business">Business</option>
            <option value="investment">Investment</option>
            <option value="savings">Savings</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div> */}

      <div className="mt-6">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="terms"
              name="termsAccepted"
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={handleChange}
              className={`focus:ring-blue-500 h-4 w-4 text-blue-600 ${errors?.termsAccepted ? 'border-red-500' : 'border-gray-300'} rounded`}
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="font-medium text-gray-700">
              I certify that the information provided is accurate and complete. *
              {errors?.termsAccepted && <span className="text-red-500 text-xs ml-2">{errors.termsAccepted}</span>}
            </label>
            <p className="text-gray-500">
              By checking this box, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoStep;