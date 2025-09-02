# Insforge OSS AI API Documentation

## Overview

Insforge provides AI services for chat and image generation with support for multiple providers including OpenAI, Anthropic, Google, AWS Bedrock, and xAI.

**Authentication**: All AI endpoints require authentication via JWT token or API key using `Authorization: Bearer <token>` header.

## Base URL
`http://localhost:7130`

## Chat API

### Get Available Chat Models
**GET** `/api/ai/chat/models`

Headers: `Authorization: Bearer <token>`

Returns: `{"success": true, "models": [{"provider": "openai", "modelId": "gpt-4", "displayName": "GPT-4"}, ...]}`

### Send Chat Message
**POST** `/api/ai/chat`

Send a message to any supported chat model with optional streaming support.

#### Single Message Request
Body:
```json
{
  "model": "gpt-4",
  "message": "What is the capital of France?",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

Returns: `{"success": true, "response": "The capital of France is Paris.", "model": "gpt-4"}`

#### Multi-turn Conversation
Body:
```json
{
  "model": "claude-3-opus-20240229",
  "messages": [
    {"role": "user", "content": "What is 2+2?"},
    {"role": "assistant", "content": "2+2 equals 4."},
    {"role": "user", "content": "What about 3+3?"}
  ],
  "temperature": 0.5
}
```

#### Streaming Response
Add `"stream": true` to enable Server-Sent Events streaming:

Body:
```json
{
  "model": "gpt-4",
  "message": "Write a short story",
  "stream": true
}
```

Returns SSE stream with chunks:
```
data: {"chunk": "Once upon"}
data: {"chunk": " a time"}
data: {"done": true}
```

### Chat Options

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `model` | string | **Required**. Model identifier (e.g., "gpt-4", "claude-3-opus-20240229") | - |
| `message` | string | Single message for simple chat | - |
| `messages` | array | Array of messages for multi-turn conversation | - |
| `stream` | boolean | Enable streaming response | false |
| `temperature` | number | Controls randomness (0-2) | Model default |
| `maxTokens` | integer | Maximum tokens to generate | Model default |
| `topP` | number | Nucleus sampling parameter (0-1) | Model default |
| `systemPrompt` | string | System prompt to guide behavior | - |

**Note**: Either `message` or `messages` must be provided.

## Image Generation API

### Get Available Image Models
**GET** `/api/ai/image/models`

Headers: `Authorization: Bearer <token>`

Returns: `{"models": [{"provider": "openai", "modelId": "dall-e-3", "displayName": "DALL-E 3"}, ...], "totalCount": 5}`

### Generate Images
**POST** `/api/ai/image/generate`

Generate images using the specified model and options.

Body:
```json
{
  "model": "dall-e-3",
  "prompt": "A serene landscape with mountains and a lake at sunset",
  "size": "1024x1024",
  "quality": "hd",
  "numImages": 1
}
```

Returns:
```json
{
  "model": "dall-e-3",
  "images": [
    {
      "url": "https://...",
      "revised_prompt": "A tranquil scenic view..."
    }
  ],
  "count": 1,
  "nextActions": "Images have been generated successfully. Use the returned URLs to access them."
}
```

### Image Generation Options

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `model` | string | **Required**. Model identifier | - |
| `prompt` | string | **Required**. Text description of desired image | - |
| `negativePrompt` | string | What to avoid (supported models only) | - |
| `width` | integer | Image width in pixels | Model default |
| `height` | integer | Image height in pixels | Model default |
| `numImages` | integer | Number of images (1-10) | 1 |
| `quality` | string | "standard" or "hd" (OpenAI) | "standard" |
| `style` | string | "vivid" or "natural" (OpenAI) | "vivid" |
| `responseFormat` | string | "url" or "b64_json" | "url" |
| `size` | string | Size format like "1024x1024" | Model default |
| `steps` | integer | Diffusion steps (1-150) | Model default |
| `guidanceScale` | number | Guidance scale (0-20) | Model default |
| `seed` | integer | Seed for reproducibility | Random |

## Supported Providers

### Chat Providers
- **OpenAI**: GPT-4, GPT-3.5-Turbo models
- **Anthropic**: Claude 3 family (Opus, Sonnet, Haiku)
- **Google**: Gemini models
- **AWS Bedrock**: Various models including Claude, Llama
- **xAI**: Grok models

### Image Providers
- **OpenAI**: DALL-E 2, DALL-E 3
- **xAI**: Aurora image generation
- **AWS Bedrock**: Stable Diffusion, Titan Image
- **Google**: Imagen models

## Error Handling

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `400` - Invalid request (missing required parameters)
- `401` - Unauthorized (invalid or missing token)
- `500` - Internal server error

## Usage Examples

### Basic Chat Request
```bash
curl -X POST http://localhost:7130/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "message": "Explain quantum computing in simple terms"
  }'
```

### Streaming Chat with JavaScript
```javascript
const response = await fetch('http://localhost:7130/api/ai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    message: 'Write a poem about coding',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.chunk) {
        console.log(data.chunk);
      }
    }
  }
}
```

### Image Generation Request
```bash
curl -X POST http://localhost:7130/api/ai/image/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A futuristic city with flying cars",
    "quality": "hd",
    "size": "1792x1024"
  }'
```

## Configuration

AI providers are configured via environment variables in the backend. Ensure the necessary API keys are set:

- `OPENAI_API_KEY` - For OpenAI models
- `ANTHROPIC_API_KEY` - For Claude models
- `GOOGLE_AI_API_KEY` - For Google Gemini models
- `XAI_API_KEY` - For xAI Grok models
- AWS credentials - For Bedrock models

Models are automatically available when their corresponding API keys are configured.