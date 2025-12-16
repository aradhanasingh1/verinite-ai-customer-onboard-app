import React from 'react';

interface SuccessStepProps {
  onNewSubmission: () => void;
  finalDecision?: string | null;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ onNewSubmission, finalDecision }) => {
  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
      </div>
      <h3 className="mt-3 text-lg font-medium text-gray-900">Application Submitted Successfully!</h3>
      {finalDecision && (
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Decision: <span className="font-medium">{finalDecision}</span>
          </p>
        </div>
      )}
      <div className="mt-6">
        <button
          type="button"
          onClick={onNewSubmission}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Start New Application
        </button>
      </div>
    </div>
  );
};

export default SuccessStep;