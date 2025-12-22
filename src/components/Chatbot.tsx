import React, { useState, useRef, useEffect } from 'react';
import { chatbotApi } from '../services/apiClient';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize chat session
  useEffect(() => {
    const initChat = async () => {
      try {
        const { sessionId } = await chatbotApi.createSession();
        setSessionId(sessionId);
        addMessage('bot', 'Welcome to the onboarding process! How can I help you today?');
      } catch (error) {
        console.error('Error initializing chat:', error);
        addMessage('bot', 'Sorry, there was an error initializing the chat. Please refresh the page to try again.');
      }
    };

    initChat();
  }, []);

  const addMessage = (sender: 'user' | 'bot', text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input;
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const files = fileInputRef.current?.files 
        ? Array.from(fileInputRef.current.files)
        : [];
      
      const response = await chatbotApi.sendMessage(sessionId, userMessage, files);
      
      if (response.message) {
        addMessage('bot', response.message);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('bot', 'Sorry, there was an error processing your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chatbot-container">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}-message`}>
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={!sessionId || isLoading}
        />
        
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const fileNames = Array.from(e.target.files).map(f => f.name).join(', ');
              addMessage('user', `Uploaded files: ${fileNames}`);
              handleSendMessage();
            }
          }}
        />
        
        <button 
          className="file-upload-btn" 
          onClick={handleFileUpload}
          disabled={!sessionId || isLoading}
        >
          📎
        </button>
        
        <button 
          onClick={handleSendMessage}
          disabled={!input.trim() || !sessionId || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <style jsx>{`
        .chatbot-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background-color: #f9f9f9;
        }
        
        .message {
          margin: 8px 0;
          padding: 12px 16px;
          border-radius: 18px;
          max-width: 80%;
          word-wrap: break-word;
        }
        
        .user-message {
          background-color: #007bff;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }
        
        .bot-message {
          background-color: #f0f0f0;
          margin-right: auto;
          border-bottom-left-radius: 4px;
        }
        
        .chat-input-container {
          display: flex;
          padding: 12px;
          background-color: white;
          border-top: 1px solid #e0e0e0;
        }
        
        input[type="text"] {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 20px;
          margin-right: 8px;
          outline: none;
        }
        
        button {
          padding: 0 16px;
          border: none;
          border-radius: 20px;
          background-color: #007bff;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .file-upload-btn {
          margin-right: 8px;
          background-color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default Chatbot;