// app/api/audit/risk-tolerance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { riskToleranceStorage } from './storage';

/**
 * POST /api/audit/risk-tolerance
 * Set risk tolerance level for an application
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, level, userId, timestamp } = body;

    // Validate required fields
    if (!applicationId || !level) {
      return NextResponse.json(
        { error: { message: 'applicationId and level are required' } },
        { status: 400 }
      );
    }

    // Validate level
    if (level !== 'HIGH' && level !== 'LOW') {
      return NextResponse.json(
        { error: { message: 'level must be HIGH or LOW' } },
        { status: 400 }
      );
    }

    // Get previous level if exists
    const existing = riskToleranceStorage.get(applicationId);
    const previousLevel = existing?.level;

    // Store the risk tolerance
    riskToleranceStorage.set(applicationId, {
      level,
      setBy: userId || 'current_user',
      setAt: timestamp || new Date().toISOString(),
      previousLevel,
    });

    console.log(`[RiskTolerance API] Set risk tolerance for ${applicationId}: ${level}`);

    return NextResponse.json({
      success: true,
      status: 'saved',
      timestamp: timestamp || new Date().toISOString(),
      level,
      previousLevel,
    });
  } catch (error) {
    console.error('[RiskTolerance API] Error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
