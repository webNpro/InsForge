import { Router, Response, NextFunction } from 'express';
import axios from 'axios';
import http from 'http';
import https from 'https';
import { AuthRequest, extractApiKey } from '@/api/middleware/auth.js';
import { DatabaseManager } from '@/core/database/database.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { validateTableName } from '@/utils/validations.js';
import { DatabaseRecord } from '@/types/database.js';
import { successResponse } from '@/utils/response.js';
import { AuthService } from '@/core/auth/auth.js';
import logger from '@/utils/logger.js';

const router = Router();
const authService = AuthService.getInstance();
const postgrestUrl = process.env.POSTGREST_BASE_URL || 'http://localhost:5430';

// Create a dedicated HTTP agent with connection pooling for PostgREST
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 10000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 10000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
});

// Create axios instance with custom agents
const postgrestAxios = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 5000, // Request timeout
  maxRedirects: 0, // Don't follow redirects
});

// Generate admin token once and reuse
// If user request with api key, this token should be added automatically.
const adminToken = authService.generateToken({
  sub: 'project-admin-with-api-key',
  email: 'project-admin@email.com',
  role: 'project_admin',
});

// anonymous users can access the database, postgREST does not require authentication, however we seed to unwrap session token for better auth, thus
// we need to verify user token below.
// router.use(verifyUserOrApiKey);

/**
 * Forward database requests to PostgREST
 */
const forwardToPostgrest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { tableName } = req.params;
  const wildcardPath = req.params[0] || '';
  
  // Build the target URL early so it's available in error handling
  const targetPath = wildcardPath ? `/${tableName}/${wildcardPath}` : `/${tableName}`;
  const targetUrl = `${postgrestUrl}${targetPath}`;
  
  try {
    // Validate table name with operation type
    const method = req.method.toUpperCase();
    const operation = method === 'GET' ? 'READ' : 'WRITE';

    try {
      validateTableName(tableName, operation);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid table name', 400, ERROR_CODES.INVALID_INPUT);
    }

    // Process request body for POST/PATCH/PUT operations
    if (['POST', 'PATCH', 'PUT'].includes(method) && req.body && typeof req.body === 'object') {
      const columnTypeMap = await DatabaseManager.getColumnTypeMap(tableName);
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

    // Forward the request
    const axiosConfig: {
      method: string;
      url: string;
      params: unknown;
      headers: Record<string, string | string[] | undefined>;
      data?: unknown;
    } = {
      method: req.method,
      url: targetUrl,
      params: req.query,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
        'content-length': undefined, // Let axios calculate
      },
    };

    // Check for API key using shared logic
    const apiKey = extractApiKey(req);

    // If we have an API key, verify it and use admin token for PostgREST
    if (apiKey) {
      const isValid = await authService.verifyApiKey(apiKey);
      if (isValid) {
        axiosConfig.headers.authorization = `Bearer ${adminToken}`;
      }
    }

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      axiosConfig.data = req.body;
    }

    // Make the request to PostgREST with retry logic for transient failures
    let response;
    let lastError;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await postgrestAxios(axiosConfig);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        
        // Only retry on network errors, not on HTTP error responses
        if (axios.isAxiosError(error) && !error.response && attempt < maxRetries) {
          logger.warn(`PostgREST request failed, retrying (attempt ${attempt}/${maxRetries})`, {
            url: targetUrl,
            errorCode: error.code,
          });
          
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
        } else {
          throw error; // Don't retry on HTTP errors or last attempt
        }
      }
    }
    
    if (!response) {
      throw lastError || new Error('Failed to get response from PostgREST');
    }

    // Forward response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      if (
        keyLower !== 'content-length' &&
        keyLower !== 'transfer-encoding' &&
        keyLower !== 'connection' &&
        keyLower !== 'content-encoding'
      ) {
        res.setHeader(key, value);
      }
    });

    // Handle empty responses
    let responseData = response.data;
    if (
      response.data === undefined ||
      (typeof response.data === 'string' && response.data.trim() === '')
    ) {
      responseData = [];
    }

    // Set status and send response
    successResponse(res, responseData, response.status);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Log more detailed error information  
      logger.error('PostgREST request failed', {
        url: targetUrl,
        method: req.method,
        error: {
          code: error.code,
          message: error.message,
          response: error.response?.data,
          responseStatus: error.response?.status,
        },
      });
      
      // Forward PostgREST errors
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        // Network error - connection refused, DNS failure, etc.
        const errorMessage = error.code === 'ECONNREFUSED' 
          ? 'PostgREST connection refused'
          : error.code === 'ENOTFOUND'
          ? 'PostgREST service not found'
          : 'Database service unavailable';

        next(new AppError(errorMessage, 503, ERROR_CODES.INTERNAL_ERROR));
      }
    } else {
      logger.error('Unexpected error in database route', { error });
      next(error);
    }
  }
};

// Forward all database operations to PostgREST
router.all('/:tableName', forwardToPostgrest);
router.all('/:tableName/*', forwardToPostgrest);

export { router as databaseRouter };
