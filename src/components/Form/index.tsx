import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import PersonalInfoStep from './PersonalInfoStep';
import AddressInfoStep from './AddressInfoStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import SuccessStep from './SuccessStep';
import { verifyAddress } from '../../utils/api';
import { FormData, VerifiedAddress } from './types';
import {
  getOrCreateSession,
  recordStep,
  finaliseAudit,
  setApplicantName,
} from '@/lib/auditStore';

const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifiedAddress, setVerifiedAddress] = useState<VerifiedAddress | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [finalDecision, setFinalDecision] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);

  // ── Initialise audit session on mount ──────────────────────────────────
  useEffect(() => {
    getOrCreateSession();
    recordStep(
      'form_session_start',
      'Application Started',
      'Customer began the multi-step onboarding form.',
      'session',
      'completed',
      { icon: '🚀' }
    );
  }, []);
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

      recordStep(
        'address_verification_start',
        'Address Verification Started',
        `Verifying address: ${formData.line1}, ${formData.city}, ${formData.state}`,
        'address',
        'in_progress',
        { icon: '📍' }
      );

      const t0 = Date.now();
      const response = await verifyAddress(
        formData.line1,
        formData.city,
        formData.state,
        formData.postalCode,
        formData.country
      );
      const durationMs = Date.now() - t0;

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
        recordStep(
          'address_verification_result',
          'Address Verification Failed',
          response.reasons?.[0] || 'The entered address could not be verified. Please review and correct it.',
          'address',
          'failed',
          { icon: '❌', durationMs, detail: `${formData.line1}, ${formData.city}, ${formData.state} ${formData.postalCode}` }
        );
      } else {
        console.log('Address verification successful');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.address;
          return newErrors;
        });
        recordStep(
          'address_verification_result',
          'Address Verified Successfully',
          'The provided address was validated and standardised by the verification service.',
          'address',
          'completed',
          {
            icon: '✅',
            durationMs,
            detail: `${formData.line1}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`,
            metadata: { confidence: response.confidence }
          }
        );
      }

      return isApproved;
    } catch (error) {
      console.error('Address verification failed:', error);
      setErrors(prev => ({
        ...prev,
        address: 'Failed to verify address. Please check your details and try again.'
      }));
      setIsAddressValid(false);
      recordStep(
        'address_verification_result',
        'Address Verification Error',
        'An error occurred while contacting the address verification service.',
        'address',
        'failed',
        { icon: '⚠️' }
      );
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
    if (currentStep === 1) {
      if (!validateStep(1)) return;
      // Record personal info step completion
      if (formData.fullName) setApplicantName(formData.fullName);
      recordStep(
        'personal_info_complete',
        'Personal Information Collected',
        `Name, email, phone, date of birth captured for ${formData.fullName || 'applicant'}.`,
        'identity',
        'completed',
        { icon: '👤', detail: `${formData.email} · ${formData.phone}` }
      );
    }

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
    }

    console.log('Moving to step:', currentStep + 1);
    if (currentStep + 1 === 3) {
      recordStep(
        'additional_info_start',
        'Additional Information Step',
        'Customer proceeded to financial and identity document details.',
        'documents',
        'in_progress',
        { icon: '📄' }
      );
    }
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

     // Get risk tolerance from localStorage
      let riskTolerance = 'HIGH'; // Default to HIGH for auto-approval
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('verinite_default_risk_tolerance');
        if (stored === 'HIGH' || stored === 'LOW') {
          riskTolerance = stored;
        }
      }
      console.log('Using risk tolerance:', riskTolerance);
      
      recordStep(
        'additional_info_complete',
        'Financial & Document Details Submitted',
        `Occupation: ${formData.occupation || 'N/A'} · Income: ${formData.annualIncome || 'N/A'} · ID Type: ${formData.idType}`,
        'documents',
        'completed',
        { icon: '📋', detail: `ID: ${formData.idType.toUpperCase()} ending …${formData.idNumber?.slice(-4) || 'XXXX'}` }
      );

      recordStep(
        'onboarding_pipeline_start',
        'Onboarding Pipeline Initiated',
        'Application sent to the AI orchestration engine. Running KYC, Address, AML, Credit, and Risk checks.',
        'kyc',
        'in_progress',
        { icon: '⚙️' }
      );

      const response = await axios.post('http://localhost:4000/onboarding/start', {
        customerId: `cust-${Date.now()}`,
        applicationId: `app-${Date.now()}`,
        risk_tolerance: riskTolerance, // Include risk tolerance
        payload: formattedPayload
      });

      const newTraceId = response.data.traceId;
      setTraceId(newTraceId);
      console.log('Onboarding started with trace ID:', newTraceId);
      const traceId = newTraceId;

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

            // ── Record final agent decisions in audit ──────────────────
            const auditTrail = statusResponse.data.auditTrail || [];
            const agentChecks = [
              { key: 'kyc', label: 'KYC Verification', cat: 'kyc' as const, icon: '🪪' },
              { key: 'aml', label: 'AML Screening', cat: 'aml' as const, icon: '🔎' },
              { key: 'credit', label: 'Credit Assessment', cat: 'credit' as const, icon: '💳' },
              { key: 'risk', label: 'Risk Evaluation', cat: 'risk' as const, icon: '⚖️' },
            ];
            agentChecks.forEach(({ key, label, cat, icon }) => {
              const found = auditTrail.find((e: { step?: string }) => e.step?.toLowerCase().includes(key));
              recordStep(
                `${key}_agent_result`,
                `${label} Complete`,
                found
                  ? `${label} agent returned a result from the orchestration pipeline.`
                  : `${label} check completed as part of the onboarding pipeline.`,
                cat,
                'completed',
                { icon }
              );
            });

            const decisionStatus = decision === 'APPROVE' ? 'approved' : decision === 'DENY' ? 'denied' : 'escalated';
            recordStep(
              'final_decision',
              `Final Decision: ${decision}`,
              decision === 'APPROVE'
                ? 'All verification checks passed. Application approved.'
                : decision === 'DENY'
                  ? 'One or more checks did not meet the required threshold. Application denied.'
                  : 'Application flagged for manual review by compliance team.',
              'decision',
              decision === 'APPROVE' ? 'completed' : decision === 'DENY' ? 'failed' : 'in_progress',
              { icon: decision === 'APPROVE' ? '✅' : decision === 'DENY' ? '❌' : '⚠️', detail: decision, metadata: { traceId } }
            );
            finaliseAudit(decisionStatus as 'approved' | 'denied' | 'escalated', traceId, decision);

            console.log('Onboarding completed successfully with decision:', decision);
            setIsSuccess(true);
            setCurrentStep(4);
          } else if (statusResponse.data.status === 'failed') {
            const errorMsg = statusResponse.data.error || 'Submission failed';
            console.error('Onboarding failed:', errorMsg);
            throw new Error(errorMsg);
          } else if (!statusResponse.data) {
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
      return <SuccessStep onNewSubmission={resetForm} finalDecision={finalDecision} traceId={traceId} />;
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
                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}
              >
                {step}
              </div>
              <span
                className={`mt-2 text-sm ${currentStep === step ? 'font-medium text-blue-600' : 'text-gray-500'
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
            className={`px-4 py-2 text-sm font-medium rounded-md ${currentStep === 1
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