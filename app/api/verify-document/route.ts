import { NextResponse } from 'next/server';
import { parseDocumentForKyc } from '@/services/server/kycDocumentParserService';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('document');
    const requestedType = String(
      formData.get('type') || formData.get('documentType') || 'unknown'
    ).trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing document file.' },
        { status: 400 }
      );
    }

    const result = await parseDocumentForKyc(file, requestedType);
    if (!result.success) {
      return NextResponse.json(result, { status: result.statusCode || 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Document parsing route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse document.' },
      { status: 500 }
    );
  }
}
