import type { NextApiRequest, NextApiResponse } from 'next';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

type NextApiRequestWithFiles = NextApiRequest & {
  files?: Express.Multer.File[];
  body: unknown;
};
type NextApiResponseWithHelpers = NextApiResponse & {
  setHeader(key: string, value: string[]): void;
};

/**
 * Minimal in-memory chatbot stub to keep the API route compiling and functional
 * while the real orchestrator/bot service is unavailable locally.
 */
type ChatSessionState = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  lastUpdated: number;
};

const chatSessions: Record<string, ChatSessionState> = {};

const onboardingChatbot = {
  async handleMessage(sessionId: string, message: string, _files: unknown[] = []) {
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = { messages: [], lastUpdated: Date.now() };
    }
    chatSessions[sessionId].messages.push({ role: 'user', content: message });
    chatSessions[sessionId].lastUpdated = Date.now();

    const reply = `Thanks! I recorded your message: "${message || '...' }"`;
    chatSessions[sessionId].messages.push({ role: 'assistant', content: reply });
    chatSessions[sessionId].lastUpdated = Date.now();

    return reply;
  },
  getSessionState(sessionId: string) {
    return chatSessions[sessionId] || { messages: [], lastUpdated: Date.now() };
  }
};

// Helper to run middleware
type MiddlewareFn = (req: unknown, res: unknown, next: (result?: unknown) => void) => void;

const runMiddleware = (
  req: unknown,
  res: unknown,
  fn: MiddlewareFn
) =>
  new Promise((resolve, reject) => {
    fn(req, res, (result?: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequestWithFiles,
  res: NextApiResponseWithHelpers
) {
  if (req.method === 'POST') {
    try {
      // Handle file uploads
      await runMiddleware(req, res, upload.any() as unknown as MiddlewareFn);

      const { sessionId, message } = req.body;
      const files = req.files || [];

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      // Handle the message and any uploaded files
      const response = await onboardingChatbot.handleMessage(sessionId, message || '', files);
      
      return res.status(200).json({ 
        message: response,
        sessionId,
        state: onboardingChatbot.getSessionState(sessionId)
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
      return res.status(500).json({ 
        error: 'An error occurred while processing your message',
        details: error
      });
    }
  } else if (req.method === 'GET' && req.query.endpoint === 'session') {
    // Create a new session
    const sessionId = uuidv4();
    return res.status(200).json({ sessionId });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
