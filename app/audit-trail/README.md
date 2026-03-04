# Audit Trail Page - Enhanced FlowNode Component

## Overview

The Audit Trail page has been enhanced to display comprehensive agent metadata from the orchestration system. The FlowNode component now provides rich visualization of agent processing steps with detailed metadata, decision outcomes, and performance metrics.

## Features Implemented (Task 5.1)

### 1. Prominent Agent Name Display
- Agent names are displayed as badges in the step header
- Color-coded with indigo theme for easy identification
- Includes robot emoji (🤖) for visual recognition
- Only shown for non-legacy steps (filters out backward-compatible default values)

### 2. Decision Outcome Visual Indicators
- Automatic color coding based on decision outcome:
  - **Green** (✓): Approved, Pass, Success outcomes
  - **Red** (✗): Denied, Failed, Rejected outcomes
  - **Orange** (⚠): Escalated, Manual Review outcomes
  - **Blue** (ℹ): Other informational outcomes
- Displays confidence percentage when available
- Shown prominently in the step card header

### 3. Expandable Metadata Sections with Syntax Highlighting
The expanded view includes organized sections:

#### Agent Information
- Agent name and version
- Execution time metrics

#### Decision Details
- Outcome with visual indicator
- Confidence score
- Reasoning explanation

#### Inputs Section
- JSON formatted with syntax highlighting
- Field count badge
- Scrollable for large datasets
- Max height: 240px (15rem)

#### Outputs Section
- JSON formatted with syntax highlighting
- Field count badge
- Scrollable for large datasets
- Max height: 240px (15rem)

#### Errors Section (when present)
- Red-themed warning display
- Error code and timestamp
- Error message details
- Count badge showing number of errors

#### Additional Context
- JSON formatted context data
- Scrollable for large datasets
- Max height: 160px (10rem)

### 4. Lazy Loading for Metadata
- Metadata is only loaded when a step is expanded
- Uses `metadataLoaded` state flag to track loading status
- Prevents unnecessary data processing on initial page load
- Improves performance for pages with many steps

### 5. Virtualized Rendering for >100 Steps
- Automatically enabled when step count exceeds 100
- Uses scroll-based virtualization with 50-item visible window
- Renders only visible items plus 10-item buffer on each side
- Displays "⚡ Virtualized Rendering" badge when active
- Approximate item height: 200px
- Maintains smooth scrolling performance

## Data Structure

### Agent Metadata Interface
```typescript
interface AgentMetadata {
  agentName: string;
  agentVersion?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  decision?: {
    outcome: string;
    confidence?: number;
    reasoning?: string;
  };
  executionTime: number; // milliseconds
  errors?: Array<{
    code: string;
    message: string;
    timestamp: string;
  }>;
  context?: Record<string, unknown>;
}
```

### Enhanced Audit Step
```typescript
interface AuditStep {
  id: string;
  applicationId: string;
  stepKey: string;
  title: string;
  description: string;
  category: StepCategory;
  status: StepStatus;
  timestamp: string;
  agentName: string;
  agentMetadata: AgentMetadata;
  createdAt: string;
  immutable: boolean;
  // ... other fields
}
```

## Agent Types Supported

The component is designed to display metadata from various agents in the orchestration system:

1. **KYC Agent** - Identity verification
2. **AML Agent** - Anti-money laundering screening
3. **Credit Agent** - Credit assessment
4. **Address Verification Agent** - Address validation
5. **Risk Agent** - Overall risk evaluation

## Testing

### Example Data
Example agent metadata is available in `src/examples/agent-metadata-example.ts`:
- KYC verification example
- AML screening example
- Credit assessment example
- Address verification example
- Risk evaluation with errors example

### Loading Test Data
To test the enhanced component with example data:

```typescript
import { loadExampleStepsToLocalStorage } from '@/examples/agent-metadata-example';

// In browser console or test setup
loadExampleStepsToLocalStorage();
```

Then refresh the audit trail page to see the example steps with full agent metadata.

## Performance Considerations

### Lazy Loading
- Metadata is not processed until a step is expanded
- Reduces initial render time
- Improves memory usage for large audit trails

### Virtualization
- Automatically enabled for >100 steps
- Only renders visible items
- Maintains 10-item buffer for smooth scrolling
- Reduces DOM nodes from potentially thousands to ~50

### Optimization Tips
- Keep agent metadata inputs/outputs reasonably sized
- Use pagination for extremely large audit trails (>500 steps)
- Consider server-side filtering for very large datasets

## UI/UX Features

### Visual Hierarchy
1. Agent name badge (prominent, indigo theme)
2. Decision outcome indicator (color-coded)
3. Expandable sections (organized by type)
4. Syntax-highlighted JSON (improved readability)

### Accessibility
- Keyboard navigation supported (button elements)
- Semantic HTML structure
- Color coding supplemented with icons
- Clear visual indicators for interactive elements

### Responsive Design
- Works on mobile and desktop
- Scrollable sections for long content
- Flexible layout adapts to screen size

## Legacy Support

The component maintains backward compatibility:
- Steps without agent metadata show legacy metadata section
- Chat transcript display preserved
- Detail field display preserved
- Filters out "legacy" agent name from display

## Requirements Validated

This implementation validates the following requirements:
- **4.1**: Display all agent process steps
- **4.2**: Display associated agent metadata
- **4.4**: Display agent name, timestamp, and decision outcome
- **4.5**: Expandable metadata with detailed inputs/outputs
- **7.2**: Render 100 steps within 1 second (via virtualization)
- **7.5**: Load metadata on demand when expanded

## Future Enhancements

Potential improvements for future iterations:
1. Real API integration for lazy loading (currently simulated)
2. Advanced syntax highlighting with color themes
3. Metadata search/filter within expanded sections
4. Export functionality for individual step metadata
5. Comparison view for multiple steps
6. Timeline visualization of agent execution flow
