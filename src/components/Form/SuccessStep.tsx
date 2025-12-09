import React from 'react';

interface SuccessStepProps {
  onNewSubmission: () => void;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ onNewSubmission }) => {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="mt-3 text-2xl font-bold text-gray-900">Application Submitted Successfully!</h2>
      <p className="mt-2 text-gray-600">
        Thank you for submitting your application. We'll review your information and get back to you within 2-3 business days.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onNewSubmission}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Submit Another Application
        </button>
      </div>
    </div>
  );
};

export default SuccessStep;
