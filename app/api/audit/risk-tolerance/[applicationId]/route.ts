// app/api/audit/risk-tolerance/[applicationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { riskToleranceStorage } from '../storage';

/**
 * GET /api/audit/risk-tolerance/:applicationId
 * Get risk tolerance level for a specific application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    // In Next.js 15+, params is a Promise and must be awaited
    const { applicationId } = await params;

    if (!applicationId) {
      return NextResponse.json(
        { error: { message: 'applicationId is required' } },
        { status: 400 }
      );
    }

    // Get risk tolerance from store
    const riskTolerance = riskToleranceStorage.get(applicationId);

    if (!riskTolerance) {
      // Return default HIGH risk tolerance instead of 404
      // This enables auto-approval behavior when risk tolerance hasn't been explicitly set
      console.log(`[RiskTolerance API] No risk tolerance found for ${applicationId}, returning default HIGH`);
      return NextResponse.json({
        level: 'HIGH',
        setBy: 'system',
        setAt: new Date().toISOString(),
        isDefault: true,
      });
    }

    console.log(`[RiskTolerance API] Retrieved risk tolerance for ${applicationId}: ${riskTolerance.level}`);

    return NextResponse.json({
      level: riskTolerance.level,
      setBy: riskTolerance.setBy,
      setAt: riskTolerance.setAt,
      previousLevel: riskTolerance.previousLevel,
    });
  } catch (error) {
    console.error('[RiskTolerance API] Error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
