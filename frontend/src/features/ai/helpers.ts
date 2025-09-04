import { AIConfigurationSchema } from '@insforge/shared-schemas';

export const generateAIIntegrationPrompt = (config: AIConfigurationSchema): string => {
  const baseUrl = `${window.location.origin}/api`;

  // Text modality - Chat endpoint only
  if (config.modality === 'text') {
    return `# InsForge AI Chat API Integration

  ## Base URL
  \`${baseUrl}\`

  ## Authentication
  Include JWT Bearer token in Authorization header:
  \`Authorization: Bearer <your-jwt-token>\`

  ## Chat Endpoint
  **POST** \`/api/chat\`

  ### Request Body
  \`\`\`json
  {
    "model": "${config.model}",
    "message": "your message",     // For single message
    "messages": [{                 // For conversation history
      "role": "user|assistant",
      "content": "text"
    }],
    "stream": false,               // Set true for SSE streaming
    "temperature": 0.7,            // Optional (0-2)
    "maxTokens": 2000             // Optional
  }
  \`\`\`

  ### Response (Non-streaming)
  \`\`\`json
  {
    "success": true,
    "response": "AI response text",
    "model": "${config.model}",
    "tokenUsage": { "totalTokens": 100 }
  }
  \`\`\`

  ### Streaming Response (SSE)
  When \`stream: true\`:
  - Text chunks: \`data: {"chunk": "partial text"}\`
  - Completion signal: \`data: {"done": true}\`

  ## Error Codes
  - 400: Invalid input
  - 401: Unauthorized token
  - 403: Model not enabled
  - 500: Server error`;
  }

  // Image modality - Image generation endpoint only
  if (config.modality === 'image') {
    return `# InsForge AI Image Generation API

  ## Base URL
  \`${baseUrl}\`

  ## Authentication
  Include JWT Bearer token in Authorization header:
  \`Authorization: Bearer <your-jwt-token>\`

  ## Image Generation Endpoint
  **POST** \`/api/image/generation\`

  ### Request Body
  \`\`\`json
  {
    "model": "${config.model}",
    "prompt": "detailed image description",
    "numImages": 1,                // Optional, number of images
    "size": "1024x1024",           // Optional, depends on model
    "quality": "standard",         // Optional: "standard" or "hd"
    "style": "vivid",              // Optional: "vivid" or "natural"
    "responseFormat": "url"        // Optional: "url" or "b64_json"
  }
  \`\`\`

  ### Response
  \`\`\`json
  {
    "success": true,
    "data": {
      "model": "${config.model}",
      "images": [
        "https://image-url.com/..."  // When responseFormat is "url"
      ],
      // OR
      "images": [
        {
          "image_data": "base64string..."  // When responseFormat is "b64_json"
        }
      ],
      "count": 1
    }
  }
  \`\`\`

  ## Response Format Notes
  - \`responseFormat: "url"\`: Returns array of image URLs
  - \`responseFormat: "b64_json"\`: Returns array with base64 encoded image data

  ## Error Codes
  - 400: Invalid input
  - 401: Unauthorized token
  - 403: Model not enabled
  - 500: Server error`;
  }
  return '';
};
