const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_OCR_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const DEFAULT_EXTRACTION_MODEL = 'openai/gpt-oss-120b';
const MAX_GROQ_BASE64_IMAGE_BYTES = 4 * 1024 * 1024;

const DOCUMENT_TYPES = [
  'passport',
  'drivers_license',
  'aadhaar',
  'national_id',
  'utility_bill',
  'bank_statement',
  'unknown',
] as const;

export type KycDocumentType = (typeof DOCUMENT_TYPES)[number];

export interface KycExtractedField {
  key: string;
  value: string;
  confidence: number | null;
}

export interface KycDocumentParseResult {
  success: boolean;
  documentType?: KycDocumentType;
  documentTypeConfidence?: number | null;
  extractedData?: {
    name: string | null;
    documentType: KycDocumentType;
    idNumber: string | null;
    rawText: string;
    fields: KycExtractedField[];
  };
  verificationFields?: Record<string, string>;
  modelInfo?: {
    ocrModel: string;
    extractionModel: string;
  };
  warnings?: string[];
  error?: string;
  statusCode?: number;
}

type GroqMessagePart = {
  type?: string;
  text?: string;
};

type GroqCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | GroqMessagePart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

type OcrResponsePayload = {
  rawText?: string;
  documentTypeHint?: string | null;
};

type ExtractionPayload = {
  documentType?: string | null;
  documentTypeConfidence?: number | null;
  name?: string | null;
  idNumber?: string | null;
  fields?: Array<{
    key?: string;
    value?: string;
    confidence?: number | null;
  }>;
};

const EXTRACTION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentType: {
      type: ['string', 'null'],
      enum: [...DOCUMENT_TYPES, null],
    },
    documentTypeConfidence: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 1,
    },
    name: {
      type: ['string', 'null'],
    },
    idNumber: {
      type: ['string', 'null'],
    },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          confidence: {
            type: ['number', 'null'],
            minimum: 0,
            maximum: 1,
          },
        },
        required: ['key', 'value', 'confidence'],
      },
    },
  },
  required: ['documentType', 'documentTypeConfidence', 'name', 'idNumber', 'fields'],
};

const normalizeDocumentType = (value: string | null | undefined): KycDocumentType => {
  if (!value) return 'unknown';
  const cleaned = value.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (cleaned === 'driver_license' || cleaned === 'driving_license') {
    return 'drivers_license';
  }
  if (cleaned === 'aadhar' || cleaned === 'aadhar_card') {
    return 'aadhaar';
  }
  if (cleaned === 'id_card' || cleaned === 'identity_card') {
    return 'national_id';
  }

  if ((DOCUMENT_TYPES as readonly string[]).includes(cleaned)) {
    return cleaned as KycDocumentType;
  }
  return 'unknown';
};

const sanitizeTextValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const safeJsonParse = <T>(content: string): T | null => {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const extractMessageContent = (response: GroqCompletionResponse): string | null => {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim() || null;
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
    return joined || null;
  }
  return null;
};

const parseGroqResponse = async (
  response: Response
): Promise<GroqCompletionResponse | null> => {
  try {
    return (await response.json()) as GroqCompletionResponse;
  } catch {
    return null;
  }
};

