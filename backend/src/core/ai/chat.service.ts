import { ChatBedrockConverse } from '@langchain/aws';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatMessage, ChatOptions, ChatProvider, ChatModelConfig } from '@/types/ai';

export class ChatService {
  private static modelConfigs: Record<string, ChatModelConfig> = {
    // OpenAI Models
    'gpt-4-turbo': { provider: 'openai', modelId: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' },
    'gpt-4': { provider: 'openai', modelId: 'gpt-4', displayName: 'GPT-4' },
    'gpt-4o': { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o' },
    'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini' },
    'gpt-3.5-turbo': { provider: 'openai', modelId: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo' },

    // Anthropic Models
    'claude-3-opus': {
      provider: 'anthropic',
      modelId: 'claude-3-opus-20240229',
      displayName: 'Claude 3 Opus',
    },
    'claude-3-sonnet': {
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20241022',
      displayName: 'Claude 3.5 Sonnet',
    },
    'claude-3-haiku': {
      provider: 'anthropic',
      modelId: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
    },

    // Google Models
    'gemini-pro': { provider: 'google', modelId: 'gemini-pro', displayName: 'Gemini Pro' },
    'gemini-1.5-pro': {
      provider: 'google',
      modelId: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
    },
    'gemini-1.5-flash': {
      provider: 'google',
      modelId: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
    },

    // AWS Bedrock Models (using Converse API)
    'bedrock-claude-3-opus': {
      provider: 'bedrock',
      modelId: 'us.anthropic.claude-3-opus-20240229-v1:0',
      displayName: 'Claude 3 Opus (Bedrock)',
    },
    'bedrock-claude-3.5-sonnet': {
      provider: 'bedrock',
      modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      displayName: 'Claude 3.5 Sonnet (Bedrock)',
    },
    'bedrock-claude-3-haiku': {
      provider: 'bedrock',
      modelId: 'us.anthropic.claude-3-haiku-20240307-v1:0',
      displayName: 'Claude 3 Haiku (Bedrock)',
    },
    'bedrock-titan': {
      provider: 'bedrock',
      modelId: 'us.amazon.titan-text-premier-v1:0',
      displayName: 'Titan Text Premier',
    },
    'bedrock-llama3-70b': {
      provider: 'bedrock',
      modelId: 'us.meta.llama3-70b-instruct-v1:0',
      displayName: 'Llama 3 70B',
    },
    'bedrock-mistral-large': {
      provider: 'bedrock',
      modelId: 'us.mistral.mistral-large-2402-v1:0',
      displayName: 'Mistral Large',
    },

    // xAI Models
    'grok-beta': { provider: 'xai', modelId: 'grok-beta', displayName: 'Grok Beta' },
    'grok-2-beta': { provider: 'xai', modelId: 'grok-2-beta', displayName: 'Grok 2 Beta' },
    'grok-2-vision-beta': {
      provider: 'xai',
      modelId: 'grok-2-vision-beta',
      displayName: 'Grok 2 Vision Beta',
    },
  };

  /**
   * Get available models
   */
  static getAvailableModels() {
    const models = [];
    for (const [key, config] of Object.entries(this.modelConfigs)) {
      models.push({
        id: key,
        provider: config.provider,
        modelId: config.modelId,
        displayName: config.displayName,
        available: this.isProviderConfigured(config.provider),
      });
    }
    return models;
  }

  /**
   * Check if provider is configured
   */
  private static isProviderConfigured(provider: ChatProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'google':
        return !!process.env.GOOGLE_API_KEY;
      case 'bedrock':
        return !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
      case 'xai':
        return !!process.env.XAI_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Create chat model instance based on provider
   */
  private createChatModel(modelKey: string, options?: Partial<ChatOptions>): BaseChatModel {
    const config = ChatService.modelConfigs[modelKey];
    if (!config) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 2048;

    switch (config.provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }
        return new ChatOpenAI({
          modelName: config.modelId,
          temperature,
          maxTokens,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });

      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('Anthropic API key not configured');
        }
        return new ChatAnthropic({
          modelName: config.modelId,
          temperature,
          maxTokens,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        });

      case 'google':
        if (!process.env.GOOGLE_API_KEY) {
          throw new Error('Google API key not configured');
        }
        return new ChatGoogleGenerativeAI({
          model: config.modelId,
          temperature,
          maxOutputTokens: maxTokens,
          apiKey: process.env.GOOGLE_API_KEY,
        });

      case 'bedrock':
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          throw new Error('AWS credentials not configured');
        }
        return new ChatBedrockConverse({
          region: process.env.AWS_REGION || 'us-east-1',
          model: config.modelId,
          temperature,
          maxTokens,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

      case 'xai':
        if (!process.env.XAI_API_KEY) {
          throw new Error('xAI API key not configured');
        }
        return new ChatXAI({
          model: config.modelId,
          temperature,
          maxTokens,
          apiKey: process.env.XAI_API_KEY,
        });

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Format messages for the chat model
   */
  private formatMessages(messages: ChatMessage[], systemPrompt?: string): BaseMessage[] {
    const formattedMessages: BaseMessage[] = [];

    // Add system message if provided
    if (systemPrompt) {
      formattedMessages.push(new SystemMessage(systemPrompt));
    }

    // Format conversation messages
    for (const msg of messages) {
      switch (msg.role) {
        case 'system':
          formattedMessages.push(new SystemMessage(msg.content));
          break;
        case 'user':
          formattedMessages.push(new HumanMessage(msg.content));
          break;
        case 'assistant':
          formattedMessages.push(new AIMessage(msg.content));
          break;
      }
    }

    return formattedMessages;
  }

  /**
   * Send a chat message to the specified model
   */
  async chat(message: string, options: ChatOptions): Promise<string> {
    try {
      const chatModel = this.createChatModel(options.model, options);
      const messages = this.formatMessages(
        [{ role: 'user', content: message }],
        options.systemPrompt
      );
      const response = await chatModel.invoke(messages);
      return response.content.toString();
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error(
        `Failed to get response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send a multi-turn conversation
   */
  async chatWithHistory(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    try {
      const chatModel = this.createChatModel(options.model, options);
      const formattedMessages = this.formatMessages(messages, options.systemPrompt);
      const response = await chatModel.invoke(formattedMessages);
      return response.content.toString();
    } catch (error) {
      console.error('Chat with history error:', error);
      throw new Error(
        `Failed to get response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stream a chat response
   */
  async *streamChat(message: string, options: ChatOptions): AsyncGenerator<string> {
    try {
      const chatModel = this.createChatModel(options.model, options);
      const messages = this.formatMessages(
        [{ role: 'user', content: message }],
        options.systemPrompt
      );
      const stream = await chatModel.stream(messages);

      for await (const chunk of stream) {
        yield chunk.content.toString();
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw new Error(
        `Failed to stream response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stream a multi-turn conversation
   */
  async *streamChatWithHistory(
    messages: ChatMessage[],
    options: ChatOptions
  ): AsyncGenerator<string> {
    try {
      const chatModel = this.createChatModel(options.model, options);
      const formattedMessages = this.formatMessages(messages, options.systemPrompt);
      const stream = await chatModel.stream(formattedMessages);

      for await (const chunk of stream) {
        yield chunk.content.toString();
      }
    } catch (error) {
      console.error('Streaming with history error:', error);
      throw new Error(
        `Failed to stream response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
