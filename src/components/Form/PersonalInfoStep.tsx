import React from 'react';
import { FormStepProps } from './types';

const PersonalInfoStep: React.FC<FormStepProps> = ({ formData, handleChange, errors }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Full Name *
            {errors?.fullName && <span className="text-red-500 text-xs ml-2">{errors.fullName}</span>}
          </label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.fullName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Gender *
            {errors?.gender && <span className="text-red-500 text-xs ml-2">{errors.gender}</span>}
          </label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.gender ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email Address *
            {errors?.email && <span className="text-red-500 text-xs ml-2">{errors.email}</span>}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Phone Number *
            {errors?.phone && <span className="text-red-500 text-xs ml-2">{errors.phone}</span>}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.phone ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Date of Birth *
            {errors?.dateOfBirth && <span className="text-red-500 text-xs ml-2">{errors.dateOfBirth}</span>}
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors?.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;
