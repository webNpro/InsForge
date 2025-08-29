import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/core/auth/auth.js';
import { AppError } from './error.js';
import { ERROR_CODES, NEXT_ACTION } from '@/types/error-constants.js';
import { verifyCloudToken } from '@/utils/cloud-token.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  authenticated?: boolean;
  apiKey?: string;
  projectId?: string;
}

const authService = AuthService.getInstance();

// Helper function to extract Bearer token
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper function to set user on request
function setRequestUser(req: AuthRequest, payload: { sub: string; email: string; role: string }) {
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

/**
 * Verifies user authentication (accepts both user and admin tokens)
 */
export async function verifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  // API key takes precedence for backward compatibility
   // Fall back to x-api-key header for backward compatibility
    // mcp tool call still sends x-api-key header, we don't want to easily upgrade mcp version
    // as that will break existing users. We wait for every user to upgrade their docker backend, then we can upgrade mcp version and remove this check.
 
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return verifyApiKey(req, res, next);
  }

  // Use the main verifyToken that handles all the logic
  return verifyTokenOrApiKey(req, res, next);
}

/**
 * Verifies admin authentication (requires admin token)
 */
export async function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // API key takes precedence for backward compatibility
    // Fall back to x-api-key header for backward compatibility
    // mcp tool call still sends x-api-key header, we don't want to easily upgrade mcp version
    // as that will break existing users. We wait for every user to upgrade their docker backend, then we can upgrade mcp version and remove this check.
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      // Use verifyApiKey which already sets role as 'project_admin' for API keys
      return verifyApiKey(req, res, next);
    }

    // First verify the token (JWT or API key)
    await verifyTokenOrApiKey(req, res, (error) => {
      if (error) {
        return next(error);
      }

      // Then check for admin role
      if (req.user?.role !== 'project_admin') {
        return next(
          new AppError(
            'Admin access required',
            403,
            ERROR_CODES.AUTH_UNAUTHORIZED,
            NEXT_ACTION.CHECK_ADMIN_TOKEN
          )
        );
      }

      next();
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(
          'Invalid admin token',
          401,
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          NEXT_ACTION.CHECK_ADMIN_TOKEN
        )
      );
    }
  }
}

/**
 * Verifies API key authentication
 * Accepts API key via Authorization: Bearer header or x-api-key header (backward compatibility)
 */
export async function verifyApiKey(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    // Try to get API key from Bearer token first
    let apiKey = extractBearerToken(req.headers.authorization);
    
    // Fall back to x-api-key header for backward compatibility
    // after each mcp tool call it will still send x-api-key header to, we don't want to easily upgrade mcp version
    // as that will break existing users. We wait for every user to upgrade their docker backend, then we can upgrade mcp version and remove this check.
    if (!apiKey) {
      apiKey = req.headers['x-api-key'] as string;
    }
    
    if (!apiKey) {
      throw new AppError(
        'No API key provided',
        401,
        ERROR_CODES.AUTH_INVALID_API_KEY,
        NEXT_ACTION.CHECK_API_KEY
      );
    }

    const isValid = await authService.verifyApiKey(apiKey);
    if (!isValid) {
      throw new AppError(
        'Invalid API key',
        401,
        ERROR_CODES.AUTH_INVALID_API_KEY,
        NEXT_ACTION.CHECK_API_KEY
      );
    }

    // Set project-level authentication for API key
    setRequestUser(req, {
      sub: 'api-key',
      email: 'api@insforge.local',
      role: 'project_admin',
    });
    req.authenticated = true;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Core token verification middleware that handles both JWT tokens and API keys
 * - API keys start with 'ik' (Insforge Key)
 * - JWT tokens have 3 parts separated by dots
 * Sets req.user with the authenticated user information
 */
export async function verifyTokenOrApiKey(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError(
        'No token provided',
        401,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        NEXT_ACTION.CHECK_TOKEN
      );
    }

    // Check if it's an API key (starts with 'ik' for Insforge Key)
    if (token.startsWith('ik')) {
      const isValid = await authService.verifyApiKey(token);
      if (!isValid) {
        throw new AppError(
          'Invalid API key',
          401,
          ERROR_CODES.AUTH_INVALID_API_KEY,
          NEXT_ACTION.CHECK_API_KEY
        );
      }

      // Set project-level authentication for API key
      setRequestUser(req, {
        sub: 'api-key',
        email: 'api@insforge.local',
        role: 'project_admin',
      });
      req.authenticated = true;
      req.apiKey = token;
    } else {
      // It's a JWT token
      const payload = authService.verifyToken(token);

      // Validate token has a role
      if (!payload.role) {
        throw new AppError(
          'Invalid token: missing role',
          401,
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          NEXT_ACTION.CHECK_TOKEN
        );
      }

      // Set user info on request
      setRequestUser(req, payload);
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(
          'Invalid token',
          401,
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          NEXT_ACTION.CHECK_TOKEN
        )
      );
    }
  }
}

/**
 * Verifies JWT token from cloud backend (api.insforge.dev)
 * Validates signature using JWKS and checks project_id claim
 */
export async function verifyCloudBackend(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError(
        'No authorization token provided',
        401,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        NEXT_ACTION.CHECK_TOKEN
      );
    }

    // Use helper function to verify cloud token
    const { projectId } = await verifyCloudToken(token);

    // Set project_id on request for use in route handlers
    req.projectId = projectId;
    req.authenticated = true;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError(
          'Invalid cloud backend token',
          401,
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          NEXT_ACTION.CHECK_TOKEN
        )
      );
    }
  }
}
