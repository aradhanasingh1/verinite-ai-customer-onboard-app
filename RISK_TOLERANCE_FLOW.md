# Risk Tolerance Flow Documentation

## Overview

The risk tolerance feature allows users to control the approval threshold for customer onboarding applications. The system supports two risk tolerance levels:

- **HIGH**: Applications are automatically approved if document information matches the application
- **LOW**: Applications are escalated for manual review

## Architecture

### Frontend Components

1. **Landing Page** (`app/page.tsx`)
   - Displays the Risk Management section with the RiskToleranceToggle
   - Loads the current risk tolerance level from localStorage/backend
   - Allows users to set risk tolerance before starting the onboarding process

2. **Audit Trail Page** (`app/audit-trail/page.tsx`)
   - Also displays the Risk Management section
   - Shows the current risk tolerance for the application
   - Allows users to change risk tolerance during the process

3. **RiskToleranceToggle Component** (`src/components/AuditTrail/RiskToleranceToggle.tsx`)
   - Visual toggle switch between HIGH and LOW
   - Shows "Auto-Approve" for HIGH and "Manual Review" for LOW
   - Persists changes to localStorage and backend API
   - Includes tooltip explaining the impact of each level

4. **ChatInterface** (`src/components/ChatInterface/ChatInterface.tsx`)
   - Fetches the current risk tolerance when uploading documents
   - Passes the risk tolerance to the orchestration system
   - No longer asks for risk tolerance during the chat flow

### Backend Components

1. **Audit Store** (`src/lib/auditStore.ts`)
   - `setRiskTolerance(level, applicationId)`: Persists risk tolerance to localStorage and backend
   - `getRiskTolerance(applicationId)`: Retrieves risk tolerance from localStorage
   - `getRiskToleranceAsync(applicationId)`: Retrieves risk tolerance with backend fallback
   - `determineApplicationStatus(riskTolerance)`: Maps risk tolerance to application status
     - HIGH → "approved"
     - LOW → "escalated"

2. **Orchestration Backend** (`agentic-onboarding-orchestrated/src/index.ts`)
   - `buildContext()`: Extracts risk tolerance from request body
   - Passes risk tolerance to the decision gateway

3. **Decision Gateway** (`agentic-onboarding-orchestrated/src/decisionGateway/decisionGateway.ts`)
   - `evaluateDecision()`: Makes final approval decision based on risk tolerance
   - Business rules:
     - If `riskProfile === "high"` AND document matches application → **APPROVE**
     - If `riskProfile === "low"` → **ESCALATE** (manual review)
     - Otherwise, follows agent proposals and confidence scores

## Data Flow

### Setting Risk Tolerance

```
User toggles risk tolerance
    ↓
RiskToleranceToggle.handleToggle()
    ↓
auditStore.setRiskTolerance(level, applicationId)
    ↓
├─ Save to localStorage (immediate)
└─ POST /api/audit/risk-tolerance (with retry logic)
    ↓
Backend persists to database
    ↓
onChange callback updates UI
    ↓
determineApplicationStatus() calculates new status
```

### Document Upload & Verification

```
User uploads document in ChatInterface
    ↓
handleDocumentUpload()
    ↓
getCurrentSession() to get sessionId
    ↓
getRiskToleranceAsync(sessionId) to fetch risk tolerance
    ↓
startOnboarding(documentId, ..., riskToleranceValue, sessionId)
    ↓
POST /onboarding/start with riskProfile in body
    ↓
Backend buildContext() extracts riskProfile
    ↓
Orchestrator runs agents (KYC, AML, Credit, Address, Risk)
    ↓
Each agent returns AgentOutput with proposal
    ↓
Decision Gateway evaluateDecision(agentOutput, context)
    ↓
├─ Extract riskProfile from context.payload
├─ Check if document matches application
└─ Apply business rules:
    ├─ HIGH + match → APPROVE
    ├─ LOW → ESCALATE
    └─ Otherwise → follow agent proposal
    ↓
Return final decision (APPROVE/DENY/ESCALATE)
    ↓
Frontend polls for result
    ↓
Display decision in chat
    ↓
Update audit trail with final status
```

## API Endpoints

### Frontend → Backend

1. **POST /api/audit/risk-tolerance**
   - Request: `{ applicationId, level, userId, timestamp }`
   - Response: `{ success, status, timestamp }`
   - Purpose: Persist risk tolerance setting

