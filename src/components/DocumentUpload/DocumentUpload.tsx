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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-detect document type from filename
      const type = detectDocumentType(file.name);
      setDetectedType(type);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !detectedType) return;

    try {
      setIsUploading(true);
      await onUpload(selectedFile, detectedType);
      setSelectedFile(null);
      setDetectedType('');
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
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-slate-200 transition-all">
      <div>
        <h3 className="text-xs font-bold text-slate-600 uppercase px-1">
          Upload KYC Document
        </h3>
        <p className="text-xs text-slate-500 px-1">
          Upload any identity document (Aadhaar, Passport, Driver's License, etc.)
        </p>
      </div>

      <div className="space-y-0">
        <label
          htmlFor="file-upload"
          className={`relative flex flex-col items-center justify-center px-6 border-2 border-dashed rounded-2xl text-sm font-medium transition-all cursor-pointer 
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
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="truncate max-w-[200px] font-semibold text-slate-800">{selectedFile.name}</span>
              {detectedType && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-200">
                  Detected: {getDocumentTypeName(detectedType)}
                </span>
              )}
              <span className="text-[10px] opacity-70 text-slate-500">Click to change file</span>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto transition-colors group-hover:bg-indigo-100">
                <Upload className="h-5 w-5 text-slate-500" />
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
        disabled={!selectedFile || disabled || isUploading}
        className={`w-full h-11 rounded-xl font-bold transition-all shadow-lg ${selectedFile
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.98]'
            : 'bg-slate-200 text-slate-400 border border-slate-300'
          }`}
      >
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Verify Document</span>
          </div>
        )}
      </Button>
    </div>
  );
}
