import React from 'react';
import { FormStepProps } from './types';

const AddressInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors, verifiedAddress }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Address Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Address Line 1 */}
        <div className="space-y-2">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
                errors.address ? 'border-red-500' : ''
              }`}
              placeholder="123 Main St"
            />
            {verifiedAddress?.isVerified && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {verifiedAddress?.isVerified && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Address verified
            </p>
          )}
          {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
        </div>

        {/* City */}
        <div className="space-y-2">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.city ? 'border-red-500' : ''
            }`}
            placeholder="New York"
          />
          {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
        </div>

        {/* State/Province */}
        <div className="space-y-2">
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State/Province <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.state ? 'border-red-500' : ''
            }`}
            placeholder="NY"
          />
          {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
        </div>

        {/* ZIP/Postal Code */}
        <div className="space-y-2">
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
            ZIP/Postal Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.zipCode ? 'border-red-500' : ''
            }`}
            placeholder="10001"
          />
          {errors.zipCode && <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.country ? 'border-red-500' : ''
            }`}
          >
            <option value="">Select a country</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="IN">India</option>
            {/* Add more countries as needed */}
          </select>
          {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
        </div>
      </div>

      {/* Error and verification messages */}
      <div className="mt-4 space-y-2">
        {errors.addressVerification && (
          <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">
            {errors.addressVerification}
          </div>
        )}
        {verifiedAddress?.verified && verifiedAddress.verified !== formData.address && (
          <div className="p-3 rounded-md bg-blue-50 text-blue-800 text-sm">
            <p className="font-medium">Suggested Address:</p>
            <p>{verifiedAddress.verified}</p>
          </div>
        )}
      </div>
       <div className="space-y-2">
    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
      Street Address <span className="text-red-500">*</span>
    </label>
    <div className="relative">
      <input
        type="text"
        id="address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 ${
          errors.address ? 'border-red-500' : ''
        }`}
        placeholder="123 Main St"
      />
      {verifiedAddress?.isVerified && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
    {verifiedAddress?.isVerified && (
      <p className="mt-1 text-sm text-green-600">
        ✓ Address verified
      </p>
    )}
    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
  </div>
    </div>
  );
};

export default AddressInfoStep;