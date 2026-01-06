import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const upstreamResponse = await fetch(
      `${API_BASE_URL}/onboarding/credit-card/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await upstreamResponse.json().catch(() => ({}));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        data || { error: 'Credit application submission failed' },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Credit application API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit credit application' },
      { status: 500 }
    );
  }
}
