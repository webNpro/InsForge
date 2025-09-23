import { Router, Response, NextFunction } from 'express';
import { AnalyticsManager } from '@/core/analytics/analytics.js';
import { AuditService } from '@/core/logs/audit.js';
import { AuthRequest, verifyAdmin } from '@/api/middleware/auth.js';
import { successResponse, paginatedResponse } from '@/utils/response.js';
import { AnalyticsLogResponse } from '@/types/logs.js';

const router = Router();

// All logs routes require admin authentication
router.use(verifyAdmin);

// GET /logs/audits - List audit logs
router.get('/audits', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 100, offset = 0, actor, action, module, start_date, end_date } = req.query;

    const auditService = AuditService.getInstance();

    // Build query parameters for audit service
    const queryParams = {
      limit: Number(limit),
      offset: Number(offset),
      ...(actor && typeof actor === 'string' && { actor }),
      ...(action && typeof action === 'string' && { action }),
      ...(module && typeof module === 'string' && { module }),
      ...(start_date && typeof start_date === 'string' && { start_date: new Date(start_date) }),
      ...(end_date && typeof end_date === 'string' && { end_date: new Date(end_date) }),
    };

    // Get audit logs with total count
    const { records, total } = await auditService.query(queryParams);

    paginatedResponse(res, records, total, Number(offset));
  } catch (error) {
    next(error);
  }
});

// GET /logs/audits/stats - Get audit logs statistics
router.get('/audits/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 7 } = req.query;

    const auditService = AuditService.getInstance();
    const stats = await auditService.getStats(Number(days));

    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
});

// DELETE /logs/audits - Clear audit logs (admin only)
router.delete('/audits', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days_to_keep = 90 } = req.query;

    const auditService = AuditService.getInstance();
    const deletedCount = await auditService.cleanup(Number(days_to_keep));

    successResponse(res, {
      message: 'Audit logs cleared successfully',
      deleted: deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

// Analytics logs routes
// GET /logs/analytics/sources - List all log sources
router.get('/analytics/sources', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyticsManager = AnalyticsManager.getInstance();
    const sources = await analyticsManager.getLogSources();

    successResponse(res, sources);
  } catch (error) {
    next(error);
  }
});

// GET /logs/analytics/stats - Get statistics for all log sources
router.get('/analytics/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyticsManager = AnalyticsManager.getInstance();
    const stats = await analyticsManager.getLogSourceStats();

    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
});

// GET /logs/analytics/search - Search across all logs or specific source
router.get('/analytics/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q, source, limit = 100, offset = 0 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'MISSING_QUERY',
        message: 'Search query parameter (q) is required',
        statusCode: 400,
      });
    }

    const analyticsManager = AnalyticsManager.getInstance();
    const result = await analyticsManager.searchLogs(
      q,
      source as string | undefined,
      Number(limit),
      Number(offset)
    );

    paginatedResponse(res, result.logs, result.total, Number(offset));
  } catch (error) {
    next(error);
  }
});

// GET /logs/analytics/:source - Get logs from specific source
router.get('/analytics/:source', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { source } = req.params;
    const { limit = 100, before_timestamp } = req.query;

    const analyticsManager = AnalyticsManager.getInstance();
    const result = await analyticsManager.getLogsBySource(
      source,
      Number(limit),
      before_timestamp as string | undefined
    );

    const response: AnalyticsLogResponse = {
      source,
      logs: result.logs,
      total: result.total,
      page: 1, // Not applicable for timestamp-based pagination
      pageSize: Number(limit),
    };

    successResponse(res, response);
  } catch (error) {
    next(error);
  }
});

export { router as logsRouter };
