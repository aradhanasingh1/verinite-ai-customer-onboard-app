import React, { useState } from 'react';
import { FormStepProps } from './types';
import { verifyAddress } from '../../utils/api';

const AddressInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors, setFormData }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
    verifiedAddress?: string;
  } | null>(null);

  const handleVerifyAddress = async () => {
    const { address, city, state, zipCode, country } = formData;
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}, ${country}`.trim();
    
    if (!address || !city || !state || !zipCode || !country) {
      setVerificationResult({
        isValid: false,
        message: 'Please fill in all address fields before verifying'
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyAddress(fullAddress);
      if (result.success && result.data.is_valid) {
        setVerificationResult({
          isValid: true,
          message: 'Address verified successfully!',
          verifiedAddress: result.data.verified_address
        });
      } else {
        setVerificationResult({
          isValid: false,
          message: result.data.suggested_corrections?.[0] || 'Address could not be verified'
        });
      }
    } catch (error) {
      setVerificationResult({
        isValid: false,
        message: 'Error verifying address. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Address Information</h2>
      
      {/* Existing address fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ... existing address fields ... */}
      </div>

      {/* Verification section */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleVerifyAddress}
          disabled={isVerifying}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? 'Verifying...' : 'Verify Address'}
        </button>
        
        {verificationResult && (
          <div className={`mt-3 p-3 rounded-md ${
            verificationResult.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {verificationResult.message}
            {verificationResult.verifiedAddress && (
              <div className="mt-2">
                <p className="font-medium">Verified Address:</p>
                <p className="text-sm">{verificationResult.verifiedAddress}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressInfoStep;