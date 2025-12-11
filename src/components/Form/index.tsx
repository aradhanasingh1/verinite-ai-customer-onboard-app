import React, { useState } from 'react';
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

  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
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

  const validateStep = (step: number) => {
  const newErrors: Record<string, string> = {};
  
  if (step === 1) {
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
  }
  
  if (step === 2) {
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State/Province is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/Postal code is required';
    if (!formData.country) newErrors.country = 'Country is required';
  }
  
  if (step === 3) {
    if (!formData.idNumber.trim()) newErrors.idNumber = 'ID number is required';
    if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required';
    if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';
    if (!formData.sourceOfFunds.trim()) newErrors.sourceOfFunds = 'Source of funds is required';
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
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
      // Clear previous errors
      setErrors({});
      
      // Basic validation
      const newErrors: Record<string, string> = {};
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State/Province is required';
      if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/Postal code is required';
      if (!formData.country) newErrors.country = 'Country is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        setIsSubmitting(true);
        const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}, ${formData.country}`.trim();
        const result = await verifyAddress(fullAddress);
        
        if (result.success && result.data.is_valid) {
          // Store the verified address
          const verifiedAddress = {
            original: fullAddress,
            verified: result.data.verified_address || fullAddress,
            isVerified: true,
            verifiedAt: new Date()
          };
          setVerifiedAddress(verifiedAddress);
          
          // Update the form with the verified address
          setFormData(prev => ({
            ...prev,
            address: verifiedAddress.verified
          }));
          
          // Proceed to next step
          setCurrentStep(3);
        } else {
          setErrors(prev => ({
            ...prev,
            addressVerification: result.data?.suggested_corrections?.[0] || 'Address verification failed'
          }));
        }
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          addressVerification: 'Error verifying address. Please try again.'
        }));
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 3) {
      // On the last step, trigger form submission
      handleSubmit(new Event('submit') as any);
    } else {
      // For other steps, just validate and proceed
      if (validateStep(currentStep)) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not on the last step, just go to next step
    if (currentStep < 3) {
      nextStep();
      return;
    }

    // On the last step, validate and submit
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const submissionData = {
        ...formData,
        verifiedAddress: verifiedAddress || null
      };
      
      console.log('Form submitted:', submissionData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // On successful submission
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
       fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
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
  setErrors({});
  };

  const renderStep = () => {
    if (isSuccess) {
      return <SuccessStep onNewSubmission={resetForm} />;
    }

    return (
      <form onSubmit={handleSubmit} className="p-6 sm:p-8">
        {currentStep === 1 && (
          <PersonalInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            errors={errors}
            setFormData={setFormData}  // Add this line
          />
        )}
        
        {currentStep === 2 && (
          <AddressInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            errors={errors}
            setFormData={setFormData}
            verifiedAddress={verifiedAddress}
          />
        )}

        {currentStep === 3 && (
          <AdditionalInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            errors={errors}
            setFormData={setFormData}
          />
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Previous
          </button>

         

<button
  type={currentStep === 3 ? "submit" : "button"}
  onClick={currentStep === 3 ? undefined : nextStep}
  disabled={isSubmitting}
  className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
    isSubmitting
      ? 'bg-blue-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700'
  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
>
  {isSubmitting ? 'Processing...' : currentStep === 3 ? 'Submit Application' : 'Next'}
</button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {!isSuccess && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Customer Onboarding</h1>
            <p className="mt-2 text-sm text-gray-600">Please fill out the form below to complete your application.</p>
            
            {/* Progress Steps */}
            <div className="mt-8">
              <nav aria-label="Progress">
                <ol role="list" className="flex items-center">
                  {[1, 2, 3].map((step) => (
                    <li
                      key={step}
                      className={`flex items-center ${
                        step !== 3 ? 'flex-1' : 'flex-none'
                      }`}
                    >
                      <div
                        className={`flex flex-col items-center ${
                          currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200'
                          }`}
                        >
                          {step}
                        </div>
                        <span className="mt-2 text-xs font-medium">
                          {step === 1 ? 'Personal' : step === 2 ? 'Address' : 'Additional'}
                        </span>
                      </div>
                      {step !== 3 && (
                        <div
                          className={`h-0.5 flex-1 ${
                            currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                          } mx-2`}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;