2. **GET /api/audit/risk-tolerance/:applicationId**
   - Response: `{ level, setBy, setAt }`
   - Purpose: Retrieve current risk tolerance

3. **POST /onboarding/start**
   - Request: `{ documentId, documentType, customerId, applicationId, agentSelection, riskProfile, sessionId, slot, payload }`
   - Response: `{ traceId, status, result, auditTrail }`
   - Purpose: Start the onboarding orchestration with risk tolerance

4. **GET /onboarding/trace/:traceId**
   - Response: `{ traceId, status, result, finalDecision, auditTrail }`
   - Purpose: Poll for orchestration result

## Type Definitions

```typescript
// Risk tolerance level
export type RiskToleranceLevel = 'HIGH' | 'LOW';

// Application status
export type ApplicationStatus = 
  | 'in_progress' 
  | 'approved' 
  | 'denied' 
  | 'escalated' 
  | 'pending';

// Risk tolerance record
export interface RiskToleranceRecord {
  id: string;
  applicationId: string;
  level: RiskToleranceLevel;
  setBy: string;
  setAt: string;
  previousLevel?: RiskToleranceLevel;
}
```

## Business Rules

### Risk Tolerance Mapping

| Risk Tolerance | Document Match | Final Decision | Description |
|---------------|----------------|----------------|-------------|
| HIGH | Yes | APPROVE | Automatic approval |
| HIGH | No | Follow agent proposal | Standard evaluation |
| LOW | Any | ESCALATE | Manual review required |

### Document Matching Criteria

For HIGH risk tolerance to result in automatic approval, the following fields must match between the uploaded document and the application:

1. **Full Name**: Exact match or initials equivalence
2. **Gender**: Exact match
3. **Date of Birth**: Exact match (normalized to YYYY-MM-DD)
4. **Address**: Partial match (one contains the other)

## User Experience

### Landing Page Flow

1. User lands on the home page
2. If a session exists, the Risk Management section is displayed
3. User can set risk tolerance to HIGH or LOW
4. User clicks "Open Chat" to start the onboarding process
5. Risk tolerance is already set and will be used during verification

### Chat Flow

1. User starts chat (no risk tolerance question)
2. Chat asks for full name, gender, email, DOB, phone, address
3. User uploads document
4. System fetches the risk tolerance set on the landing page
5. System passes risk tolerance to orchestration
6. Orchestration evaluates based on risk tolerance
7. Final decision is displayed in chat
8. User can view detailed audit trail

### Audit Trail Flow

1. User navigates to audit trail page
2. Risk Management section shows current risk tolerance
3. User can change risk tolerance if application is not finalized
4. Application status updates automatically based on risk tolerance
5. All agent processing steps are displayed with metadata

## Error Handling

### Frontend

- **localStorage failure**: Gracefully degrades, continues with API persistence
- **API failure**: Retries up to 3 times with exponential backoff (100ms, 200ms, 400ms)
- **Network error**: Displays error message with retry button

### Backend

- **Missing risk tolerance**: Defaults to "low" (conservative approach)
- **Invalid risk tolerance**: Normalizes to "high" or "low" or defaults to "low"
- **Agent failure**: Escalates for manual review

## Testing

### Manual Testing Steps

1. **Set HIGH risk tolerance**
   - Go to landing page
   - Toggle risk tolerance to HIGH
   - Start chat and complete onboarding
   - Verify application is APPROVED (if document matches)

2. **Set LOW risk tolerance**
   - Go to landing page
   - Toggle risk tolerance to LOW
   - Start chat and complete onboarding
   - Verify application is ESCALATED

3. **Change risk tolerance mid-process**
   - Start onboarding with HIGH
   - Go to audit trail page
   - Change to LOW
   - Verify status updates to "Under Manual Review"

4. **Verify persistence**
   - Set risk tolerance
   - Refresh page
   - Verify risk tolerance is still set

## Future Enhancements

1. **Role-based access control**: Only authorized users can change risk tolerance
2. **Audit history**: Track all risk tolerance changes with timestamps and user IDs
3. **Risk tolerance presets**: Organization-level default risk tolerance settings
4. **Conditional risk tolerance**: Different risk levels for different document types
5. **Risk score calculation**: Dynamic risk tolerance based on applicant profile
