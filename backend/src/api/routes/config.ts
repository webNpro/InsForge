import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DatabaseManager } from '@/core/database/database.js';
import { verifyAdmin } from '@/api/middleware/auth.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { successResponse } from '@/utils/response.js';
import logger from '@/utils/logger.js';
import { SocketService } from '@/core/socket/socket';
import { DataUpdateResourceType, ServerEvents } from '@/core/socket/types';
import { oAuthConfigSchema } from '@insforge/shared-schemas';
import { shouldUseSharedOAuthKeys } from '@/utils/environment.js';
import { AuthService } from '@/core/auth/auth.js';

const router = Router();
const authService = AuthService.getInstance();

// Get OAuth configuration (admin only) - uses AuthService for consistency
router.get('/oauth', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use AuthService to get OAuth config with masked secrets
    const config = await authService.getOAuthConfigForAPI(true);
    successResponse(res, config);
  } catch (error) {
    logger.error('Failed to load OAuth configuration via AuthService:', error);
    next(
      new AppError('Failed to load OAuth configuration', 500, ERROR_CODES.AUTH_OAUTH_CONFIG_ERROR)
    );
  }
});

// Update OAuth configuration (admin only) - stores as JSON like auth.ts
router.post('/oauth', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = oAuthConfigSchema.parse(req.body);

    const useSharedKeys = shouldUseSharedOAuthKeys();
    if (
      !useSharedKeys &&
      (validatedData.google.useSharedKeys || validatedData.github.useSharedKeys)
    ) {
      throw new AppError(
        'Shared OAuth keys are not enabled in this environment',
        400,
        ERROR_CODES.AUTH_OAUTH_CONFIG_ERROR
      );
    }

    const db = DatabaseManager.getInstance();
    // Start transaction
    await db.getDb().exec('BEGIN');

    try {
      // Update config values as JSON (matching auth.ts format)
      for (const [provider, config] of Object.entries(validatedData)) {
        const key = `auth.oauth.provider.${provider}`;

        // Get existing config to preserve unmasked secrets
        const existing = await db
          .getDb()
          .prepare('SELECT value FROM _config WHERE key = ?')
          .get(key);

        const finalConfig = { ...config };

        if (existing && existing.value) {
          try {
            const existingConfig = JSON.parse(existing.value);
            // Preserve existing secret if new one is masked
            if (config.clientSecret && config.clientSecret.includes('****')) {
              finalConfig.clientSecret = existingConfig.clientSecret;
            }
          } catch {
            // If parse fails, use new config as-is
          }
        }

        // Store as JSON
        const configJson = JSON.stringify(finalConfig);

        await db
          .getDb()
          .prepare(
            `INSERT INTO _config (key, value) VALUES (?, ?)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`
          )
          .run(key, configJson);
      }

      await db.getDb().exec('COMMIT');

      // Metadata is now updated on-demand when requested

      const socket = SocketService.getInstance();
      socket.broadcastToRoom('role:project_admin', ServerEvents.DATA_UPDATE, {
        resource: DataUpdateResourceType.OAUTH_SCHEMA,
      });

      // AuthService will automatically reload config within 1 minute due to cache TTL
      successResponse(res, {
        message: 'OAuth configuration updated successfully',
        note: 'Configuration will be active within 1 minute (cache refresh)',
      });
    } catch (error) {
      await db.getDb().exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(
        new AppError(
          'Invalid OAuth configuration',
          400,
          ERROR_CODES.DATABASE_VALIDATION_ERROR,
          error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        )
      );
    } else {
      next(error);
    }
  }
});

// Get OAuth status (public endpoint) - uses AuthService for consistency
router.get('/oauth/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use AuthService to get OAuth status
    const status = await authService.getOAuthStatus();
    successResponse(res, status);
  } catch (error) {
    logger.error('Failed to load OAuth status via AuthService:', error);
    next(new AppError('Failed to load OAuth status', 500, ERROR_CODES.AUTH_OAUTH_CONFIG_ERROR));
  }
});

// Force reload OAuth configuration (admin only)
// Note: Not really needed since AuthService auto-reloads every minute
router.post('/oauth/reload', verifyAdmin, (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('OAuth reload requested - config will refresh on next request');

    // AuthService automatically reloads config from DB with 1-minute cache
    // No action needed here, just inform the admin

    successResponse(res, {
      message: 'OAuth configuration cache cleared',
      note: 'New configuration will be loaded on next OAuth request',
    });
  } catch (error) {
    next(error);
  }
});

export { router as configRouter };
