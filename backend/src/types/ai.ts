/**
 * Shared types for AI services (chat and image generation)
 */

// ============= Chat Types =============

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
}

export interface ChatRequest extends Omit<ChatOptions, 'model'> {
  model: string;
  message?: string;
  messages?: ChatMessage[];
  stream?: boolean;
}

export type ChatProvider = 'openai' | 'anthropic' | 'google' | 'bedrock' | 'xai';

export interface ChatModelConfig {
  provider: ChatProvider;
  modelId: string;
  displayName: string;
}

// ============= Image Types =============

export interface ImageGenerationOptions {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numImages?: number;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  responseFormat?: 'url' | 'b64_json';
  size?: string; // For OpenAI format like "1024x1024"
  steps?: number; // For diffusion models
  guidanceScale?: number; // For diffusion models
  seed?: number; // For reproducibility
}

export interface GeneratedImage {
  url?: string;
  image_data?: string;
  revised_prompt?: string;
}

export type ImageProvider = 'openai' | 'google';

export interface ImageModelConfig {
  provider: ImageProvider;
  modelId: string;
  displayName: string;
  supportedSizes?: string[];
  defaultSize?: string;
}
