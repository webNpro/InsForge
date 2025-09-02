import { Router, Response, NextFunction } from 'express';
import { ChatService } from '@/core/ai/chat.service';
import { AuthRequest, verifyUser } from '../middleware/auth';
import type { ChatRequest, ImageGenerationOptions } from '@/types/ai';
import { ImageService } from '@/core/ai/image.service';
import { AppError } from '@/api/middleware/error';
import { ERROR_CODES } from '@/types/error-constants';
import { successResponse } from '@/utils/response';

const router = Router();
const chatService = new ChatService();

/**
 * GET /api/ai/chat/models
 * Get available chat models
 */
router.get('/chat/models', verifyUser, (req: AuthRequest, res: Response) => {
  try {
    const models = ChatService.getAvailableModels();
    res.json({
      success: true,
      models,
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

    // Handle streaming requests
    if (stream) {
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        let streamGenerator;

        if (messages && messages.length > 0) {
          // Multi-turn conversation with streaming
          streamGenerator = chatService.streamChatWithHistory(messages, { model, ...options });
        } else if (message) {
          // Single message with streaming
          streamGenerator = chatService.streamChat(message, { model, ...options });
        } else {
          res.write(
            `data: ${JSON.stringify({ error: 'Either message or messages array is required' })}\n\n`
          );
          res.end();
          return;
        }

        // Stream the response
        for await (const chunk of streamGenerator) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
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
    let response: string;

    if (messages && messages.length > 0) {
      // Multi-turn conversation
      response = await chatService.chatWithHistory(messages, { model, ...options });
    } else if (message) {
      // Single message
      response = await chatService.chat(message, { model, ...options });
    } else {
      return res.status(400).json({
        error: 'Either message or messages array is required',
      });
    }

    res.json({
      success: true,
      response,
      model,
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
 * GET /api/ai/image/models
 * Get available image generation models
 */
router.get('/image/models', verifyUser, (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const models = ImageService.getAvailableModels();
    successResponse(res, {
      models,
      totalCount: models.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/image/generate
 * Generate images using specified model
 */
router.post(
  '/image/generate',
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

      const images = await ImageService.generate({
        model,
        ...options,
      });

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

export { router as aiRouter };
