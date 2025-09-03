import { Router, Response } from 'express';
import { DatabaseController } from '@/controllers/database.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { upload, handleUploadError } from '@/api/middleware/upload.js';
import {
  rawSQLRequestSchema,
  exportRequestSchema,
  importRequestSchema,
} from '@insforge/shared-schemas';
import logger from '@/utils/logger';

const router = Router();
const databaseController = new DatabaseController();

/**
 * Execute raw SQL query
 * POST /api/database/advance/rawsql
 */
router.post('/rawsql', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = rawSQLRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const { query, params = [] } = validation.data;
    const response = await databaseController.executeRawSQL(query, params);
    res.json(response);
  } catch (error: unknown) {
    logger.warn('Raw SQL execution error:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: 'SQL_EXECUTION_ERROR',
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      res.status(400).json({
        error: 'SQL_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute SQL query',
        statusCode: 400,
      });
    }
  }
});

/**
 * Export database data
 * POST /api/database/advance/export
 */
router.post('/export', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = exportRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const {
      tables,
      format,
      includeData,
      includeFunctions,
      includeSequences,
      includeViews,
      rowLimit,
    } = validation.data;
    const response = await databaseController.exportDatabase(
      tables,
      format,
      includeData,
      includeFunctions,
      includeSequences,
      includeViews,
      rowLimit
    );
    res.json(response);
  } catch (error: unknown) {
    logger.warn('Database export error:', error);
    res.status(500).json({
      error: 'EXPORT_ERROR',
      message: error instanceof Error ? error.message : 'Failed to export database',
      statusCode: 500,
    });
  }
});

/**
 * Import database data from SQL file
 * POST /api/database/advance/import
 * Expects a SQL file upload via multipart/form-data
 */
router.post(
  '/import',
  verifyAdmin,
  upload.single('file'),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate request body
      const validation = importRequestSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          400,
          ERROR_CODES.INVALID_INPUT
        );
      }

      const { truncate } = validation.data;

      if (!req.file) {
        throw new AppError('SQL file is required', 400, ERROR_CODES.INVALID_INPUT);
      }

      const response = await databaseController.importDatabase(
        req.file.buffer,
        req.file.originalname,
        req.file.size,
        truncate
      );
      res.json(response);
    } catch (error: unknown) {
      logger.warn('Database import error:', error);

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: 'IMPORT_ERROR',
          message: error.message,
          statusCode: error.statusCode,
        });
      } else {
        res.status(500).json({
          error: 'IMPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to import database',
          statusCode: 500,
        });
      }
    }
  }
);

export default router;
