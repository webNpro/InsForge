import OpenAI from 'openai';
import type { ChatMessage, ChatOptions } from '@/types/ai';
import { AIUsageService } from './usage';
import { AIConfigService } from './config';
import { AIClientService } from './client';
import type { AIConfigurationSchema } from '@insforge/shared-schemas';
import logger from '@/utils/logger.js';

export class ChatService {
  private aiUsageService = new AIUsageService();
  private aiConfigService = new AIConfigService();
  private aiCredentialsService = AIClientService.getInstance();

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system message if provided
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    // Format conversation messages
    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      });
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
   * @param messageOrMessages - Either a string for single message or array of messages for conversation
   * @param options - Chat options including model, temperature, etc.
   */
  async chat(
    messageOrMessages: string | ChatMessage[],
    options: ChatOptions
  ): Promise<{
    content: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Get the client (handles validation and initialization automatically)
      const client = await this.aiCredentialsService.getClient();

      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model);

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      // Handle both single message and message array
      const messages =
        typeof messageOrMessages === 'string'
          ? [{ role: 'user' as const, content: messageOrMessages }]
          : messageOrMessages;

      const formattedMessages = this.formatMessages(messages, chatOptions.systemPrompt);

      const response = await client.chat.completions.create({
        model: options.model,
        messages: formattedMessages,
        temperature: chatOptions.temperature ?? 0.7,
        max_tokens: chatOptions.maxTokens ?? 4096,
        stream: false,
      });

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
          tokenUsage.completionTokens
        );
      }

      return {
        content: response.choices[0]?.message?.content || '',
        tokenUsage,
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
   * @param messageOrMessages - Either a string for single message or array of messages for conversation
   * @param options - Chat options including model, temperature, etc.
   */
  async *streamChat(
    messageOrMessages: string | ChatMessage[],
    options: ChatOptions
  ): AsyncGenerator<{
    chunk?: string;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  }> {
    try {
      // Get the client (handles validation and initialization automatically)
      const client = await this.aiCredentialsService.getClient();

      // Validate model and get config
      const aiConfig = await this.validateAndGetConfig(options.model);

      // Apply system prompt from config if available
      const chatOptions = {
        ...options,
        ...(aiConfig?.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
      };

      // Handle both single message and message array
      const messages =
        typeof messageOrMessages === 'string'
          ? [{ role: 'user' as const, content: messageOrMessages }]
          : messageOrMessages;

      const formattedMessages = this.formatMessages(messages, chatOptions.systemPrompt);

      const stream = await client.chat.completions.create({
        model: options.model,
        messages: formattedMessages,
        temperature: chatOptions.temperature ?? 0.7,
        max_tokens: chatOptions.maxTokens ?? 4096,
        stream: true,
      });

      let tokenUsage:
        | { promptTokens?: number; completionTokens?: number; totalTokens?: number }
        | undefined;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { chunk: content };
        }

        // Check if this chunk contains usage data
        if (chunk.usage) {
          tokenUsage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
          yield { tokenUsage };
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
      logger.error('Streaming error', { error });
      throw new Error(
        `Failed to stream response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
