import OpenAI from 'openai';
import { AIUsageService } from './usage';
import { AIConfigService } from './config';
import { AIClientService } from './client';
import type {
  AIConfigurationSchema,
  ChatCompletionResponse,
  ChatMessageSchema,
} from '@insforge/shared-schemas';
import logger from '@/utils/logger.js';
import { ChatCompletionOptions } from '@/types/ai';
import { isCloudEnvironment } from '@/utils/environment';

export class ChatService {
  private aiUsageService = new AIUsageService();
  private aiConfigService = new AIConfigService();
  private aiCredentialsService = AIClientService.getInstance();

  /**
   * Format messages for OpenAI API with multimodal support
   */
  private formatMessages(
    messages: ChatMessageSchema[],
    systemPrompt?: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system message if provided
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    // Format conversation messages
    for (const msg of messages) {
      // Check if message has images
      if (msg.images && msg.images.length > 0) {
        // Build multimodal content array
        const content = [
          { type: 'text', text: msg.content },
          ...msg.images.map((image) => ({
            type: 'image_url',
            image_url: { url: image.url },
          })),
        ];

        formattedMessages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content,
        } as OpenAI.Chat.ChatCompletionMessageParam);
      } else {
        // Simple text message
        formattedMessages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return formattedMessages;
  }

  /**
   * Validate model and get config
   */
  async validateAndGetConfig(modelId: string): Promise<AIConfigurationSchema | null> {
    const aiConfig = await this.aiConfigService.findByModelId(modelId);
    if (!aiConfig) {
      throw new Error(
        `Model ${modelId} is not enabled. Please contact your administrator to enable this model.`
      );
    }
    return aiConfig;
  }

  /**
   * Send a chat message to the specified model
   * @param messages - Array of messages for conversation
   * @param options - Chat options including model, temperature, etc.
   */
  async chat(
    messages: ChatMessageSchema[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    try {
      // Get the client (handles validation and initialization automatically)
      let client = await this.aiCredentialsService.getClient();

      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model);

      // Apply system prompt from config if available
      const formattedMessages = this.formatMessages(messages, aiConfig?.systemPrompt);

      let response: OpenAI.Chat.ChatCompletion;

      try {
        response = await client.chat.completions.create({
          model: options.model,
          messages: formattedMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          top_p: options.topP,
          stream: false,
        });
      } catch (error) {
        // Check if error is a 402 insufficient credits error in cloud environment
        if (isCloudEnvironment() && error instanceof OpenAI.APIError && error.status === 402) {
          logger.info('Received 402 insufficient credits, renewing API key...');
          // Renew the API key
          await this.aiCredentialsService.renewCloudApiKey();
          // Retry the request with new credentials
          client = await this.aiCredentialsService.getClient();
          response = await client.chat.completions.create({
            model: options.model,
            messages: formattedMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            top_p: options.topP,
            stream: false,
          });
        } else {
          throw error;
        }
      }

      // Extract token usage if available
      const tokenUsage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      // Track usage if config is available
      if (aiConfig?.id && tokenUsage) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens,
          options.model
        );
      }

      return {
        text: response.choices[0]?.message?.content || '',
        metadata: {
          model: options.model,
          ...tokenUsage,
        },
      };
    } catch (error) {
      logger.error('Chat error', { error });
      throw new Error(
        `Failed to get response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stream a chat response
   * @param messages - Array of messages for conversation
   * @param options - Chat options including model, temperature, etc.
   */
  async *streamChat(
    messages: ChatMessageSchema[],
    options: ChatCompletionOptions
  ): AsyncGenerator<{
    chunk?: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Get the client (handles validation and initialization automatically)
      let client = await this.aiCredentialsService.getClient();

      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model);

      // Apply system prompt from config if available
      const formattedMessages = this.formatMessages(messages, aiConfig?.systemPrompt);

      let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

      try {
        stream = await client.chat.completions.create({
          model: options.model,
          messages: formattedMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          top_p: options.topP,
          stream: true,
        });
      } catch (error) {
        // Check if error is a 402 insufficient credits error in cloud environment
        if (isCloudEnvironment() && error instanceof OpenAI.APIError && error.status === 402) {
          logger.info('Received 402 insufficient credits, renewing API key...');
          // Renew the API key
          await this.aiCredentialsService.renewCloudApiKey();
          // Retry the request with new credentials
          client = await this.aiCredentialsService.getClient();
          stream = await client.chat.completions.create({
            model: options.model,
            messages: formattedMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            top_p: options.topP,
            stream: true,
          });
        } else {
          throw error;
        }
      }

      const tokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { chunk: content };
        }

        // Check if this chunk contains usage data
        if (chunk.usage) {
          // Accumulate tokens instead of replacing
          tokenUsage.promptTokens += chunk.usage.prompt_tokens || 0;
          tokenUsage.completionTokens += chunk.usage.completion_tokens || 0;
          tokenUsage.totalTokens += chunk.usage.total_tokens || 0;

          // Yield the accumulated usage
          yield { tokenUsage: { ...tokenUsage } };
        }
      }

      // Track usage after streaming completes
      if (aiConfig?.id && tokenUsage.totalTokens > 0) {
        await this.aiUsageService.trackChatUsage(
          aiConfig.id,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens,
          options.model
        );
      }
    } catch (error) {
      logger.error('Streaming error', { error });
      throw new Error(
        `Failed to stream response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
