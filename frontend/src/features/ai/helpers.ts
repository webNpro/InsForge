import { AIConfigurationSchema } from '@insforge/shared-schemas';
import { metadataService } from '@/features/metadata/services/metadata.service';

export const generateAIIntegrationPrompt = async (config: AIConfigurationSchema): Promise<string> => {
  const baseUrl = window.location.origin;
  const anonKey = await metadataService.fetchApiKey();

  // Text modality - Chat endpoint only
  if (config.modality === 'text') {
    return `# InsForge AI SDK - Chat Integration

## Setup

\`\`\`bash
npm install @insforge/sdk
\`\`\`

\`\`\`javascript
import { createClient } from '@insforge/sdk';

const client = createClient({ 
  baseUrl: '${baseUrl}',
  anonKey: '${anonKey}'
});
\`\`\`

## Chat Completion (OpenAI-Compatible)

\`\`\`javascript
// Simple chat completion - OpenAI format
const completion = await client.ai.chat.completions.create({
  model: "${config.modelId}",
  messages: [
    { role: "user", content: "Hello, how are you?" }
  ]
});
// Access response - OpenAI format
console.log(completion.choices[0].message.content);  // AI response text
console.log(completion.usage.total_tokens);          // Token usage

// With conversation history and parameters
const completion = await client.ai.chat.completions.create({
  model: "${config.modelId}",
  messages: [
    { role: "system", content: "You are a helpful assistant" },
    { role: "user", content: "What is TypeScript?" },
    { role: "assistant", content: "TypeScript is a typed superset of JavaScript..." },
    { role: "user", content: "Can you give me an example?" }
  ],
});

// Streaming response
const stream = await client.ai.chat.completions.create({
  model: "${config.modelId}",
  messages: [
    { role: "user", content: "Write a story" }
  ],
  stream: true
});

// Process stream chunks - OpenAI format
for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
\`\`\`
`;
  }

  // Image modality - Image generation endpoint only
  if (config.modality === 'image') {
    return `# InsForge AI SDK - Image + Text Generation
    
This model can generate images AND provide text responses 

## Setup

\`\`\`bash
npm install @insforge/sdk
\`\`\`

\`\`\`javascript
import { createClient } from '@insforge/sdk';

const client = createClient({ 
  baseUrl: '${baseUrl}',
  anonKey: '${anonKey}'
});
\`\`\`

## Image + Text Generation

\`\`\`javascript
// Generate images and text
const response = await client.ai.images.generate({
  model: "${config.modelId}",
  prompt: "A serene mountain landscape at sunset, oil painting style",
  images: [           // Optional: input images for image-to-image models
    { url: 'https://example.com/reference.jpg' }
  ]
});

// Access response - OpenAI format
console.log(response.data[0].b64_json);  // Base64 encoded image string (OpenAI format)
console.log(response.data[0].content);   // AI's text response about the image or prompt
\`\`\`
`;
  }
  return '';
};
