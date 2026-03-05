// src/components/AuditTrail/RiskToleranceToggle.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { RiskToleranceLevel } from '@/types/audit';
import { setRiskTolerance } from '@/lib/auditStore';

export interface RiskToleranceToggleProps {
  currentLevel: RiskToleranceLevel;
  onChange: (level: RiskToleranceLevel) => void;
  disabled?: boolean;
  applicationId: string;
}

export function RiskToleranceToggle({
  currentLevel,
  onChange,
  disabled = false,
  applicationId,
}: RiskToleranceToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    const newLevel: RiskToleranceLevel = currentLevel === 'HIGH' ? 'LOW' : 'HIGH';
    
    console.log('[RiskToleranceToggle] Toggling from', currentLevel, 'to', newLevel);
    console.log('[RiskToleranceToggle] Application ID:', applicationId);
    
    setIsLoading(true);
    setError(null);

    try {
      // Only call setRiskTolerance if we have a real session ID
      if (applicationId && applicationId !== 'default') {
        await setRiskTolerance(newLevel, applicationId);
      } else {
        // For 'default' or no session, just store in localStorage
        console.log('[RiskToleranceToggle] Storing default risk tolerance:', newLevel);
        if (typeof window !== 'undefined') {
          localStorage.setItem('verinite_default_risk_tolerance', newLevel);
        }
      }
      
      // Always call onChange to update parent component state
      onChange(newLevel);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update risk tolerance';
      setError(errorMessage);
      console.error('Failed to set risk tolerance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isHigh = currentLevel === 'HIGH';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Risk Tolerance</span>
            <div 
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info size={16} className="text-gray-400 cursor-help" />
              {showTooltip && (
                <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  <p className="font-semibold mb-1">HIGH: Automatic approval</p>
                  <p className="mb-2">Applications are automatically approved without manual review.</p>
                  <p className="font-semibold mb-1">LOW: Manual review required</p>
                  <p>Applications are escalated for manual compliance review.</p>
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={disabled || isLoading}
          className={`
            relative inline-flex h-8 w-32 items-center rounded-full transition-colors
            ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isHigh ? 'bg-emerald-500' : 'bg-amber-500'}
          `}
          aria-label={`Toggle risk tolerance. Current: ${currentLevel}`}
          aria-pressed={isHigh}
        >
          {/* Toggle slider */}
          <span
            className={`
              inline-flex h-6 w-14 items-center justify-center rounded-full bg-white shadow-md
              transition-transform duration-200 ease-in-out
              ${isHigh ? 'translate-x-1' : 'translate-x-[66px]'}
            `}
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
            ) : isHigh ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-amber-600" />
            )}
          </span>

          {/* Labels */}
          <span
            className={`
              absolute left-2 text-xs font-semibold transition-opacity
              ${isHigh ? 'text-white opacity-100' : 'text-white/50 opacity-0'}
            `}
          >
            HIGH
          </span>
          <span
            className={`
              absolute right-2 text-xs font-semibold transition-opacity
              ${!isHigh ? 'text-white opacity-100' : 'text-white/50 opacity-0'}
            `}
          >
            LOW
          </span>
        </button>

        {/* Current status indicator */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isHigh ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isHigh ? 'High' : 'Low'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-rose-800 font-medium">Failed to update risk tolerance</p>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
            <button
              onClick={handleToggle}
              className="mt-2 text-xs text-rose-700 underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Disabled state message */}
      {disabled && (
        <div className="flex items-start gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Info size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            Risk tolerance cannot be changed for finalized applications.
          </p>
        </div>
      )}
    </div>
  );
}
