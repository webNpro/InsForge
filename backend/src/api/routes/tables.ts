import { Router, Response, NextFunction } from 'express';
import { verifyAdmin, verifyUser, AuthRequest } from '@/api/middleware/auth.js';
import { DatabaseTableService } from '@/core/database/tables.js';
import { successResponse } from '@/utils/response.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { createTableRequestSchema, updateTableSchemaRequestSchema } from '@insforge/shared-schemas';
import { SocketService } from '@/core/socket/socket';
import { DataUpdateResourceType, ServerEvents } from '@/core/socket/types';

const router = Router();
const tableService = new DatabaseTableService();

// All table routes accept either JWT token or API key authentication
// router.use(verifyAdmin);

// List all tables
router.get('/', verifyUser, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tables = await tableService.listTables();
    successResponse(res, tables);
  } catch (error) {
    next(error);
  }
});

// Create a new table
router.post('/', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createTableRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT,
        'Please check the request body, it must conform with the CreateTableRequest schema.'
      );
    }

    const { tableName, columns, rlsEnabled } = validation.data;
    const result = await tableService.createTable(tableName, columns, rlsEnabled);
    const socket = SocketService.getInstance();
    socket.broadcastToRoom('role:project_admin', ServerEvents.DATA_UPDATE, {
      resource: DataUpdateResourceType.DATABASE_SCHEMA,
    });
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
});

// Get table schema
router.get(
  '/:tableName/schema',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const schema = await tableService.getTableSchema(tableName);
      successResponse(res, schema);
    } catch (error) {
      next(error);
    }
  }
);

// Update table schema
router.patch(
  '/:tableName/schema',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;

      const validation = updateTableSchemaRequestSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          400,
          ERROR_CODES.INVALID_INPUT,
          'Please check the request body, it must conform with the UpdateTableRequest schema.'
        );
      }

      const operations = validation.data;
      const result = await tableService.updateTableSchema(tableName, operations);
      const socket = SocketService.getInstance();
      socket.broadcastToRoom('role:project_admin', ServerEvents.DATA_UPDATE, {
        resource: DataUpdateResourceType.TABLE_SCHEMA,
        data: {
          name: tableName,
        },
      });
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a table
router.delete(
  '/:tableName',
  verifyAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const result = await tableService.deleteTable(tableName);
      const socket = SocketService.getInstance();
      socket.broadcastToRoom('role:project_admin', ServerEvents.DATA_UPDATE, {
        resource: DataUpdateResourceType.DATABASE_SCHEMA,
      });
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

export { router as tableRouter };
