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

const AdditionalInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors, setFormData }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-detect document type from filename
      const type = detectDocumentType(file.name);
      setDetectedType(type);
      
      // Update form data with detected type
      if (setFormData) {
        setFormData({
          ...formData,
          idType: type,
          uploadedDocument: file.name
        });
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
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="truncate max-w-[200px] font-semibold text-slate-800">{selectedFile.name}</span>
              {detectedType && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-300">
                  Detected: {getDocumentTypeName(detectedType)}
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