const callGroq = async (
  apiKey: string,
  body: Record<string, unknown>
): Promise<GroqCompletionResponse> => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const parsed = await parseGroqResponse(response);
  if (!response.ok) {
    const message =
      parsed?.error?.message || `Groq request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!parsed) {
    throw new Error('Groq returned an unreadable response payload.');
  }

  return parsed;
};

const fallbackExtract = (
  rawText: string,
  requestedType: KycDocumentType
): ExtractionPayload => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const labeledName = rawText.match(/name\s*[:\-]\s*([A-Za-z][A-Za-z\s.'-]{2,80})/i);
  const uppercaseLine = lines.find((line) => /^[A-Z][A-Z\s.'-]{4,}$/.test(line));
  const name = sanitizeTextValue(labeledName?.[1]) || sanitizeTextValue(uppercaseLine);

  const knownIdPatterns = [
    /\b\d{4}\s?\d{4}\s?\d{4}\b/, // Aadhaar
    /\b[A-Z]\d{7}\b/, // Passport-like
    /\b[A-Z0-9]{6,20}\b/,
  ];
  let idNumber: string | null = null;
  for (const pattern of knownIdPatterns) {
    const match = rawText.match(pattern);
    if (match?.[0]) {
      idNumber = match[0].replace(/\s+/g, '');
      break;
    }
  }

  const fields: KycExtractedField[] = [];
  if (name) {
    fields.push({ key: 'fullName', value: name, confidence: null });
  }
  if (idNumber) {
    fields.push({ key: 'idNumber', value: idNumber, confidence: null });
  }

  return {
    documentType: requestedType,
    documentTypeConfidence: null,
    name,
    idNumber,
    fields,
  };
};

const toVerificationFields = (
  documentType: KycDocumentType,
  extraction: ExtractionPayload
): Record<string, string> => {
  const output: Record<string, string> = {
    idType: documentType,
  };

  const name = sanitizeTextValue(extraction.name);
  const idNumber = sanitizeTextValue(extraction.idNumber);
  if (name) output.fullName = name;
  if (idNumber) output.idNumber = idNumber;

  const fields = Array.isArray(extraction.fields) ? extraction.fields : [];
  for (const field of fields) {
    const key = sanitizeTextValue(field.key);
    const value = sanitizeTextValue(field.value);
    if (!key || !value) continue;
    if (!(key in output)) {
      output[key] = value;
    }
  }

  return output;
};

export const parseDocumentForKyc = async (
  file: File,
  requestedTypeInput: string
): Promise<KycDocumentParseResult> => {
  const requestedType = normalizeDocumentType(requestedTypeInput);
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return {
      success: false,
      documentType: requestedType,
      error: 'GROQ_API_KEY is missing. OCR parsing is unavailable.',
      statusCode: 500,
    };
  }

  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      documentType: requestedType,
      error: 'Only image uploads are supported for OCR parsing (JPG, PNG, WEBP).',
      statusCode: 400,
    };
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.byteLength > MAX_GROQ_BASE64_IMAGE_BYTES) {
    return {
      success: false,
      documentType: requestedType,
      error: 'Image is too large for Groq OCR base64 ingestion (max 4MB).',
      statusCode: 413,
    };
  }

  const imageDataUrl = `data:${file.type};base64,${fileBuffer.toString('base64')}`;
  const ocrModel = process.env.GROQ_OCR_MODEL || DEFAULT_OCR_MODEL;
  const extractionModel =
    process.env.GROQ_KYC_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL;

  const warnings: string[] = [];

  let rawText = '';
  let ocrTypeHint: KycDocumentType = requestedType;
  try {
    const ocrResponse = await callGroq(groqApiKey, {
      model: ocrModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an OCR engine. Return strict JSON with keys rawText and documentTypeHint. rawText must contain all visible text from the document.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Requested document type: ${requestedType}. Perform OCR and return JSON.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
    });

    const ocrContent = extractMessageContent(ocrResponse);
    const ocrJson = ocrContent ? safeJsonParse<OcrResponsePayload>(ocrContent) : null;
    rawText = sanitizeTextValue(ocrJson?.rawText) || '';
    ocrTypeHint = normalizeDocumentType(ocrJson?.documentTypeHint || requestedType);
  } catch (error) {
    return {
      success: false,
      documentType: requestedType,
      error:
        error instanceof Error
          ? `Groq OCR failed: ${error.message}`
          : 'Groq OCR failed.',
      statusCode: 502,
    };
  }

  if (!rawText) {
    return {
      success: false,
      documentType: requestedType,
      error: 'OCR returned no readable text from the document.',
      statusCode: 422,
    };
  }

  let extraction: ExtractionPayload | null = null;
  try {
    const extractionResponse = await callGroq(groqApiKey, {
      model: extractionModel,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'kyc_document_extraction',
          strict: true,
          schema: EXTRACTION_SCHEMA,
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'Extract KYC-ready structured data from OCR text. Prefer exact values from OCR. Use null when unavailable.',
        },
        {
          role: 'user',
          content: `Requested type: ${requestedType}\nOCR type hint: ${ocrTypeHint}\n\nOCR text:\n${rawText}`,
        },
      ],
    });

    const extractionContent = extractMessageContent(extractionResponse);
    extraction = extractionContent
      ? safeJsonParse<ExtractionPayload>(extractionContent)
      : null;
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `Structured extraction fallback used: ${error.message}`
        : 'Structured extraction fallback used.'
    );
  }

  if (!extraction) {
    extraction = fallbackExtract(rawText, requestedType);
  }

  const normalizedType = normalizeDocumentType(
    extraction.documentType || ocrTypeHint || requestedType
  );
  const name = sanitizeTextValue(extraction.name);
  const idNumber = sanitizeTextValue(extraction.idNumber)?.replace(/\s+/g, '') || null;

  const fields: KycExtractedField[] = Array.isArray(extraction.fields)
    ? extraction.fields
        .map((field) => {
          const key = sanitizeTextValue(field.key);
          const value = sanitizeTextValue(field.value);
          if (!key || !value) return null;
          return {
            key,
            value,
            confidence:
              typeof field.confidence === 'number' ? field.confidence : null,
          };
        })
        .filter((field): field is KycExtractedField => Boolean(field))
    : [];

  if (name && !fields.find((field) => field.key === 'fullName')) {
    fields.unshift({ key: 'fullName', value: name, confidence: null });
  }
  if (idNumber && !fields.find((field) => field.key === 'idNumber')) {
    fields.unshift({ key: 'idNumber', value: idNumber, confidence: null });
  }

  const normalizedExtraction: ExtractionPayload = {
    documentType: normalizedType,
    documentTypeConfidence:
      typeof extraction.documentTypeConfidence === 'number'
        ? extraction.documentTypeConfidence
        : null,
    name,
    idNumber,
    fields,
  };

  return {
    success: true,
    documentType: normalizedType,
    documentTypeConfidence: normalizedExtraction.documentTypeConfidence || null,
    extractedData: {
      name: normalizedExtraction.name || null,
      documentType: normalizedType,
      idNumber: normalizedExtraction.idNumber || null,
      rawText,
      fields,
    },
    verificationFields: toVerificationFields(normalizedType, normalizedExtraction),
    modelInfo: {
      ocrModel,
      extractionModel,
    },
    warnings,
  };
};
