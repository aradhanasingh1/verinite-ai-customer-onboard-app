import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

interface AddressInfoStepProps {
  onValidationChange: (isValid: boolean) => void;
  formData: any;
  onUpdateFormData: (data: any) => void;
  isVerifying?: boolean;
  onNext?: () => void;
}

const AddressInfoStep: React.FC<AddressInfoStepProps> = ({ 
  onValidationChange,
  formData,
  onUpdateFormData,
  isVerifying = false,
  onNext
}) => {
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
    verifiedAddress?: any;
  } | null>(null);

  // Validate form whenever formData changes
  useEffect(() => {
    const isValid = Boolean(
      formData.line1?.trim() &&
      formData.city?.trim() &&
      formData.state?.trim() &&
      formData.postalCode?.trim() &&
      formData.country?.trim()
    );
    onValidationChange(isValid);
  }, [formData, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdateFormData({ [name]: value });
  };

  const handleVerifyAddress = async () => {
    const { line1, city, state, postalCode, country } = formData;
    const fullAddress = `${line1}, ${city}, ${state} ${postalCode}, ${country}`.trim();
    
    try {
      setVerificationResult(null);
      
      const response = await axios.post('http://localhost:4000/onboarding/verify-address', {
        line1,
        city,
        state,
        postalCode,
        country
      });

      const { agentOutput, finalDecision } = response.data;
      const isVerified = finalDecision === 'APPROVE';
      const verifiedAddress = agentOutput?.metadata?.verified_address || fullAddress;

      setVerificationResult({
        isValid: isVerified,
        message: isVerified ? 'Address verified successfully!' : 'Address could not be verified',
        verifiedAddress
      });

      // If verified, update the form data with the verified address
      if (isVerified) {
        onUpdateFormData({ line1: verifiedAddress });
      }

      return isVerified;
    } catch (error) {
      console.error('Error:', error);
      setVerificationResult({
        isValid: false,
        message: 'Error verifying address. Please try again.'
      });
      return false;
    }
  };

  const handleNext = async () => {
    const isVerified = await handleVerifyAddress();
    if (isVerified && onNext) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Address Information</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="line1" className="block text-sm font-medium text-gray-700">
            Street Address
          </label>
          <input
            type="text"
            name="line1"
            id="line1"
            value={formData.line1 || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              name="city"
              id="city"
              value={formData.city || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State/Province
            </label>
            <input
              type="text"
              name="state"
              id="state"
              value={formData.state || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
              ZIP/Postal Code
            </label>
            <input
              type="text"
              name="postalCode"
              id="postalCode"
              value={formData.postalCode || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select a country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="IN">India</option>
              <option value="AU">Australia</option>
            </select>
          </div>
        </div>

        {verificationResult && (
          <div className={`p-4 rounded-md ${verificationResult.isValid ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {verificationResult.isValid ? (
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${verificationResult.isValid ? 'text-green-800' : 'text-yellow-800'}`}>
                  {verificationResult.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={isVerifying}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Next'}
        </button>
      </div> */}
      {verificationResult && (
        <div className={`p-4 rounded-md ${
          verificationResult.isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {verificationResult.message}
        </div>
      )}
    </div>
  );
};

export default AddressInfoStep;