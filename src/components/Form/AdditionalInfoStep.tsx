import React from 'react';
import { FormStepProps } from './types';

const AdditionalInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Additional Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            ID Type *
            {errors?.idType && <span className="text-red-500 text-xs ml-2">{errors.idType}</span>}
          </label>
          <select
            name="idType"
            value={formData.idType}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.idType ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          >
            <option value="passport">Passport</option>
            <option value="drivers-license">Driver's License</option>
            <option value="national-id">National ID</option>
            <option value="pan">PAN</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            ID Number *
            {errors?.idNumber && <span className="text-red-500 text-xs ml-2">{errors.idNumber}</span>}
          </label>
          <input
            type="text"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.idNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>

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
      </div>

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
