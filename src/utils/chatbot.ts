import type { NextApiRequest, NextApiResponse } from 'next';
import { onboardingChatbot } from '../../../chatbot/onboardingChatbot';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { NextApiRequestWithFiles } from '../../../types/next';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

// Helper to run middleware
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequestWithFiles,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Handle file uploads
      await runMiddleware(req, res, upload.any());

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
        details: error.message 
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