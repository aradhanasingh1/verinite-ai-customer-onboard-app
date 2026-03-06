// src/components/DocumentUpload/DocumentUpload.tsx
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (file: File, documentType: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Detect document type from filename
 */
function detectDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('aadhar') || lower.includes('aadhaar')) return 'aadhaar';
  if (lower.includes('license') || lower.includes('dl')) return 'drivers_license';
  if (lower.includes('utility') || lower.includes('bill')) return 'utility_bill';
  if (lower.includes('bank') || lower.includes('statement')) return 'bank_statement';
  if (lower.includes('pan')) return 'pan_card';
  
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
    'utility_bill': 'Utility Bill',
    'bank_statement': 'Bank Statement',
    'pan_card': 'PAN Card',
  };
  return names[type] || 'Identity Document';
}

export function DocumentUpload({ onUpload, disabled }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setVerificationError('');
      
      // First, try filename-based detection as a fallback
      const filenameType = detectDocumentType(file.name);
      console.log('[DocumentUpload] Filename-based detection:', filenameType);
      
      // Set initial type from filename
      setDetectedType(filenameType);
      
      // Then verify with AI to get accurate document type
      setIsVerifying(true);
      try {
        const formDataToSend = new FormData();
        formDataToSend.append('document', file);
        formDataToSend.append('type', 'unknown'); // Don't bias the AI with filename guess
        
        console.log('[DocumentUpload] Sending document to AI for verification...');
        const response = await fetch('/api/verify-document', {
          method: 'POST',
          body: formDataToSend,
        });
        
        const result = await response.json();
        console.log('[DocumentUpload] AI verification result:', result);
        
        if (result.success && result.extractedData?.documentType) {
          const aiDetectedType = result.extractedData.documentType;
          console.log('[DocumentUpload] AI detected document type:', aiDetectedType);
          
          // Normalize the AI detected type
          const normalizedType = aiDetectedType.toLowerCase().replace(/[_\s-]/g, '_');
          let finalType = normalizedType;
          
          // Map common variations
          if (normalizedType.includes('passport')) finalType = 'passport';
          else if (normalizedType.includes('aadhaar') || normalizedType.includes('aadhar')) finalType = 'aadhaar';
          else if (normalizedType.includes('driver') || normalizedType.includes('license')) finalType = 'drivers_license';
          else if (normalizedType.includes('pan')) finalType = 'pan_card';
          else if (normalizedType.includes('national')) finalType = 'national_id';
          
          console.log('[DocumentUpload] Normalized type:', finalType);
          setDetectedType(finalType);
        } else {
          // AI detection failed, keep filename-based detection
          console.warn('[DocumentUpload] AI detection failed:', result.error || 'No document type returned');
          setVerificationError(result.error ? `AI detection failed: ${result.error}` : 'AI detection unavailable. Using filename-based detection.');
        }
      } catch (error) {
        console.error('[DocumentUpload] Document verification error:', error);
        setVerificationError('Could not verify document automatically. Using filename-based detection.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !detectedType) return;

    try {
      setIsUploading(true);
      await onUpload(selectedFile, detectedType);
      setSelectedFile(null);
      setDetectedType('');
      setVerificationError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2 p-1 rounded-2xl bg-white shadow-sm border border-slate-200 transition-all">
      <div>
        <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider px-1">
          Upload KYC Document
        </h3>
        <p className="text-xs text-slate-500 px-1 mb-3">
          Upload any identity document (Aadhaar, Passport, Driver's License, etc.)
        </p>
      </div>

      <div className="space-y-0">
        <label
          htmlFor="file-upload"
          className={`relative flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-2xl text-sm font-medium transition-all cursor-pointer 
            ${selectedFile
              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-600'
            }`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            disabled={disabled || isUploading}
          />

          {selectedFile ? (
            <div className="flex flex-col items-center space-y-0">
              <div className="w-10 h-1 rounded-full bg-emerald-100 flex items-center justify-center">
                {isVerifying ? (
                  <Loader2 className="h-1 w-5 text-emerald-600 animate-spin" />
                ) : (
                  <FileText className="h-1 w-5 text-emerald-600" />
                )}
              </div>
              <span className="truncate max-w-[200px] font-semibold text-slate-800">{selectedFile.name}</span>
              {isVerifying ? (
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-300 animate-pulse">
                  Verifying with AI...
                </span>
              ) : detectedType ? (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-200">
                  Detected: {getDocumentTypeName(detectedType)}
                </span>
              ) : null}
              {verificationError && (
                <span className="text-xs text-amber-600 text-center max-w-[250px]">
                  {verificationError}
                </span>
              )}
              <span className="text-[10px] opacity-70 text-slate-500">Click to change file</span>
            </div>
          ) : (
            <div className="text-center space-y-0">
              <div className="w-10 h-1 rounded-full bg-slate-100 flex items-center justify-center mx-auto transition-colors group-hover:bg-indigo-100">
                <Upload className="h-1 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Upload Identity Document</p>
                <p className="text-[10px] opacity-60 uppercase tracking-tighter text-slate-500">PDF • JPG • PNG (up to 10MB)</p>
              </div>
            </div>
          )}
        </label>
      </div>

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || disabled || isUploading || isVerifying}
        className={`w-full h-8 rounded-xl font-bold transition-all shadow-lg ${selectedFile && !isVerifying
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.98]'
            : 'bg-slate-200 text-slate-400 border border-slate-300'
          }`}
      >
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : isVerifying ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Verify Document</span>
          </div>
        )}
      </Button>
      
      {verificationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
          <p className="text-xs text-amber-800">
            ⚠️ {verificationError}
          </p>
        </div>
      )}
    </div>
  );
}