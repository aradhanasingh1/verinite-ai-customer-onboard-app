// src/components/AuditTrail/RiskToleranceToggle.example.tsx
// Example usage of the RiskToleranceToggle component

'use client';

import { useState } from 'react';
import { RiskToleranceToggle } from './RiskToleranceToggle';
import type { RiskToleranceLevel } from '@/types/audit';

export function RiskToleranceToggleExample() {
  const [riskLevel, setRiskLevel] = useState<RiskToleranceLevel>('HIGH');
  const [isFinalized, setIsFinalized] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Risk Tolerance Toggle Examples</h2>

      {/* Example 1: Normal usage */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Example 1: Normal Usage</h3>
        <RiskToleranceToggle
          currentLevel={riskLevel}
          onChange={(newLevel) => {
            console.log('Risk tolerance changed to:', newLevel);
            setRiskLevel(newLevel);
          }}
          applicationId="example-app-001"
        />
      </div>

      {/* Example 2: Disabled state */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Example 2: Disabled State (Finalized Application)</h3>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isFinalized}
              onChange={(e) => setIsFinalized(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Simulate finalized application</span>
          </label>
        </div>
        <RiskToleranceToggle
          currentLevel="LOW"
          onChange={(newLevel) => {
            console.log('Risk tolerance changed to:', newLevel);
          }}
          disabled={isFinalized}
          applicationId="example-app-002"
        />
      </div>

      {/* Example 3: Integration with application status */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Example 3: With Application Status Display</h3>
        <div className="space-y-4">
          <RiskToleranceToggle
            currentLevel={riskLevel}
            onChange={setRiskLevel}
            applicationId="example-app-003"
          />
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Current Status:</span>{' '}
              {riskLevel === 'HIGH' ? (
                <span className="text-emerald-600 font-semibold">Approved (Automatic)</span>
              ) : (
                <span className="text-amber-600 font-semibold">Escalated (Manual Review)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Usage instructions */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="text-lg font-semibold mb-2">Usage Instructions</h3>
        <div className="text-sm space-y-2">
          <p>
            <strong>Props:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code>currentLevel</code>: Current risk tolerance level ('HIGH' or 'LOW')</li>
            <li><code>onChange</code>: Callback function called when the toggle is changed</li>
            <li><code>applicationId</code>: Unique identifier for the application</li>
            <li><code>disabled</code>: Optional boolean to disable the toggle (e.g., for finalized applications)</li>
          </ul>
          <p className="mt-3">
            <strong>Behavior:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>HIGH risk tolerance → Applications are automatically approved</li>
            <li>LOW risk tolerance → Applications are escalated for manual review</li>
            <li>Shows loading state during persistence to backend</li>
            <li>Displays error messages with retry option if persistence fails</li>
            <li>Includes tooltip explaining the impact of each risk level</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
