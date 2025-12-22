import { NextResponse } from 'next/server';

// Update this URL to match your orchestrator service URL
const ORCHESTRATOR_URL = 'http://localhost:5005/api/chat';

export async function POST(request: Request) {
  try {
    const { sessionId, message, files = [] } = await request.json();
    
    // Call the orchestrator service
    const response = await fetch(`${ORCHESTRATOR_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message,
        files
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process message');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}