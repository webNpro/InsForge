import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '@/core/auth/auth.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { successResponse } from '@/utils/response.js';
import { verifyAdmin } from '@/api/middleware/auth.js';
import logger from '@/utils/logger.js';
import {
  createUserRequestSchema,
  createSessionRequestSchema,
  createAdminSessionRequestSchema,
  deleteUsersRequestSchema,
  listUsersRequestSchema,
  type ListUsersResponse,
  type DeleteUsersResponse,
  type GetCurrentSessionResponse,
} from '@insforge/shared-schemas';

const router = Router();
const authService = AuthService.getInstance();

// POST /api/auth/users - Create a new user (registration)
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createUserRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Invalid input',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { email, password, name } = validationResult.data;
    const result = await authService.register(email, password, name);
    
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/sessions - Create a new session (login)
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createSessionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Invalid input',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { email, password } = validationResult.data;
    const result = await authService.login(email, password);
    
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/admin/sessions - Create admin session  
router.post('/admin/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createAdminSessionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Invalid input',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { email, password } = validationResult.data;
    const result = await authService.adminLogin(email, password);
    
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/sessions/current - Get current session user
router.get('/sessions/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'No token provided',
        401,
        ERROR_CODES.AUTH_INVALID_CREDENTIALS
      );
    }
    
    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);
    
    const response: GetCurrentSessionResponse = {
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role
      }
    };
    
    res.json(response);
  } catch (error) {
    next(new AppError(
      'Invalid token',
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS
    ));
  }
});

// GET /api/auth/users - List all users (admin only)
router.get('/users', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryValidation = listUsersRequestSchema.safeParse(req.query);
    const queryParams = queryValidation.success 
      ? queryValidation.data 
      : req.query;
    const { limit = '10', offset = '0', search } = queryParams || {};
    const db = authService.getDb();
    
    let query = `
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.email_verified, 
        u.created_at, 
        u.updated_at,
        u.password,
        a.provider
      FROM _user u
      LEFT JOIN _account a ON u.id = a.user_id
    `;
    const params: any[] = [];
    
    if (search) {
      query += ' WHERE u.email LIKE ? OR u.name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const dbUsers = await db.prepare(query).all(...params);
    
    // Transform and add provider type
    const users = dbUsers.map((dbUser: any) => {
      // Return snake_case for frontend compatibility
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        email_verified: dbUser.email_verified,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at,
        identities: dbUser.provider || 'email',  // Show 'email' or 'google'/'github'
        provider_type: dbUser.provider ? 'social' : 'email'
      };
    });
    
    let countQuery = 'SELECT COUNT(*) as count FROM _user';
    const countParams: any[] = [];
    if (search) {
      countQuery += ' WHERE email LIKE ? OR name LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const { count } = await db.prepare(countQuery).get(...countParams);
    
    const response: ListUsersResponse = {
      users,
      total: count
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/users/:id - Get specific user (admin only)
router.get('/users/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = authService.getDb();
    
    const dbUser = await db.prepare(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.email_verified, 
        u.created_at, 
        u.updated_at,
        a.provider
      FROM _user u
      LEFT JOIN _account a ON u.id = a.user_id
      WHERE u.id = ?
    `).get(id);
    
    if (!dbUser) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND);
    }
    
    // Return snake_case for frontend compatibility
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      email_verified: dbUser.email_verified,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
      identities: dbUser.provider || 'email',  // Show 'email' or 'google'/'github'
      provider_type: dbUser.provider ? 'social' : 'email'
    };
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/users - Delete users (batch operation, admin only)
router.delete('/users', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = deleteUsersRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        validationResult.error.errors[0]?.message || 'Invalid input',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { userIds } = validationResult.data;
    
    const db = authService.getDb();
    const placeholders = userIds.map(() => '?').join(',');
    
    await db.prepare(
      `DELETE FROM _user WHERE id IN (${placeholders})`
    ).run(...userIds);
    
    const response: DeleteUsersResponse = {
      message: 'Users deleted successfully',
      deletedCount: userIds.length
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// OAuth endpoints following naming convention: /oauth/:provider and /oauth/:provider/callback
router.get('/oauth/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { redirectUrl } = req.query;
    
    const state = redirectUrl ? Buffer.from(JSON.stringify({
      provider: 'google',
      redirectUrl: redirectUrl as string
    })).toString('base64') : undefined;
    
    const authUrl = await authService.generateGoogleAuthUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    logger.error('Google OAuth error', { error });
    next(new AppError(
      'Google OAuth is not properly configured. Please check environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI',
      500,
      ERROR_CODES.AUTH_OAUTH_CONFIG_ERROR
    ));
  }
});

router.get('/oauth/github', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { redirectUrl } = req.query;
    
    const state = redirectUrl ? Buffer.from(JSON.stringify({
      provider: 'github',
      redirectUrl: redirectUrl as string
    })).toString('base64') : undefined;
    
    const authUrl = await authService.generateGitHubAuthUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    logger.error('GitHub OAuth error', { error });
    next(new AppError(
      'GitHub OAuth is not properly configured. Please check environment variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI',
      500,
      ERROR_CODES.AUTH_OAUTH_CONFIG_ERROR
    ));
  }
});

router.get('/oauth/:provider/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const { code, state, token } = req.query;
    
    let redirectUrl = '/';
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        redirectUrl = stateData.redirectUrl || '/';
      } catch {
        // Invalid state
      }
    }
    
    if (!['google', 'github'].includes(provider)) {
      throw new AppError('Invalid provider', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    let result;
    
    if (provider === 'google') {
      let id_token: string;
      
      if (token) {
        id_token = token as string;
      } else if (code) {
        const tokens = await authService.exchangeCodeToTokenByGoogle(code as string);
        id_token = tokens.id_token;
      } else {
        throw new AppError('No authorization code or token provided', 400, ERROR_CODES.INVALID_INPUT);
      }
      
      const googleUserInfo = await authService.verifyGoogleToken(id_token);
      result = await authService.findOrCreateGoogleUser(googleUserInfo);
      
    } else if (provider === 'github') {
      if (!code) {
        throw new AppError('No authorization code provided', 400, ERROR_CODES.INVALID_INPUT);
      }
      
      const accessToken = await authService.exchangeGitHubCodeForToken(code as string);
      const githubUserInfo = await authService.getGitHubUserInfo(accessToken);
      result = await authService.findOrCreateGitHubUser(githubUserInfo);
    }
    
    const params = new URLSearchParams({
      accessToken: result!.accessToken,
      user_id: result!.user.id,
      email: result!.user.email,
      name: result!.user.name || ''
    });
    
    const separator = redirectUrl.includes('?') ? '&' : '?';
    res.redirect(`${redirectUrl}${separator}${params.toString()}`);
    
  } catch (error) {
    logger.error('OAuth callback error', { error });
    next(error);
  }
});

export default router;