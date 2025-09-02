import { Router, Response, NextFunction } from 'express';
import { MetadataService } from '@/core/metadata/metadata.js';
import { DatabaseController } from '@/controllers/database.js';
import { AuthService } from '@/core/auth/auth.js';
import { SocketService } from '@/core/socket/socket.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { successResponse } from '@/utils/response.js';
import { ServerEvents } from '@/core/socket/types';
import { ERROR_CODES } from '@/types/error-constants.js';
import { AppError } from '@/api/middleware/error.js';

const router = Router();
const databaseController = new DatabaseController();

router.use(verifyAdmin);

// Get full metadata (default endpoint)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metadataService = MetadataService.getInstance();
    const metadata = await metadataService.getFullMetadata();

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

// Get metadata for frontend dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metadataService = MetadataService.getInstance();
    await metadataService.updateDatabaseMetadata();
    const databaseMetadata = await metadataService.getDashboardMetadata();

    successResponse(res, databaseMetadata);
  } catch (error) {
    next(error);
  }
});

// Get API key (admin only)
router.get('/api-key', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authService = AuthService.getInstance();
    const apiKey = await authService.initializeApiKey();

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
    const schemaResponse = await databaseController.exportDatabase([tableName], 'json', includeData, includeFunctions, includeSequences, includeViews);

    // Trigger Socket.IO event to notify frontend that MCP is connected
    if (req.query.mcp === 'true') {
      const socketService = SocketService.getInstance();
      //Lyu note: this is triggered everytime when a mcp calls get-metadata. Do we have a better solution for this?
      socketService.broadcastToRoom('role:project_admin', ServerEvents.MCP_CONNECTED);
    }
    // When format is 'json', the data contains the tables object
    const jsonData = schemaResponse.data as { tables: Record<string, any> };
    const metadata = jsonData.tables;
    successResponse(res, metadata);
  } catch (error) {
    next(error);
  }
});

export { router as metadataRouter };
