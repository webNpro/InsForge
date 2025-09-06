/**
 * AI types for OpenRouter integration
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
  messages?: ChatMessage[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  success: boolean;
  content: string;
  metadata?: {
    model: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}
// ============= Image Types =============

export interface ImageGenerationOptions {
  model: string;
  prompt: string;
  // OpenRouter's image generation API currently only supports model, prompt, and modalities
}

export interface GeneratedImage {
  url?: string;
  imageData?: string;
  revisedPrompt?: string;
}

// OpenRouter image generation response format
// According to OpenRouter docs, they add an 'images' field to the assistant message
export interface OpenRouterImageMessage {
  type: 'image_url';
  image_url: {
    url: string; // Can be a direct URL or data:image base64 URL
  };
}

// Image Generation response format
export interface ImageGenerationResponse {
  text?: string; // Text content from multimodal models
  images: Array<OpenRouterImageMessage>;
  metadata?: {
    model: string;
    revisedPrompt?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

// ============= OpenRouter API Types =============

export interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
  description?: string;
  architecture?: {
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string;
  };
  topProvider?: {
    is_moderated: boolean;
    context_length: number;
    max_completion_tokens: number;
  };
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
    web_search?: string;
    internal_reasoning?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  context_length: number;
  max_completion_tokens?: number;
  per_request_limits?: Record<string, unknown>;
  supported_parameters?: string[];
}
