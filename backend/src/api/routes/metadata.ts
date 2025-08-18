import { Router, Response, NextFunction } from 'express';
import { MetadataService } from '@/core/metadata/metadata.js';
import { AuthService } from '@/core/auth/auth.js';
import { SocketService } from '@/core/socket/socket.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { successResponse } from '@/utils/response.js';
import { ServerEvents } from '@/core/socket/types';

const router = Router();

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

// Get database metadata for frontend dashboard
router.get('/database', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metadataService = MetadataService.getInstance();
    await metadataService.updateDatabaseMetadata();
    const databaseMetadata = await metadataService.getDatabaseMetadata();

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

export { router as metadataRouter };
