import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/core/auth/auth.js';
import { AppError } from './error.js';
import { ERROR_CODES, NEXT_ACTION } from '@/types/error-constants.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

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

// Lazy initialization to avoid circular dependency
let authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = AuthService.getInstance();
  }
  return authService;
}

// Helper function to extract Bearer token
function extractBearerToken(authHeader: string | undefined): string | null {
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

// Helper function to verify cloud backend JWT token
export async function verifyCloudToken(token: string): Promise<{ projectId: string; payload: any }> {
  // Create JWKS endpoint for remote key set
  const JWKS = createRemoteJWKSet(
    new URL(
      (process.env.CLOUD_API_HOST || 'https://api.insforge.dev') + '/.well-known/jwks.json'
    )
  );

  // Verify the token with jose
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
  });

  // Verify project_id matches if configured
  const tokenProjectId = (payload as any).projectId;
  const expectedProjectId = process.env.PROJECT_ID;
  
  if (expectedProjectId && tokenProjectId !== expectedProjectId) {
    throw new AppError(
      'Project ID mismatch',
      403,
      ERROR_CODES.AUTH_UNAUTHORIZED,
      NEXT_ACTION.CHECK_TOKEN
    );
  }

  return {
    projectId: tokenProjectId,
    payload
  };
}

/**
 * Verifies user authentication (accepts both user and admin tokens)
 */
export async function verifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  // API key takes precedence for backward compatibility
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return verifyApiKey(req, res, next);
  }

  // Use the main verifyToken that handles all the logic
  return verifyToken(req, res, next);
}

/**
 * Verifies admin authentication (requires admin token)
 */
export async function verifyAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  // API key takes precedence for backward compatibility
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return verifyApiKey(req, res, next);
  }

  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError(
        'No admin token provided',
        401,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        NEXT_ACTION.CHECK_TOKEN
      );
    }

    // For admin, we use JWT tokens
    const payload = getAuthService().verifyToken(token);

    if (payload.role !== 'project_admin') {
      throw new AppError(
        'Admin access required',
        403,
        ERROR_CODES.AUTH_UNAUTHORIZED,
        NEXT_ACTION.CHECK_ADMIN_TOKEN
      );
    }

    setRequestUser(req, payload);
    next();
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

export async function verifyApiKey(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new AppError(
        'No API key provided',
        401,
        ERROR_CODES.AUTH_INVALID_API_KEY,
        NEXT_ACTION.CHECK_API_KEY
      );
    }

    const isValid = await getAuthService().verifyApiKey(apiKey);
    if (!isValid) {
      throw new AppError(
        'Invalid API key',
        401,
        ERROR_CODES.AUTH_INVALID_API_KEY,
        NEXT_ACTION.CHECK_API_KEY
      );
    }

    req.authenticated = true;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Core token verification middleware that handles JWT token extraction and verification
 * Sets req.user with the authenticated user information
 */
export async function verifyToken(req: AuthRequest, _res: Response, next: NextFunction) {
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

    // Verify JWT token
    const payload = getAuthService().verifyToken(token);

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
