import { Router, Response } from 'express';
import { verifyUserOrApiKey, AuthRequest } from '../middleware/auth.js';
import { errorResponse, successResponse } from '../utils/response.js';
import { ERROR_CODES } from '../types/error-constants.js';
import axios from 'axios';
import { DatabaseManager } from '../services/database.js';
import { validateTableName } from '../utils/validations.js';
import { AppError } from '../middleware/error.js';
import { DatabaseRecord } from '../types/database.js';

const router = Router();

const POSTGREST_BASE_URL = process.env.POSTGREST_BASE_URL || 'http://localhost:5430';

router.use(verifyUserOrApiKey);

async function forwardToPostgrest(req: AuthRequest, res: Response) {
  try {
    const { tablename } = req.params;

    // Validate table name (includes check for system tables)
    try {
      validateTableName(tablename);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(res, error.code, error.message, error.statusCode, error.nextAction);
      }
      throw error;
    }

    const method = req.method.toUpperCase();
    if (['POST', 'PATCH', 'PUT'].includes(method) && req.body && typeof req.body === 'object') {
      const columnTypeMap = await DatabaseManager.getColumnTypeMap(tablename);
      if (Array.isArray(req.body)) {
        req.body = req.body.map((item) => {
          if (item && typeof item === 'object') {
            const filtered: DatabaseRecord = {};
            for (const key in item) {
              if (columnTypeMap[key] !== 'text' && item[key] === '') {
                continue;
              }
              filtered[key] = item[key];
            }
            return filtered;
          }
          return item;
        });
      } else {
        const body = req.body as DatabaseRecord;
        for (const key in body) {
          if (columnTypeMap[key] === 'uuid' && body[key] === '') {
            delete body[key];
          }
        }
      }
    }

    const extraPath = req.params[0] || '';
    const targetUrl = `${POSTGREST_BASE_URL}/${tablename}${extraPath}`;

    // Query parameters are passed directly to PostgREST without transformation
    const queryParams = { ...req.query };

    const config = {
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': req.get('Content-Type') || 'application/json',
        Accept: req.get('Accept') || 'application/json',
        Prefer: req.get('Prefer'),
        Range: req.get('Range'),
        Authorization: req.get('Authorization'),
      },
      params: queryParams,
      data: req.body,
    };
    if (req.method.toUpperCase() === 'GET' || req.method.toUpperCase() === 'HEAD') {
      delete config.data;
    }

    const response = await axios(config);

    Object.entries(response.headers).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      if (
        keyLower !== 'content-length' &&
        keyLower !== 'transfer-encoding' &&
        keyLower !== 'connection'
      ) {
        res.set(key, value);
      }
    });

    let response_result = response.data;
    if (
      response.data === undefined ||
      (typeof response.data === 'string' && response.data.trim() === '')
    ) {
      response_result = [];
    }
    return successResponse(res, response_result, response.status);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Service unavailable';
      const details = error.response?.data || undefined;
      return errorResponse(res, ERROR_CODES.DATABASE_INTERNAL_ERROR, message, status, details);
    }
    return errorResponse(
      res,
      ERROR_CODES.DATABASE_INTERNAL_ERROR,
      (error as Error).message || 'Internal server error',
      500
    );
  }
}

router.all('/:tablename', forwardToPostgrest);
router.all('/:tablename/*', forwardToPostgrest);

export { router as databaseRouter };
