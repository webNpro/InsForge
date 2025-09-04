import { Router, Response, NextFunction } from 'express';
import { ChatService } from '@/core/ai/chat';
import { AuthRequest, verifyAdmin, verifyUser } from '../middleware/auth';
import type { ChatRequest, ImageGenerationOptions } from '@/types/ai';
import { ImageService } from '@/core/ai/image';
import { AppError } from '@/api/middleware/error';
import { ERROR_CODES } from '@/types/error-constants';
import { successResponse } from '@/utils/response';
import { AIConfigService } from '@/core/ai/config';
import {
  createAIConfiguarationReqeustSchema,
  updateAIConfiguarationReqeustSchema,
} from '@insforge/shared-schemas';

const router = Router();
const chatService = new ChatService();
const aiConfigService = new AIConfigService();

/**
 * GET /api/ai/models
 * Get all available AI models in ListModelsResponse format
 */
router.get('/models', verifyAdmin, (req: AuthRequest, res: Response) => {
  try {
    const textModels = ChatService.getAvailableModels();
    const imageModels = ImageService.getAvailableModels();

    res.json({
      text: textModels,
      image: imageModels,
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      error: 'Failed to get models list',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/chat
 * Send a chat message to any supported model
 */
router.post('/chat', verifyUser, async (req: AuthRequest, res: Response) => {
  try {
    const { model, message, messages, stream, ...options } = req.body as ChatRequest;

    if (!model) {
      return res.status(400).json({
        error: 'Model parameter is required',
      });
    }

    // Check if the model is enabled in AI configurations
    const aiConfig = await aiConfigService.findByModelAndModality(model, 'text');
    if (!aiConfig) {
      return res.status(403).json({
        error: `Model ${model} is not enabled. Please contact your administrator to enable this model.`,
      });
    }

    // Handle streaming requests
    if (stream) {
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        let streamGenerator;
        let tokenUsage: { totalTokens?: number } | undefined;

        // Prepare options with system prompt from AI config if available
        const chatOptions = {
          model,
          ...options,
          ...(aiConfig.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
        };

        if (messages && messages.length > 0) {
          // Multi-turn conversation with streaming
          streamGenerator = chatService.streamChatWithHistory(messages, chatOptions);
        } else if (message) {
          // Single message with streaming
          streamGenerator = chatService.streamChat(message, chatOptions);
        } else {
          res.write(
            `data: ${JSON.stringify({ error: 'Either message or messages array is required' })}\n\n`
          );
          res.end();
          return;
        }

        // Stream the response
        for await (const data of streamGenerator) {
          if (data.chunk) {
            res.write(`data: ${JSON.stringify({ chunk: data.chunk })}\n\n`);
          }
          // Capture token usage when provided (usually in the last chunk)
          if (data.tokenUsage) {
            tokenUsage = data.tokenUsage;
          }
        }

        // Update token usage if available and increment requests count
        if (tokenUsage?.totalTokens) {
          await aiConfigService.updateTokenUsageByModel(model, 'text', tokenUsage.totalTokens);
        }
        await aiConfigService.incrementRequestsCount(model, 'text');

        // Send completion signal
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`
        );
        res.end();
      }
      return;
    }

    // Non-streaming requests
    let result: { content: string; tokenUsage?: { totalTokens?: number } };

    // Prepare options with system prompt from AI config if available
    const chatOptions = {
      model,
      ...options,
      ...(aiConfig.systemPrompt && { systemPrompt: aiConfig.systemPrompt }),
    };

    if (messages && messages.length > 0) {
      // Multi-turn conversation
      result = await chatService.chatWithHistory(messages, chatOptions);
    } else if (message) {
      // Single message
      result = await chatService.chat(message, chatOptions);
    } else {
      return res.status(400).json({
        error: 'Either message or messages array is required',
      });
    }

    // Update token usage if available and increment requests count
    if (result.tokenUsage?.totalTokens) {
      await aiConfigService.updateTokenUsageByModel(model, 'text', result.tokenUsage.totalTokens);
    }
    await aiConfigService.incrementRequestsCount(model, 'text');

    res.json({
      success: true,
      response: result.content,
      model,
      tokenUsage: result.tokenUsage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/image/generate
 * Generate images using specified model
 */
router.post(
  '/image/generation',
  verifyUser,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { model, ...options } = req.body as ImageGenerationOptions;

      if (!model) {
        throw new AppError('Model parameter is required', 400, ERROR_CODES.INVALID_INPUT);
      }

      if (!options.prompt) {
        throw new AppError('Prompt is required', 400, ERROR_CODES.INVALID_INPUT);
      }

      // Check if the model is enabled in AI configurations
      const aiConfig = await aiConfigService.findByModelAndModality(model, 'image');
      if (!aiConfig) {
        throw new AppError(
          `Model ${model} is not enabled. Please contact your administrator to enable this model.`,
          403,
          ERROR_CODES.FORBIDDEN
        );
      }

      const images = await ImageService.generate({
        model,
        ...options,
      });

      // Increment requests count for image generation
      await aiConfigService.incrementRequestsCount(model, 'image');

      successResponse(
        res,
        {
          model,
          images,
          count: images.length,
          nextActions:
            'Images have been generated successfully. Use the returned URLs to access them.',
        },
        201
      );
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError(
            error instanceof Error ? error.message : 'Failed to generate image',
            500,
            ERROR_CODES.INTERNAL_ERROR
          )
        );
      }
    }
  }
);

/**
 * POST /api/ai/configurations
 * Create a new AI configuration
 */
router.post(
  '/configurations',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validationResult = createAIConfiguarationReqeustSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new AppError(
          `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }
      const { modality, provider, model, systemPrompt } = validationResult.data;

      const result = await aiConfigService.create(modality, provider, model, systemPrompt);

      successResponse(
        res,
        {
          id: result.id,
          message: 'AI configuration created successfully',
        },
        201
      );
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError(
            error instanceof Error ? error.message : 'Failed to create AI configuration',
            500,
            ERROR_CODES.INTERNAL_ERROR
          )
        );
      }
    }
  }
);

/**
 * GET /api/ai/configurations
 * List all AI configurations
 */
router.get(
  '/configurations',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const configurations = await aiConfigService.findAll();

      successResponse(res, configurations);
    } catch (error) {
      next(
        new AppError(
          error instanceof Error ? error.message : 'Failed to fetch AI configurations',
          500,
          ERROR_CODES.INTERNAL_ERROR
        )
      );
    }
  }
);

/**
 * PATCH /api/ai/configurations/:id
 * Update an AI configuration
 */
router.patch(
  '/configurations/:id',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validationResult = updateAIConfiguarationReqeustSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new AppError(
          `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      const { systemPrompt } = validationResult.data;

      const updated = await aiConfigService.update(req.params.id, systemPrompt);

      if (!updated) {
        throw new AppError('AI configuration not found', 404, ERROR_CODES.NOT_FOUND);
      }

      successResponse(res, {
        message: 'AI configuration updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError(
            error instanceof Error ? error.message : 'Failed to update AI configuration',
            500,
            ERROR_CODES.INTERNAL_ERROR
          )
        );
      }
    }
  }
);

/**
 * DELETE /api/ai/configurations/:id
 * Delete an AI configuration
 */
router.delete(
  '/configurations/:id',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await aiConfigService.delete(req.params.id);

      if (!deleted) {
        throw new AppError('AI configuration not found', 404, ERROR_CODES.NOT_FOUND);
      }

      successResponse(res, {
        message: 'AI configuration deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError(
            error instanceof Error ? error.message : 'Failed to delete AI configuration',
            500,
            ERROR_CODES.INTERNAL_ERROR
          )
        );
      }
    }
  }
);

export { router as aiRouter };
