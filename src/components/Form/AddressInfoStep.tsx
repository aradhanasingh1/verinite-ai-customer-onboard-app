import React, { useState } from 'react';
import { FormStepProps } from './types';
import axios from 'axios';

const AddressInfoStep: React.FC<FormStepProps> = ({ 
  formData, 
  handleChange, 
  errors, 
  setFormData,
  onNext
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
    verifiedAddress?: string;
  } | null>(null);

  const handleVerifyAddress = async () => {
    const { line1, city, state, postalCode, country } = formData;
    const fullAddress = `${line1}, ${city}, ${state} ${postalCode}, ${country}`.trim();
    
    try {
      setIsVerifying(true);
      setVerificationResult(null);
      
      const response = await axios.post('http://localhost:4000/address/verify', {
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
        setFormData(prev => ({
          ...prev,
          line1: verifiedAddress
        }));
      }

      return isVerified;
    } catch (error) {
      console.error('Error:', error);
      setVerificationResult({
        isValid: false,
        message: 'Error verifying address. Please try again.'
      });
      return false;
    } finally {
      setIsVerifying(false);
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
            value={formData.line1}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          {errors.line1 && <p className="mt-1 text-sm text-red-600">{errors.line1}</p>}
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
              value={formData.city}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State/Province
            </label>
            <input
              type="text"
              name="state"
              id="state"
              value={formData.state}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
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
              value={formData.postalCode}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Select a country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
            </select>
            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
          </div>
        </div>

        {verificationResult && (
          <div className={`p-4 rounded-md ${
            verificationResult.isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {verificationResult.message}
          </div>
        )}
      </div>

       <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isVerifying}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Next'}
        </button>
      </div>

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