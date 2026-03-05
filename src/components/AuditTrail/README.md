# RiskToleranceToggle Component

## Overview

The `RiskToleranceToggle` component is a React component that provides a visual toggle switch for setting the risk tolerance level of customer onboarding applications. It integrates with the audit trail system to persist risk tolerance changes and determine application approval status.

## Features

✅ **Visual Toggle Switch**: Clear HIGH/LOW labels with color-coded indicators
- GREEN (Emerald) for HIGH risk tolerance → Auto-Approve
- AMBER (Yellow) for LOW risk tolerance → Manual Review

✅ **Loading State**: Shows spinner during persistence operations

✅ **Error Handling**: Displays error messages with retry functionality

✅ **Disabled State**: Prevents changes for finalized applications with explanatory message

✅ **Tooltip**: Hover over info icon to see detailed explanation of risk tolerance impact

✅ **Accessibility**: Proper ARIA labels and keyboard navigation support

✅ **Integration**: Calls `auditStore.setRiskTolerance()` with retry logic

## Usage

```tsx
import { RiskToleranceToggle } from '@/components/AuditTrail';
import { useState } from 'react';

function MyComponent() {
  const [riskLevel, setRiskLevel] = useState<'HIGH' | 'LOW'>('HIGH');

  return (
    <RiskToleranceToggle
      currentLevel={riskLevel}
      onChange={(newLevel) => setRiskLevel(newLevel)}
      applicationId="app-123"
      disabled={false}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentLevel` | `'HIGH' \| 'LOW'` | Yes | Current risk tolerance level |
| `onChange` | `(level: RiskToleranceLevel) => void` | Yes | Callback when toggle changes |
| `applicationId` | `string` | Yes | Unique application identifier |
| `disabled` | `boolean` | No | Disables toggle (default: false) |

## Business Logic

- **HIGH Risk Tolerance**: Applications are automatically approved without manual review
- **LOW Risk Tolerance**: Applications are escalated for manual compliance review

The component calls `setRiskTolerance()` from `auditStore` which:
1. Persists to localStorage immediately for fast access
2. Syncs to backend API with exponential backoff retry logic (3 attempts)
3. Updates application status based on the new risk tolerance level

## Visual States

### Normal State (HIGH)
- Green background with white slider on the left
- "HIGH" label visible, "LOW" label faded
- CheckCircle icon in slider
- "Auto-Approve" status text

### Normal State (LOW)
- Amber background with white slider on the right
- "LOW" label visible, "HIGH" label faded
- AlertTriangle icon in slider
- "Manual Review" status text

### Loading State
- Spinner animation in slider
- Toggle disabled during loading

### Error State
- Red error banner below toggle
- Error message with retry button
- Toggle remains functional for retry

### Disabled State
- Reduced opacity (50%)
- Cursor shows "not-allowed"
- Info banner explaining why it's disabled

## Requirements Satisfied

This component satisfies the following requirements from the spec:

- **Requirement 1.1**: Displays Risk_Tolerance_Toggle control on Audit_Trail_Page
- **Requirement 1.2**: Allows selection between HIGH and LOW values
- **Requirement 1.4**: Displays current Risk_Tolerance_Level setting
- **Requirement 1.5**: Accessible to users with reviewer permissions (UI component ready)

## Implementation Details

### File Structure
```
src/components/AuditTrail/
├── RiskToleranceToggle.tsx          # Main component
├── RiskToleranceToggle.example.tsx  # Usage examples
├── __tests__/
│   └── RiskToleranceToggle.test.tsx # Unit tests (requires test setup)
├── index.ts                          # Exports
└── README.md                         # This file
```

### Dependencies
- React (hooks: useState)
- lucide-react (icons: AlertTriangle, CheckCircle2, Info)
- @/types/audit (RiskToleranceLevel type)
- @/lib/auditStore (setRiskTolerance function)
- Tailwind CSS (styling)

### Styling
The component uses Tailwind CSS utility classes for styling:
- Responsive design
- Smooth transitions and animations
- Color-coded states (emerald for HIGH, amber for LOW, rose for errors)
- Accessible focus states

## Testing

A comprehensive test suite is provided in `__tests__/RiskToleranceToggle.test.tsx` covering:

- ✅ Rendering with HIGH and LOW levels
- ✅ Toggle functionality (HIGH ↔ LOW)
- ✅ Loading state during async operations
- ✅ Error handling and retry functionality
- ✅ Disabled state behavior
- ✅ Tooltip display on hover
- ✅ Prevention of multiple simultaneous toggles
- ✅ ARIA attributes for accessibility

**Note**: To run tests, install testing dependencies:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

Then add a `vitest.config.ts` file and update `package.json` with a test script.

## Integration Example

Here's how to integrate the component into an audit trail page:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { RiskToleranceToggle } from '@/components/AuditTrail';
import { getRiskTolerance, determineApplicationStatus } from '@/lib/auditStore';
import type { RiskToleranceLevel } from '@/types/audit';

export function AuditTrailPage({ applicationId }: { applicationId: string }) {
  const [riskLevel, setRiskLevel] = useState<RiskToleranceLevel>('HIGH');
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    // Load current risk tolerance
    const currentLevel = getRiskTolerance(applicationId);
    if (currentLevel) {
      setRiskLevel(currentLevel);
    }
  }, [applicationId]);

  const handleRiskChange = (newLevel: RiskToleranceLevel) => {
    setRiskLevel(newLevel);
    
    // Determine and display new application status
    const newStatus = determineApplicationStatus(newLevel);
    console.log('Application status:', newStatus);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Audit Trail</h1>
      
      <div className="mb-6">
        <RiskToleranceToggle
          currentLevel={riskLevel}
          onChange={handleRiskChange}
          applicationId={applicationId}
          disabled={isFinalized}
        />
      </div>
      
      {/* Rest of audit trail content */}
    </div>
  );
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Audit History**: Show history of risk tolerance changes with timestamps
2. **Permissions**: Integrate with user role/permission system
3. **Confirmation Dialog**: Add confirmation modal for critical changes
4. **Keyboard Shortcuts**: Add keyboard shortcuts for power users
5. **Analytics**: Track toggle usage patterns for insights

## Support

For questions or issues with this component, refer to:
- Design document: `.kiro/specs/risk-tolerance-audit-enhancement/design.md`
- Requirements: `.kiro/specs/risk-tolerance-audit-enhancement/requirements.md`
- Audit store implementation: `src/lib/auditStore.ts`
