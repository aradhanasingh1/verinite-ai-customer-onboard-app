import React, { useState } from 'react';
import PersonalInfoStep from './PersonalInfoStep';
import AddressInfoStep from './AddressInfoStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import SuccessStep from './SuccessStep';
import { FormData } from './types';

const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      nextStep();
      return;
    }

    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      // Here you would typically send the data to your backend
      console.log('Form submitted:', formData);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
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
          />
        )}
        
        {currentStep === 2 && (
          <AddressInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            errors={errors}
          />
        )}
        
        {currentStep === 3 && (
          <AdditionalInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            errors={errors}
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
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : currentStep === 3 ? (
              'Submit Application'
            ) : (
              'Next'
            )}
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
