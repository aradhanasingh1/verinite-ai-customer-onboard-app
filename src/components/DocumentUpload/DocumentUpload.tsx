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
    <div className="space-y-4 p-5 rounded-2xl bg-white/50 backdrop-blur-sm shadow-inner transition-all border border-indigo-50/50">
      <div>
        <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider px-1">Choose Verification Document</h3>
        <div className="grid grid-cols-2 gap-2">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleDocumentTypeSelect(type.value)}
              className={`p-3 border-2 rounded-xl text-xs font-bold transition-all duration-200 ${documentType === type.value
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              disabled={disabled || isUploading}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {documentType && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Upload {DOCUMENT_TYPES.find(t => t.value === documentType)?.label}
          </label>

          <label
            htmlFor="file-upload"
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl text-sm font-medium transition-all cursor-pointer 
              ${selectedFile
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-500'
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
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="truncate max-w-[200px] font-semibold">{selectedFile.name}</span>
                <span className="text-[10px] opacity-70">Click to change file</span>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto transition-colors group-hover:bg-indigo-100">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Files up to 10MB</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-tighter">PDF • JPG • PNG</p>
                </div>
              </div>
            )}
          </label>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !documentType || disabled || isUploading}
        className={`w-full h-11 rounded-xl font-bold transition-all shadow-lg ${selectedFile && documentType
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.98]'
            : 'bg-slate-100 text-slate-400'
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
