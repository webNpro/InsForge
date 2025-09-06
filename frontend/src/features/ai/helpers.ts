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
  **POST** \`/api/ai/chat/completion\`

  ### Request Body
  \`\`\`json
  {
    "model": "${config.modelId}",
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
    "content": "AI response text",
    "metadata": {
      "model": "${config.modelId}",
      "usage": {
        "promptTokens": 50,
        "completionTokens": 50,
        "totalTokens": 100
      }
    }
  }
  \`\`\`

  ### Streaming Response (SSE)
  When \`stream: true\`:
  - Text chunks: \`data: {"chunk": "partial text"}\`
  - Token usage: \`data: {"tokenUsage": {"promptTokens": 50, "completionTokens": 50, "totalTokens": 100}}\`
  - Completion signal: \`data: {"done": true}\`
  - Error: \`data: {"error": "Error message"}\`

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
  **POST** \`/api/ai/image/generation\`

  ### Request Body
  \`\`\`json
  {
    "model": "${config.modelId}",
    "prompt": "detailed image description"
  }
  \`\`\`

  ### Response
  \`\`\`json
  {
    "success": true,
    "data": {
      "model": "${config.modelId}",
      "images": [
        {
          "type": "image_url",
          "image_url": {
            "url": "https://image-url.com/..." // URL or data:image/png;base64,... format
          }
        }
      ],
      "text": "Optional text response from multimodal models",
      "count": 1,
      "metadata": {
        "model": "${config.modelId}",
        "revisedPrompt": "Enhanced prompt if available",
        "usage": {
          "promptTokens": 10,
          "completionTokens": 5,
          "totalTokens": 15
        }
      },
      "nextActions": "Images have been generated successfully. Use the returned URLs or base64 data to access them."
    }
  }
  \`\`\`

  ## Response Format Notes
  - Images follow OpenRouter's format with type "image_url"
  - URLs can be direct links or data:image base64 format
  - Multimodal models may include text alongside generated images
  - Metadata includes token usage and revised prompts when available

  ## Error Codes
  - 400: Invalid input
  - 401: Unauthorized token
  - 403: Model not enabled
  - 500: Server error`;
  }
  return '';
};
