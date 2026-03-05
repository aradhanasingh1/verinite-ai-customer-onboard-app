// app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { addressVerificationApi } from '@/services/apiClient';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const addressData = Object.fromEntries(formData.entries());
    const file = formData.get('document') as File | null;
    
    const response = await addressVerificationApi.verifyAddress(
      addressData
    );
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Verification Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify address' },
      { status: 500 }
    );
  }
}