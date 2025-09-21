import { Router, Response, NextFunction } from 'express';
import { DatabaseAdvanceService } from '@/core/database/advance.js';
import { AuthService } from '@/core/auth/auth.js';
import { StorageService } from '@/core/storage/storage.js';
import { AIConfigService } from '@/core/ai/config.js';
import { FunctionsService } from '@/core/functions/functions.js';
import { SocketService } from '@/core/socket/socket.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { successResponse } from '@/utils/response.js';
import { ServerEvents } from '@/core/socket/types';
import { ERROR_CODES } from '@/types/error-constants.js';
import { AppError } from '@/api/middleware/error.js';
import type { AppMetadataSchema } from '@insforge/shared-schemas';
import { SecretsService } from '@/core/secrets/secrets';

const router = Router();
const dbAdvanceService = new DatabaseAdvanceService();
const aiConfigService = new AIConfigService();

router.use(verifyAdmin);

// Get full metadata (default endpoint)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Gather metadata from all modules
    const authService = AuthService.getInstance();
    const storageService = StorageService.getInstance();
    const functionsService = FunctionsService.getInstance();

    // Fetch all metadata in parallel for better performance
    const [database, auth, storage, aiConfig, functions] = await Promise.all([
      dbAdvanceService.getMetadata(),
      authService.getOAuthStatus(),
      storageService.getMetadata(),
      aiConfigService.getMetadata(),
      functionsService.getMetadata(),
    ]);

    // Get version from package.json or default
    const version = process.env.npm_package_version || '1.0.0';

    const metadata: AppMetadataSchema = {
      auth,
      database,
      storage,
      functions,
      aiIntegration: aiConfig,
      version,
    };

    // Trigger Socket.IO event to notify frontend that MCP is connected
    if (req.query.mcp === 'true') {
      const socketService = SocketService.getInstance();
      //Lyu note: this is triggered everytime when a mcp calls get-metadata. Do we have a better solution for this?
      socketService.broadcastToRoom('role:project_admin', ServerEvents.MCP_CONNECTED);
    }

    successResponse(res, metadata);
  } catch (error) {
    next(error);
  }
});

// Get auth metadata
router.get('/auth', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authService = AuthService.getInstance();
    const authMetadata = await authService.getOAuthStatus();
    successResponse(res, authMetadata);
  } catch (error) {
    next(error);
  }
});

// Get database metadata
router.get('/database', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const databaseMetadata = await dbAdvanceService.getMetadata();
    successResponse(res, databaseMetadata);
  } catch (error) {
    next(error);
  }
});

// Get storage metadata
router.get('/storage', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storageService = StorageService.getInstance();
    const storageMetadata = await storageService.getMetadata();
    successResponse(res, storageMetadata);
  } catch (error) {
    next(error);
  }
});

// Get AI metadata
router.get('/ai', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const aiMetadata = await aiConfigService.getMetadata();
    successResponse(res, aiMetadata);
  } catch (error) {
    next(error);
  }
});

// Get functions metadata
router.get('/functions', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const functionsService = FunctionsService.getInstance();
    const functionsMetadata = await functionsService.getMetadata();
    successResponse(res, functionsMetadata);
  } catch (error) {
    next(error);
  }
});

// Get API key (admin only)
router.get('/api-key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sercretService = new SecretsService();
    const apiKey = await sercretService.getSecretByName('API_KEY');

    successResponse(res, { apiKey: apiKey });
  } catch (error) {
    next(error);
  }
});

// get metadata for a table.
// Notice: must be after endpoint /api-key in case of conflict.
router.get('/:tableName', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tableName } = req.params;
    if (!tableName) {
      throw new AppError('Table name is required', 400, ERROR_CODES.INVALID_INPUT);
    }

    const includeData = false;
    const includeFunctions = false;
    const includeSequences = false;
    const includeViews = false;
    const schemaResponse = await dbAdvanceService.exportDatabase(
      [tableName],
      'json',
      includeData,
      includeFunctions,
      includeSequences,
      includeViews
    );

    // Trigger Socket.IO event to notify frontend that MCP is connected
    if (req.query.mcp === 'true') {
      const socketService = SocketService.getInstance();
      //Lyu note: this is triggered everytime when a mcp calls get-metadata. Do we have a better solution for this?
      socketService.broadcastToRoom('role:project_admin', ServerEvents.MCP_CONNECTED);
    }
    // When format is 'json', the data contains the tables object
    const jsonData = schemaResponse.data as { tables: Record<string, unknown> };
    const metadata = jsonData.tables;
    successResponse(res, metadata);
  } catch (error) {
    next(error);
  }
});

export { router as metadataRouter };
