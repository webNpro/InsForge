import { Router, Response, NextFunction } from 'express';
import { ChatService } from '@/core/ai/chat';
import { AuthRequest, verifyAdmin, verifyUser } from '../middleware/auth';
import type {
  ChatRequest,
  ChatCompletionResponse,
  ImageGenerationOptions,
  OpenRouterModel,
} from '@/types/ai';
import { ImageService } from '@/core/ai/image';
import { AppError } from '@/api/middleware/error';
import { ERROR_CODES } from '@/types/error-constants';
import { successResponse } from '@/utils/response';
import { AIConfigService } from '@/core/ai/config';
import { AIUsageService } from '@/core/ai/usage';
import {
  createAIConfigurationRequestSchema,
  updateAIConfigurationRequestSchema,
  getAIUsageRequestSchema,
  getAIUsageSummaryRequestSchema,
} from '@insforge/shared-schemas';

const router = Router();
const chatService = new ChatService();
const aiConfigService = new AIConfigService();
const aiUsageService = new AIUsageService();

/**
 * GET /api/ai/models
 * Get all available AI models in ListModelsResponse format
 */
router.get('/models', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const configured = !!process.env.OPENROUTER_API_KEY;

    if (!configured) {
      res.json({
        text: [
          {
            provider: 'openrouter',
            configured: false,
            models: [],
          },
        ],
        image: [
          {
            provider: 'openrouter',
            configured: false,
            models: [],
          },
        ],
      });
      return;
    }

    // Fetch models once and classify them
    const response = await fetch('https://openrouter.ai/api/v1/models/user', {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: OpenRouterModel[] };
    const models = data.data || [];

    const textModels: OpenRouterModel[] = [];
    const imageModels: OpenRouterModel[] = [];

    for (const model of models) {
      // Classify based on output modality
      if (model.architecture?.output_modalities?.includes('image')) {
        imageModels.push(model);
      }

      if (model.architecture?.output_modalities?.includes('text')) {
        textModels.push(model);
      }
    }

    res.json({
      text: [
        {
          provider: 'openrouter',
          configured: true,
          models: textModels,
        },
      ],
      image: [
        {
          provider: 'openrouter',
          configured: true,
          models: imageModels,
        },
      ],
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
 * POST /api/ai/chat/completion
 * Send a chat message to any supported model
 */
router.post('/chat/completion', verifyUser, async (req: AuthRequest, res: Response) => {
  try {
    const { model, messages, stream, ...options } = req.body as ChatRequest;

    if (!model) {
      return res.status(400).json({
        error: 'Model parameter is required',
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

        const chatOptions = {
          model,
          ...options,
        };

        if (messages && messages.length > 0) {
          // Multi-turn conversation with streaming
          streamGenerator = chatService.streamChat(messages, chatOptions);
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
          // Send token usage if available
          if (data.tokenUsage) {
            res.write(`data: ${JSON.stringify({ tokenUsage: data.tokenUsage })}\n\n`);
          }
        }

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
    let result: {
      content: string;
      tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    };

    const chatOptions = {
      model,
      ...options,
    };

    if (messages && messages.length > 0) {
      // Multi-turn conversation
      result = await chatService.chat(messages, chatOptions);
    } else {
      return res.status(400).json({
        error: 'Either message or messages array is required',
      });
    }

    const response: ChatCompletionResponse = {
      success: true,
      content: result.content,
      metadata: {
        model,
        usage: result.tokenUsage,
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/image/generation
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

      const result = await ImageService.generate({
        model,
        ...options,
      });

      successResponse(
        res,
        {
          model,
          images: result.images,
          text: result.text,
          count: result.images.length,
          metadata: result.metadata,
          nextActions:
            'Images have been generated successfully. Use the returned URLs or base64 data to access them.',
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
      const validationResult = createAIConfigurationRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new AppError(
          `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }
      const { modality, provider, modelId, systemPrompt } = validationResult.data;

      const result = await aiConfigService.create(modality, provider, modelId, systemPrompt);

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
      const validationResult = updateAIConfigurationRequestSchema.safeParse(req.body);

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

/**
 * GET /api/ai/usage/summary
 * Get AI usage summary statistics
 */
router.get(
  '/usage/summary',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validationResult = getAIUsageSummaryRequestSchema.safeParse(req.query);

      if (!validationResult.success) {
        throw new AppError(
          `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      const { configId, startDate, endDate } = validationResult.data;

      const summary = await aiUsageService.getUsageSummary(
        configId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      successResponse(res, summary);
    } catch (error) {
      next(
        new AppError(
          error instanceof Error ? error.message : 'Failed to fetch usage summary',
          500,
          ERROR_CODES.INTERNAL_ERROR
        )
      );
    }
  }
);

/**
 * GET /api/ai/usage
 * Get AI usage records with pagination
 */
router.get('/usage', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validationResult = getAIUsageRequestSchema.safeParse(req.query);

    if (!validationResult.success) {
      throw new AppError(
        `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const { startDate, endDate, limit, offset } = validationResult.data;

    const usage = await aiUsageService.getAllUsage(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      parseInt(limit),
      parseInt(offset)
    );

    successResponse(res, usage);
  } catch (error) {
    next(
      new AppError(
        error instanceof Error ? error.message : 'Failed to fetch usage records',
        500,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
});

/**
 * GET /api/ai/usage/config/:configId
 * Get usage records for a specific AI configuration
 */
router.get(
  '/usage/config/:configId',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      const records = await aiUsageService.getUsageByConfig(
        req.params.configId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      successResponse(res, records);
    } catch (error) {
      next(
        new AppError(
          error instanceof Error ? error.message : 'Failed to fetch config usage records',
          500,
          ERROR_CODES.INTERNAL_ERROR
        )
      );
    }
  }
);

export { router as aiRouter };
