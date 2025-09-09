import { AIConfigurationSchema } from '@insforge/shared-schemas';

export const generateAIIntegrationPrompt = (config: AIConfigurationSchema): string => {
  const baseUrl = window.location.origin;

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
  baseUrl: '${baseUrl}'
});

// Ensure user is authenticated first
await client.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
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
    return `# InsForge AI SDK - Image Generation

## Setup

\`\`\`bash
npm install @insforge/sdk
\`\`\`

\`\`\`javascript
import { createClient } from '@insforge/sdk';

const client = createClient({ 
  baseUrl: '${baseUrl}'
});

// Ensure user is authenticated first
await client.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
\`\`\`

## Image Generation (OpenAI-Compatible)

\`\`\`javascript
// Generate images - OpenAI format
const response = await client.ai.images.generate({
  model: "${config.modelId}",
  prompt: "A serene mountain landscape at sunset, oil painting style",
  size: "1024x1024",  // Optional
  n: 1                // Number of images (default: 1)
});

// Access response - OpenAI format
console.log(response.data[0].url);  // Image URL
\`\`\`

## Working with Generated Images

\`\`\`javascript
// 1. Generate image - OpenAI format
const response = await client.ai.images.generate({
  model: "${config.modelId}",
  prompt: "A futuristic city skyline"
});

// 2. Get the image URL
const imageUrl = response.data[0].url;

// 3. Save to storage (if base64)
if (imageUrl.startsWith('data:image')) {
  // Convert base64 to blob
  const base64Data = imageUrl.split(',')[1];
  const blob = new Blob([atob(base64Data)], { type: 'image/png' });
  
  // Upload to InsForge storage
  const { data: upload } = await client.storage
    .from('generated-images')
    .uploadAuto(blob);
  
  console.log('Stored at:', upload.url);
}

// 4. Display in UI
const img = document.createElement('img');
img.src = imageUrl;
document.body.appendChild(img);
\`\`\`
`;
  }
  return '';
};
