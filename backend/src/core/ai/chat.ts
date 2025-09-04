import { ChatBedrockConverse } from '@langchain/aws';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatXAI } from '@langchain/xai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatMessage, ChatOptions, ChatProvider, ChatModelConfig } from '@/types/ai';
import { AIUsageService } from './usage';
import { AIConfigService } from './config';
import type { AIConfigurationSchema } from '@insforge/shared-schemas';

export class ChatService {
  private aiUsageService = new AIUsageService();
  private aiConfigService = new AIConfigService();

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
    'claude-3.5-sonnet': {
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

    // xAI Models
    'grok-1': { provider: 'xai', modelId: 'grok-1', displayName: 'Grok 1' },
    'grok-2': { provider: 'xai', modelId: 'grok-2', displayName: 'Grok 2' },
    'grok-beta': { provider: 'xai', modelId: 'grok-beta', displayName: 'Grok Beta' },
    'grok-vision-beta': {
      provider: 'xai',
      modelId: 'grok-vision-beta',
      displayName: 'Grok Vision Beta',
    },
  };

  /**
   * Get available models grouped by provider
   */
  static getAvailableModels() {
    const providerMap = new Map<string, { configured: boolean; models: string[] }>();

    for (const [key, config] of Object.entries(this.modelConfigs)) {
      const existing = providerMap.get(config.provider);
      if (!existing) {
        providerMap.set(config.provider, {
          configured: this.isProviderConfigured(config.provider as ChatProvider),
          models: [key],
        });
      } else {
        existing.models.push(key);
      }
    }

    return Array.from(providerMap.entries()).map(([provider, data]) => ({
      provider,
      configured: data.configured,
      models: data.models,
    }));
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
        return !!process.env.AWS_REGION;
      case 'xai':
        return !!process.env.XAI_API_KEY;
      default:
        return false;
    }
  }

  /**
   * Create a chat model instance based on provider
   */
  private createChatModel(model: string, options: Partial<ChatOptions> = {}): BaseChatModel {
    const config = ChatService.modelConfigs[model];
    if (!config) {
      throw new Error(`Unsupported model: ${model}`);
    }

    const { provider, modelId } = config;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 4096;

    // Check if provider is configured
    if (!ChatService.isProviderConfigured(provider as ChatProvider)) {
      throw new Error(`${provider} provider is not configured.`);
    }

    switch (provider as ChatProvider) {
      case 'openai':
        return new ChatOpenAI({
          model: modelId,
          temperature,
          maxTokens,
          apiKey: process.env.OPENAI_API_KEY,
        });

      case 'anthropic':
        return new ChatAnthropic({
          model: modelId,
          temperature,
          maxTokens,
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

      case 'google':
        return new ChatGoogleGenerativeAI({
          model: modelId,
          temperature,
          maxOutputTokens: maxTokens,
          apiKey: process.env.GOOGLE_API_KEY,
        });

      case 'bedrock':
        return new ChatBedrockConverse({
          model: modelId,
          temperature,
          maxTokens,
          region: process.env.AWS_REGION,
        });

      case 'xai':
        return new ChatXAI({
          model: modelId,
          temperature,
          maxTokens,
          apiKey: process.env.XAI_API_KEY,
        });

      default:
        throw new Error(`Unsupported provider: ${provider}`);
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
   * Validate model and get config
   */
  async validateAndGetConfig(
    model: string,
    modality: string
  ): Promise<AIConfigurationSchema | null> {
    const aiConfig = await this.aiConfigService.findByModelAndModality(model, modality);
    if (!aiConfig) {
      throw new Error(
        `Model ${model} is not enabled. Please contact your administrator to enable this model.`
      );
    }
    return aiConfig;
  }

  /**
   * Send a chat message to the specified model
   */
  async chat(
    message: string,
    options: ChatOptions
  ): Promise<{
    content: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model, 'text');

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      const chatModel = this.createChatModel(chatOptions.model, chatOptions);
      const messages = this.formatMessages(
        [{ role: 'user', content: message }],
        chatOptions.systemPrompt
      );
      const response = await chatModel.invoke(messages);

      // Extract token usage if available
      const tokenUsage = response.usage_metadata
        ? {
            promptTokens: response.usage_metadata.input_tokens,
            completionTokens: response.usage_metadata.output_tokens,
            totalTokens: response.usage_metadata.total_tokens,
          }
        : undefined;

      // Track usage if config is available
      if (aiConfig?.id && tokenUsage) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        );
      }

      return {
        content: response.content.toString(),
        tokenUsage,
      };
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
  async chatWithHistory(
    messages: ChatMessage[],
    options: ChatOptions
  ): Promise<{
    content: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model, 'text');

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      const chatModel = this.createChatModel(chatOptions.model, chatOptions);
      const formattedMessages = this.formatMessages(messages, chatOptions.systemPrompt);
      const response = await chatModel.invoke(formattedMessages);

      // Extract token usage if available
      const tokenUsage = response.usage_metadata
        ? {
            promptTokens: response.usage_metadata.input_tokens,
            completionTokens: response.usage_metadata.output_tokens,
            totalTokens: response.usage_metadata.total_tokens,
          }
        : undefined;

      // Track usage if config is available
      if (aiConfig?.id && tokenUsage) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        );
      }

      return {
        content: response.content.toString(),
        tokenUsage,
      };
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
  async *streamChat(
    message: string,
    options: ChatOptions
  ): AsyncGenerator<{
    chunk?: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model, 'text');

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      const chatModel = this.createChatModel(chatOptions.model, chatOptions);
      const messages = this.formatMessages(
        [{ role: 'user', content: message }],
        chatOptions.systemPrompt
      );
      const stream = await chatModel.stream(messages);

      let tokenUsage:
        | { promptTokens?: number; completionTokens?: number; totalTokens?: number }
        | undefined;

      for await (const chunk of stream) {
        // Check if this chunk contains token usage metadata (usually in the last chunk)
        if (chunk.usage_metadata) {
          tokenUsage = {
            promptTokens: chunk.usage_metadata.input_tokens,
            completionTokens: chunk.usage_metadata.output_tokens,
            totalTokens: chunk.usage_metadata.total_tokens,
          };
          yield {
            chunk: chunk.content.toString(),
            tokenUsage,
          };
        } else {
          yield { chunk: chunk.content.toString() };
        }
      }

      // Track usage after streaming completes
      if (aiConfig?.id && tokenUsage) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        );
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
  ): AsyncGenerator<{
    chunk?: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model, 'text');

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      const chatModel = this.createChatModel(chatOptions.model, chatOptions);
      const formattedMessages = this.formatMessages(messages, chatOptions.systemPrompt);
      const stream = await chatModel.stream(formattedMessages);

      let tokenUsage:
        | { promptTokens?: number; completionTokens?: number; totalTokens?: number }
        | undefined;

      for await (const chunk of stream) {
        // Check if this chunk contains token usage metadata (usually in the last chunk)
        if (chunk.usage_metadata) {
          tokenUsage = {
            promptTokens: chunk.usage_metadata.input_tokens,
            completionTokens: chunk.usage_metadata.output_tokens,
            totalTokens: chunk.usage_metadata.total_tokens,
          };
          yield {
            chunk: chunk.content.toString(),
            tokenUsage,
          };
        } else {
          yield { chunk: chunk.content.toString() };
        }
      }

      // Track usage after streaming completes
      if (aiConfig?.id && tokenUsage) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        );
      }
    } catch (error) {
      console.error('Streaming with history error:', error);
      throw new Error(
        `Failed to stream response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
