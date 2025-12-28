// src/components/DocumentUpload/DocumentUpload.tsx
import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '../ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (file: File, documentType: string) => Promise<void>;
  disabled?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
];

export function DocumentUpload({ onUpload, disabled }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) return;
    
    try {
      setIsUploading(true);
      await onUpload(selectedFile, documentType);
      setSelectedFile(null);
      setDocumentType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentTypeSelect = (type: string) => {
    setDocumentType(type);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div>
        <h3 className="text-sm font-medium mb-2">Select Document Type</h3>
        <div className="grid grid-cols-2 gap-2">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleDocumentTypeSelect(type.value)}
              className={`p-3 border rounded-md text-sm font-medium transition-colors ${
                documentType === type.value
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={disabled || isUploading}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {documentType && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload {DOCUMENT_TYPES.find(t => t.value === documentType)?.label}</label>
          <div className="flex items-center space-x-2">
            <label className="flex-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                disabled={disabled || isUploading}
              />
              <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                {selectedFile ? (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span className="truncate max-w-xs">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, or PNG (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !documentType || disabled || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          'Upload Document'
        )}
      </Button>
    </div>
  );
}