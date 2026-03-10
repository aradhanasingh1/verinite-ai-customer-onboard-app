import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import PersonalInfoStep from './PersonalInfoStep';
import AddressInfoStep from './AddressInfoStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import SuccessStep from './SuccessStep';
import { verifyAddress } from '../../utils/api';
import { FormData, VerifiedAddress } from './types';
import { startOnboarding } from '../../services/documentService';
import {
  getOrCreateSession,
  recordStep,
  finaliseAudit,
  setApplicantName,
  getCurrentSession,
  getRiskToleranceAsync,
} from '@/lib/auditStore';
import type { RiskToleranceLevel } from '@/types/audit';

const MultiStepForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifiedAddress, setVerifiedAddress] = useState<VerifiedAddress | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [finalDecision, setFinalDecision] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [extractedDocumentData, setExtractedDocumentData] = useState<any>(null);

  // Helper function to extract field value from fields array
  const getFieldValue = (fields: any[], key: string): string | null => {
    if (!fields || !Array.isArray(fields)) return null;
    const field = fields.find((f: any) => f.key?.toLowerCase() === key.toLowerCase());
    return field?.value || null;
  };

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

    if (step === 3) {
      if (!formData.idNumber?.trim()) {
        newErrors.idNumber = 'Document ID number is required. Please upload a document or enter it manually.';
      } else {
        // Validate based on document type
        const idNumber = formData.idNumber.replace(/\s/g, ''); // Remove spaces
        if (formData.idType === 'aadhaar' && !/^\d{12}$/.test(idNumber)) {
          newErrors.idNumber = 'Aadhaar number must be exactly 12 digits';
        } else if (formData.idType === 'pan_card' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber.toUpperCase())) {
          newErrors.idNumber = 'PAN number must be in format ABCDE1234F';
        } else if (formData.idType === 'passport' && idNumber.length < 6) {
          newErrors.idNumber = 'Passport number must be at least 6 characters';
        }
      }
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';
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

    // Validate step 3 before submission
    if (!validateStep(3)) {
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
          cibil_score: parseInt(formData.cibilScore) || 0,
          address: {
            line1: formData.line1,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country
          }
        },
        documents: [
          {
            type: formData.idType,
            number: formData.idNumber,
            name: formData.fullName,
            dob: formData.dateOfBirth,
            gender: formData.gender.toLowerCase(),
            looks_authentic: true,
            ...(formData.idType === 'passport' ? {
              country: formData.country
            } : {})
          }
        ],
        signals: {
          watchlist_hit: false,
          monthly_cash_volume: 5000
        }
      };

      console.log('Submitting form with payload:', formattedPayload);

      // Get the current risk tolerance from the audit store
      const session = getCurrentSession();
      let riskToleranceValue = 'high'; // Default to high for auto-approval
      let riskToleranceLevel: RiskToleranceLevel = 'HIGH';
      if (session?.sessionId) {
        try {
          const riskTolerance = await getRiskToleranceAsync(session.sessionId);
          if (riskTolerance) {
            riskToleranceValue = riskTolerance.toLowerCase();
            riskToleranceLevel = riskTolerance;
            console.log(`[Form] Using risk tolerance from audit store: ${riskToleranceValue}`);
          }
        } catch (error) {
          console.warn('[Form] Failed to get risk tolerance from audit store, checking localStorage:', error);
        }
      }
      
      // Fallback to localStorage (set from landing page)
      if (riskToleranceLevel === 'HIGH' && typeof window !== 'undefined') {
        const stored = localStorage.getItem('verinite_default_risk_tolerance');
        if (stored === 'HIGH' || stored === 'LOW') {
          riskToleranceLevel = stored;
          riskToleranceValue = stored.toLowerCase();
          console.log(`[Form] Using risk tolerance from localStorage: ${riskToleranceValue}`);
        }
      }
      
      console.log('[Form] Final risk tolerance:', riskToleranceValue);
      
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

      // Record audit step showing risk tolerance is being applied
      const riskDescription = riskToleranceLevel === 'HIGH'
        ? 'Applying HIGH risk tolerance: Will auto-approve if all checks pass.'
        : 'Applying LOW risk tolerance: Will escalate for manual review.';
      
      recordStep(
        'risk_tolerance_applied',
        `Risk Tolerance Applied: ${riskToleranceLevel}`,
        riskDescription,
        'risk',
        'completed',
        {
          icon: riskToleranceLevel === 'HIGH' ? '🚀' : '🛡️',
          detail: riskToleranceLevel === 'HIGH' 
            ? 'Decision Rule: HIGH + All Checks Pass → APPROVE' 
            : 'Decision Rule: LOW → ESCALATE (Manual Review)',
          metadata: {
            level: riskToleranceLevel,
            appliedAt: new Date().toISOString(),
            expectedBehavior: riskToleranceLevel === 'HIGH'
              ? 'Auto-approve on success'
              : 'Manual review required'
          }
        }
      );

      // Validate user-provided data against extracted document data
      if (extractedDocumentData) {
        const validationIssues: string[] = [];
        
        // Helper function to normalize strings for comparison
        const normalize = (str: string | null | undefined): string => {
          if (!str) return '';
          return str.toLowerCase().trim().replace(/\s+/g, ' ');
        };
        
        // Helper function to check if strings match (exact or partial) and return match type
        const getMatchType = (userProvided: string, documentValue: string): { isMatch: boolean; matchType: 'exact' | 'partial' | 'none'; matchPercentage: number } => {
          if (!userProvided || !documentValue) return { isMatch: false, matchType: 'none', matchPercentage: 0 };
          const normalizedUser = normalize(userProvided);
          const normalizedDoc = normalize(documentValue);
          
          console.log('[Form] Comparing:', { userProvided, documentValue, normalizedUser, normalizedDoc });
          
          // Exact match
          if (normalizedUser === normalizedDoc) {
            console.log('[Form] ✅ Exact match');
            return { isMatch: true, matchType: 'exact', matchPercentage: 100 };
          }
          
          // Partial match - check if one contains the other
          if (normalizedUser.includes(normalizedDoc) || normalizedDoc.includes(normalizedUser)) {
            console.log('[Form] ✅ Substring match');
            return { isMatch: true, matchType: 'partial', matchPercentage: 75 };
          }
          
          // Check word-by-word match (for names like "John Doe" vs "Doe John")
          const userWords = normalizedUser.split(' ').filter(w => w.length > 0);
          const docWords = normalizedDoc.split(' ').filter(w => w.length > 0);
          
          // If at least 50% of words match, consider it a match
          const matchingWords = userWords.filter(word => docWords.includes(word));
          const matchPercentage = Math.round((matchingWords.length / Math.min(userWords.length, docWords.length)) * 100);
          console.log('[Form] Word match:', { matchingWords, matchPercentage, threshold: 50 });
          
          if (matchPercentage >= 50) {
            console.log('[Form] ✅ Word-based match (50%+)');
            return { isMatch: true, matchType: 'partial', matchPercentage };
          }
          
          console.log('[Form] ❌ No match (0%)');
          return { isMatch: false, matchType: 'none', matchPercentage: 0 };
        };
        
        // Helper function for backward compatibility
        const isMatch = (userProvided: string, documentValue: string): boolean => {
          return getMatchType(userProvided, documentValue).isMatch;
        };
        
        let hasValidationFailure = false;
        let hasCompleteZeroMatch = false;
        
        // Validate Name
        const userProvidedName = formData.fullName;
        const documentName = extractedDocumentData.name;
        if (userProvidedName && documentName) {
          const nameMatch = getMatchType(userProvidedName, documentName);
          if (!nameMatch.isMatch && nameMatch.matchPercentage === 0) {
            hasCompleteZeroMatch = true;
            validationIssues.push(`Name mismatch: User provided "${formData.fullName}" but document shows "${extractedDocumentData.name}"`);
            
            recordStep(
              'validation_name_mismatch',
              '❌ Name Mismatch Detected',
              `CRITICAL: User-provided name does not match document. User: "${formData.fullName}" | Document: "${extractedDocumentData.name}"`,
              'documents',
              'failed',
              {
                icon: '❌',
                detail: 'Name verification FAILED - Application will be DENIED',
                metadata: {
                  userProvided: formData.fullName,
                  documentExtracted: extractedDocumentData.name,
                  validationType: 'name_match',
                  severity: 'critical',
                  autoDecision: 'DENY'
                }
              }
            );
          } else {
            recordStep(
              'validation_name_match',
              '✅ Name Verified',
              `User-provided name matches document: "${formData.fullName}"`,
              'documents',
              'completed',
              {
                icon: '✅',
                detail: 'Name verification passed',
                metadata: {
                  verifiedName: formData.fullName,
                  validationType: 'name_match'
                }
              }
            );
          }
        }
        
        // Validate Address
        console.log('[Form] formData.line1 at validation time:', formData.line1);
        const userProvidedAddress = formData.line1;
        const documentAddress = extractedDocumentData.address || 
                               getFieldValue(extractedDocumentData.fields || [], 'address');
        
        if (userProvidedAddress && documentAddress) {
          // First, record the comparison
          recordStep(
            'address_comparison',
            '🔍 Address Comparison',
            `Comparing user-provided address with document-extracted address.`,
            'documents',
            'completed',
            {
              icon: '🔍',
              detail: `User: "${userProvidedAddress}" | Document: "${documentAddress}"`,
              metadata: {
                userProvidedAddress: userProvidedAddress,
                documentExtractedAddress: documentAddress,
                validationType: 'address_comparison'
              }
            }
          );
          
          console.log('[Form] Recorded address comparison step to audit trail');
          
          if (!isMatch(userProvidedAddress, documentAddress)) {
            const addressMatch = getMatchType(userProvidedAddress, documentAddress);
            if (addressMatch.matchPercentage === 0) {
              hasCompleteZeroMatch = true;
            }
            validationIssues.push(`Address mismatch: User provided "${formData.line1}" but document shows "${documentAddress}"`);
            
            recordStep(
              'validation_address_mismatch',
              '❌ Address Mismatch Detected',
              `CRITICAL: User-provided address does not match document. User: "${formData.line1}" | Document: "${documentAddress}"`,
              'documents',
              'failed',
              {
                icon: '❌',
                detail: 'Address verification FAILED - Application will be DENIED',
                metadata: {
                  userProvided: formData.line1,
                  documentExtracted: documentAddress,
                  validationType: 'address_match',
                  severity: 'critical',
                  autoDecision: 'DENY'
                }
              }
            );
          } else {
            recordStep(
              'validation_address_match',
              '✅ Address Verified',
              `User-provided address matches document: "${formData.line1}"`,
              'documents',
              'completed',
              {
                icon: '✅',
                detail: 'Address verification passed',
                metadata: {
                  verifiedAddress: formData.line1,
                  validationType: 'address_match'
                }
              }
            );
          }
        }
        
        // Validate Date of Birth
        const userProvidedDob = formData.dateOfBirth;
        const documentDob = extractedDocumentData.dateOfBirth || 
                           extractedDocumentData.dob || 
                           getFieldValue(extractedDocumentData.fields || [], 'dateOfBirth') ||
                           getFieldValue(extractedDocumentData.fields || [], 'dob') ||
                           getFieldValue(extractedDocumentData.fields || [], 'date_of_birth');
        
        if (userProvidedDob && documentDob) {
          if (!isMatch(userProvidedDob, documentDob)) {
            const dobMatch = getMatchType(userProvidedDob, documentDob);
            if (dobMatch.matchPercentage === 0) {
              hasCompleteZeroMatch = true;
            }
            validationIssues.push(`Date of Birth mismatch: User provided "${formData.dateOfBirth}" but document shows "${documentDob}"`);
            
            recordStep(
              'validation_dob_mismatch',
              '❌ Date of Birth Mismatch Detected',
              `CRITICAL: User-provided DOB does not match document. User: "${formData.dateOfBirth}" | Document: "${documentDob}"`,
              'documents',
              'failed',
              {
                icon: '❌',
                detail: 'DOB verification FAILED - Application will be DENIED',
                metadata: {
                  userProvided: formData.dateOfBirth,
                  documentExtracted: documentDob,
                  validationType: 'dob_match',
                  severity: 'critical',
                  autoDecision: 'DENY'
                }
              }
            );
          } else {
            recordStep(
              'validation_dob_match',
              '✅ Date of Birth Verified',
              `User-provided DOB matches document: "${formData.dateOfBirth}"`,
              'documents',
              'completed',
              {
                icon: '✅',
                detail: 'DOB verification passed',
                metadata: {
                  verifiedDob: formData.dateOfBirth,
                  validationType: 'dob_match'
                }
              }
            );
          }
        }
        
        // Summary validation step
        if (hasCompleteZeroMatch) {
          // Create detailed mismatch summary
          const mismatchSummary: string[] = [];
          if (userProvidedName && documentName && !isMatch(userProvidedName, documentName)) {
            mismatchSummary.push(`❌ NAME MISMATCH: Your entered name "${userProvidedName}" does not match document extracted name "${documentName}"`);
          }
          if (userProvidedAddress && documentAddress && !isMatch(userProvidedAddress, documentAddress)) {
            mismatchSummary.push(`❌ ADDRESS MISMATCH: Your entered address "${userProvidedAddress}" does not match document extracted address "${documentAddress}"`);
          }
          if (userProvidedDob && documentDob && !isMatch(userProvidedDob, documentDob)) {
            mismatchSummary.push(`❌ DATE OF BIRTH MISMATCH: Your entered DOB "${userProvidedDob}" does not match document extracted DOB "${documentDob}"`);
          }
          
          recordStep(
            'validation_summary_failed',
            '🚫 DOCUMENT VALIDATION FAILED - APPLICATION DENIED',
            mismatchSummary.join('\n\n'),
            'documents',
            'failed',
            {
              icon: '🚫',
              detail: mismatchSummary.join('\n\n'),
              metadata: {
                totalMismatches: validationIssues.length,
                issues: validationIssues,
                severity: 'critical',
                autoDecision: 'DENY',
                overridesRiskTolerance: true,
                mismatchDetails: mismatchSummary
              }
            }
          );
          
          console.log('[Form] Recorded validation summary (FAILED) to audit trail:', mismatchSummary);
          
          // Override risk tolerance - force DENY
          riskToleranceValue = 'deny';
          riskToleranceLevel = 'LOW';
          
          recordStep(
            'risk_tolerance_overridden',
            '⚠️ Risk Tolerance Overridden',
            'Document validation failed. Risk tolerance has been overridden. Application will be DENIED due to document mismatch.',
            'risk',
            'failed',
            {
              icon: '⚠️',
              detail: 'Document mismatch overrides risk tolerance settings',
              metadata: {
                originalRiskTolerance: riskToleranceLevel,
                overriddenTo: 'DENY',
                reason: 'Document validation failure'
              }
            }
          );
          
          // STOP HERE - Do not proceed with onboarding if validation failed
          finaliseAudit('denied', undefined, 'DENY');
          
          recordStep(
            'onboarding_final',
            'Decision: Denied',
            'Application automatically DENIED due to document validation failure. User-provided data does not match uploaded document.',
            'decision',
            'failed',
            {
              icon: '❌',
              metadata: {
                reason: 'Document validation failed',
                validationFailures: mismatchSummary
              }
            }
          );
          
          // Show declined page to user
          setFinalDecision('DENY');
          setIsSuccess(true);
          setIsSubmitting(false);
          
          // Return early - do not call startOnboarding
          return;
        } else {
          // Create detailed match summary with partial match indicators
          const matchSummary: string[] = [];
          
          // Use session applicant name for consistency
          const session = getCurrentSession();
          const applicantName = session?.applicantName || userProvidedName;
          
          if (applicantName && documentName) {
            if (applicantName.toLowerCase().trim() === documentName.toLowerCase().trim()) {
              matchSummary.push(`✅ NAME MATCH (Exact): Your entered name "${applicantName}" exactly matches document extracted name "${documentName}"`);
            } else {
              matchSummary.push(`✅ NAME MATCH (Partial): Your entered name "${applicantName}" partially matches document extracted name "${documentName}"`);
            }
          }
          if (userProvidedAddress && documentAddress) {
            if (userProvidedAddress.toLowerCase().trim() === documentAddress.toLowerCase().trim()) {
              matchSummary.push(`✅ ADDRESS MATCH (Exact): Your entered address "${userProvidedAddress}" exactly matches document extracted address "${documentAddress}"`);
            } else {
              matchSummary.push(`✅ ADDRESS MATCH (Partial): Your entered address "${userProvidedAddress}" partially matches document extracted address "${documentAddress}"`);
            }
          }
          if (userProvidedDob && documentDob) {
            if (userProvidedDob.toLowerCase().trim() === documentDob.toLowerCase().trim()) {
              matchSummary.push(`✅ DATE OF BIRTH MATCH (Exact): Your entered DOB "${userProvidedDob}" exactly matches document extracted DOB "${documentDob}"`);
            } else {
              matchSummary.push(`✅ DATE OF BIRTH MATCH (Partial): Your entered DOB "${userProvidedDob}" partially matches document extracted DOB "${documentDob}"`);
            }
          }
          
          recordStep(
            'validation_summary_passed',
            '✅ Document Validation Passed',
            matchSummary.join('\n\n'),
            'documents',
            'completed',
            {
              icon: '✅',
              detail: matchSummary.join('\n\n'),
              metadata: {
                validatedFields: ['name', 'address', 'dateOfBirth'].filter(field => {
                  if (field === 'name') return applicantName && documentName;
                  if (field === 'address') return userProvidedAddress && documentAddress;
                  if (field === 'dateOfBirth') return userProvidedDob && documentDob;
                  return false;
                }),
                userProvided: {
                  name: applicantName,
                  address: userProvidedAddress,
                  dateOfBirth: userProvidedDob
                },
                documentExtracted: {
                  name: documentName,
                  address: documentAddress,
                  dateOfBirth: documentDob
                },
                matchDetails: matchSummary
              }
            }
          );
          
          console.log('[Form] Recorded validation summary (PASSED) to audit trail:', matchSummary);
        }
      }

      const response = await startOnboarding(
        'form-submission', // documentId (form doesn't have actual document upload)
        formData.idType, // documentType
        {
          customerId: `cust-${Date.now()}`,
          applicationId: `app-${Date.now()}`,
          applicant: formattedPayload.applicant,
          documents: formattedPayload.documents,
          signals: formattedPayload.signals
        }, // context
        {}, // agentSelection (empty for form flow)
        riskToleranceValue, // riskProfile
        session?.sessionId // sessionId
      );

      const newTraceId = response.traceId;
      setTraceId(newTraceId);
      console.log('Onboarding started with trace ID:', newTraceId);
      const traceId = newTraceId;

      let pollAttempts = 0;
      const MAX_POLL_ATTEMPTS = 60; // 60 seconds max (60 attempts * 1 second interval)

      const checkStatus = async () => {
        try {
          pollAttempts++;
          
          if (pollAttempts > MAX_POLL_ATTEMPTS) {
            console.error('Polling timeout: Maximum attempts reached');
            throw new Error('Verification is taking longer than expected. Please try again or contact support.');
          }

          const statusResponse = await axios.get(`http://localhost:4000/onboarding/trace/${traceId}`);
          console.log(`Full status response (attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS}):`, JSON.stringify(statusResponse.data, null, 2));

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

            // ── Record detailed agent decisions from backend metadata ──────────────────
            // Check if we have legacy metadata with state machine history
            const result = statusResponse.data.result || statusResponse.data;
            const stateMachine = result?.stateMachine;
            
            if (stateMachine?.history) {
              // Parse state machine history to extract agent results
              const history = stateMachine.history;
              const completedStates = history.filter((t: any) => 
                t.state.includes('COMPLETED') && t.data?.agentOutput
              );

              completedStates.forEach((transition: any) => {
                const agentOutput = transition.data.agentOutput;
                const slot = agentOutput.metadata?.slot || 'UNKNOWN';
                const agentName = agentOutput.metadata?.agent_name || 'agent';
                
                // Map slot to category
                const categoryMap: Record<string, 'kyc' | 'aml' | 'credit' | 'risk' | 'address'> = {
                  'KYC': 'kyc',
                  'AML': 'aml',
                  'CREDIT': 'credit',
                  'RISK': 'risk',
                  'ADDRESS_VERIFICATION': 'address'
                };
                const category = categoryMap[slot] || 'kyc';
                
                // Map slot to label
                const labelMap: Record<string, string> = {
                  'KYC': 'KYC Verification',
                  'AML': 'AML Screening',
                  'CREDIT': 'Credit Assessment',
                  'RISK': 'Risk Evaluation',
                  'ADDRESS_VERIFICATION': 'Address Verification'
                };
                const label = labelMap[slot] || slot;
                
                // Map slot to icon
                const iconMap: Record<string, string> = {
                  'KYC': '🪪',
                  'AML': '🔎',
                  'CREDIT': '💳',
                  'RISK': '⚖️',
                  'ADDRESS_VERIFICATION': '📍'
                };
                const icon = iconMap[slot] || '📋';
                
                // Determine status based on proposal
                const status = agentOutput.proposal === 'deny' ? 'failed' : 
                              agentOutput.proposal === 'escalate' ? 'pending' : 'completed';
                
                // Create description with reasons
                const description = agentOutput.reasons && agentOutput.reasons.length > 0
                  ? agentOutput.reasons[0]
                  : `${label} completed with ${agentOutput.proposal || 'success'}`;
                
                recordStep(
                  `${slot.toLowerCase()}_agent_result`,
                  `${label} Complete`,
                  description,
                  category,
                  status,
                  {
                    icon,
                    durationMs: transition.data?.durationMs,
                    metadata: {
                      agentName,
                      proposal: agentOutput.proposal,
                      confidence: agentOutput.confidence,
                      reasons: agentOutput.reasons,
                      policy_refs: agentOutput.policy_refs,
                      flags: agentOutput.flags
                    }
                  }
                );
              });
            } else {
              // Fallback to generic agent steps if no state machine data
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
            }

            // Record final decision with risk tolerance context
            const decisionStatus = decision === 'APPROVE' ? 'approved' : decision === 'DENY' ? 'denied' : 'escalated';
            const decisionDescription = decision === 'APPROVE'
              ? `All verification checks passed. Application approved. (Risk Tolerance: ${riskToleranceLevel})`
              : decision === 'DENY'
                ? `One or more checks did not meet the required threshold. Application denied. (Risk Tolerance: ${riskToleranceLevel})`
                : `Application flagged for manual review by compliance team. (Risk Tolerance: ${riskToleranceLevel})`;
            
            recordStep(
              'final_decision',
              `Final Decision: ${decision}`,
              decisionDescription,
              'decision',
              decision === 'APPROVE' ? 'completed' : decision === 'DENY' ? 'failed' : 'in_progress',
              { 
                icon: decision === 'APPROVE' ? '✅' : decision === 'DENY' ? '❌' : '⚠️', 
                detail: decision, 
                metadata: { 
                  traceId,
                  riskTolerance: riskToleranceLevel,
                  result: statusResponse.data.result
                } 
              }
            );

            // Show verified details from document AFTER final decision
            if (extractedDocumentData) {
              const capturedDob = extractedDocumentData.dateOfBirth || 
                                 extractedDocumentData.dob || 
                                 getFieldValue(extractedDocumentData.fields || [], 'dateOfBirth') ||
                                 getFieldValue(extractedDocumentData.fields || [], 'dob') ||
                                 getFieldValue(extractedDocumentData.fields || [], 'date_of_birth');
              
              const capturedAddress = extractedDocumentData.address || 
                                     getFieldValue(extractedDocumentData.fields || [], 'address');

              const verifiedFields: Record<string, string> = {};
              if (extractedDocumentData.name) verifiedFields.name = extractedDocumentData.name;
              if (extractedDocumentData.idNumber) verifiedFields.idNumber = extractedDocumentData.idNumber;
              if (capturedDob) verifiedFields.dateOfBirth = capturedDob;
              if (capturedAddress) verifiedFields.address = capturedAddress;

              if (Object.keys(verifiedFields).length > 0) {
                const verifiedFieldsList = Object.entries(verifiedFields)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ');

                recordStep(
                  'verified_details_display',
                  'Verified Document Details',
                  `Details captured and verified from uploaded document: ${verifiedFieldsList}`,
                  'documents',
                  'completed',
                  {
                    icon: '📋',
                    detail: verifiedFieldsList,
                    metadata: {
                      verifiedFields,
                      documentType: extractedDocumentData.documentType,
                      displayedAfterDecision: true
                    }
                  }
                );
              }
            }

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
            onExtractedDataChange={setExtractedDocumentData}
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
        {!isSuccess && (
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
        )}
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