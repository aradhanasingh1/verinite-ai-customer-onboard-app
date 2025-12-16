import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import PersonalInfoStep from './PersonalInfoStep';
import AddressInfoStep from './AddressInfoStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import SuccessStep from './SuccessStep';
import { verifyAddress } from '../../utils/api';
import { FormData, VerifiedAddress } from './types';

const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifiedAddress, setVerifiedAddress] = useState<VerifiedAddress | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [finalDecision, setFinalDecision] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    gender: '',
    cibilScore: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    idType: 'passport',
    idNumber: '',
    dateOfBirth: '',
    occupation: '',
    annualIncome: '',
    sourceOfFunds: '',
    purposeOfAccount: 'personal',
    termsAccepted: false,
  });

  const handleUpdateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateStep = useCallback((step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.fullName?.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.email?.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    if (step === 2) {
      if (!formData.line1?.trim()) newErrors.line1 = 'Address is required';
      if (!formData.city?.trim()) newErrors.city = 'City is required';
      if (!formData.state?.trim()) newErrors.state = 'State/Province is required';
      if (!formData.postalCode?.trim()) newErrors.postalCode = 'ZIP/Postal code is required';
      if (!formData.country) newErrors.country = 'Country is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) {
      return !validateStep(1);
    }
    if (currentStep === 2) {
      const isFormValid = validateStep(2);
      return !(isFormValid && isAddressValid);
    }
    return false;
  }, [currentStep, isAddressValid, formData]);

  const handleAddressVerification = async () => {
    try {
      console.log('Starting address verification...');
      setIsSubmitting(true);
      const response = await verifyAddress(
        formData.line1,
        formData.city,
        formData.state,
        formData.postalCode,
        formData.country
      );
      
      console.log('Address verification response:', response);
      const isApproved = response.proposal === 'approve';
      console.log('Verification result - approved:', isApproved, 'with confidence:', response.confidence);
      
      setVerifiedAddress(response.verifiedAddress || response);
      setIsAddressValid(isApproved);
      setFormData(prev => ({ ...prev }));
      
      if (!isApproved) {
        console.log('Address verification failed or requires review');
        setErrors(prev => ({
          ...prev,
          address: response.reasons?.[0] || 'Address verification failed. Please check your address details.'
        }));
      } else {
        console.log('Address verification successful');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.address;
          return newErrors;
        });
      }
      
      return isApproved;
    } catch (error) {
      console.error('Address verification failed:', error);
      setErrors(prev => ({
        ...prev,
        address: 'Failed to verify address. Please check your details and try again.'
      }));
      setIsAddressValid(false);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const nextStep = async () => {
    if (currentStep === 2) {
      try {
        const isValid = await handleAddressVerification();
        if (!isValid) {
          console.log('Address verification failed, not proceeding to next step');
          return;
        }
        console.log('Address verified, proceeding to next step');
      } catch (error) {
        console.error('Error in address verification:', error);
        return;
      }
    } else if (currentStep === 1 && !validateStep(1)) {
      return;
    }

    console.log('Moving to step:', currentStep + 1);
    setCurrentStep(prev => {
      const nextStep = prev + 1;
      setErrors({});
      return nextStep;
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formattedPayload = {
        applicant: {
          name: formData.fullName,
          dob: formData.dateOfBirth,
          gender: formData.gender.toLowerCase(),
          country: formData.country,
          residencyCountry: formData.country,
          monthly_income: parseInt(formData.annualIncome) / 12,
          monthly_liabilities: 0,
          cibil_score: parseInt(formData.cibilScore) || 0
        },
        documents: [
          {
            type: 'aadhaar',
            number: formData.idNumber,
            name: formData.fullName,
            dob: formData.dateOfBirth,
            gender: formData.gender.toLowerCase(),
            looks_authentic: true
          },
          {
            type: formData.idType,
            number: formData.idNumber,
            name: formData.fullName,
            dob: formData.dateOfBirth,
            gender: formData.gender.toLowerCase(),
            ...(formData.idType === 'passport' ? {
              country: formData.country,
              looks_authentic: true
            } : {})
          }
        ],
        signals: {
          watchlist_hit: false,
          monthly_cash_volume: 5000
        }
      };

      console.log('Submitting form with payload:', formattedPayload);

      const response = await axios.post('http://localhost:4000/onboarding/start', {
        customerId: `cust-${Date.now()}`,
        applicationId: `app-${Date.now()}`,
        payload: formattedPayload
      });

      const traceId = response.data.traceId;
      console.log('Onboarding started with trace ID:', traceId);
      
      const checkStatus = async () => {
        try {
          const statusResponse = await axios.get(`http://localhost:4000/onboarding/trace/${traceId}`);
          console.log('Full status response:', JSON.stringify(statusResponse.data, null, 2));
          
          if (statusResponse.data.status === 'completed') {
           const decision = statusResponse.data.finalDecision || 
                statusResponse.data.data?.finalDecision || 
                statusResponse.data.result?.finalDecision ||
                'Pending Review'; // Default fallback

console.log('Final decision object:', {
  finalDecision: statusResponse.data.finalDecision,
  dataFinalDecision: statusResponse.data.data?.finalDecision,
  resultFinalDecision: statusResponse.data.result?.finalDecision,
  fullResponse: statusResponse.data
});

setFinalDecision(decision);
            console.log('Onboarding completed successfully with decision:', decision);
            setIsSuccess(true);
            setCurrentStep(4);
          } else if (statusResponse.data.status === 'failed') {
            const errorMsg = statusResponse.data.error || 'Submission failed';
            console.error('Onboarding failed:', errorMsg);
            throw new Error(errorMsg);
          }else if (!statusResponse.data) {
  console.error('No data in response:', statusResponse);
  throw new Error('Invalid response from server');
}
           else {
            console.log('Onboarding in progress, checking again...');
            setTimeout(checkStatus, 1000);
          }
        } catch (error) {
          console.error('Error checking status:', error);
          throw error;
        }
      };

      // Before starting the polling
await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before first check
await checkStatus();
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Failed to submit form';
      
      setErrors(prev => ({
        ...prev,
        submission: errorMessage
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      line1: '',
      gender: '',
      cibilScore: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      idType: 'passport',
      idNumber: '',
      dateOfBirth: '',
      occupation: '',
      annualIncome: '',
      sourceOfFunds: '',
      purposeOfAccount: 'personal',
      termsAccepted: false,
    });
    setVerifiedAddress(null);
    setCurrentStep(1);
    setIsSuccess(false);
    setFinalDecision(null);
    setErrors({});
  };

  const renderStep = () => {
    if (isSuccess) {
      return <SuccessStep onNewSubmission={resetForm} finalDecision={finalDecision} />;
    }
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            formData={formData}
            handleChange={handleChange}
            errors={errors}
            setFormData={setFormData}
          />
        );
      case 2:
        return (
          <AddressInfoStep
            formData={formData}
            onUpdateFormData={handleUpdateFormData}
            onValidationChange={setIsAddressValid}
            isVerifying={isSubmitting}
          />
        );
      case 3:
        return (
          <AdditionalInfoStep
            formData={formData}
            handleChange={handleChange}
            errors={errors}
            setFormData={setFormData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              <span
                className={`mt-2 text-sm ${
                  currentStep === step ? 'font-medium text-blue-600' : 'text-gray-500'
                }`}
              >
                {step === 1 ? 'Personal' : step === 2 ? 'Address' : 'Additional'}
              </span>
            </div>
          ))}
        </div>
        {renderStep()}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Previous
          </button>
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isNextDisabled || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Next'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
        {errors.submission && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {errors.submission}
          </div>
        )}
      </form>
    </div>
  );
};

export default MultiStepForm;