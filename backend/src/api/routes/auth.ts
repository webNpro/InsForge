import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '@/core/auth/auth.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { successResponse } from '@/utils/response.js';
import { validateEmail } from '@/utils/validations.js';
import { verifyAdmin } from '@/api/middleware/auth.js';
import logger from '@/utils/logger.js';

const router = Router();
const authService = AuthService.getInstance();

/**
 * User registration
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      throw new AppError(
        'Email and password are required',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    if (!validateEmail(email)) {
      throw new AppError(
        'Invalid email format',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const result = await authService.register(email, password, name);
    
    res.json(successResponse(
      {
        user: result.user,
        accessToken: result.token
      },
      'User registered successfully',
      'You can use this token to access other endpoints (always add it to HTTP Header "Authorization", then send requests). Please keep it safe.'
    ));
  } catch (error) {
    next(error);
  }
});

/**
 * User login
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError(
        'Email and password are required',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const result = await authService.login(email, password);
    
    res.json(successResponse(
      {
        user: result.user,
        accessToken: result.token
      },
      'Login successful',
      'You can use this token to access other endpoints (always add it to HTTP Header "Authorization", then send requests). Please keep it safe.'
    ));
  } catch (error) {
    next(error);
  }
});

/**
 * Admin login
 */
router.post('/admin/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError(
        'Email and password are required',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const result = await authService.adminLogin(email, password);
    
    res.json(successResponse(
      {
        user: result.user,
        accessToken: result.token
      },
      'Admin login successful',
      'You can use this token to access admin endpoints (always add it to HTTP Header "Authorization", then send requests). Please keep it safe.'
    ));
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
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
    
    res.json({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role
      }
    });
  } catch (error) {
    next(new AppError(
      'Invalid token',
      401,
      ERROR_CODES.AUTH_INVALID_CREDENTIALS
    ));
  }
});

/**
 * Get all users (admin only)
 */
router.get('/users', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '10', offset = '0', search } = req.query;
    const db = authService.getDb();
    
    let query = 'SELECT id, email, name, email_verified, created_at, updated_at FROM _user';
    const params: any[] = [];
    
    if (search) {
      query += ' WHERE email LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const users = await db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM _user';
    const countParams: any[] = [];
    if (search) {
      countQuery += ' WHERE email LIKE ? OR name LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const { count } = await db.prepare(countQuery).get(...countParams);
    
    res.json({
      users,
      total: count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get single user (admin only)
 */
router.get('/users/:id', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = authService.getDb();
    
    const user = await db.prepare(
      'SELECT id, email, name, email_verified, created_at, updated_at FROM _user WHERE id = ?'
    ).get(id);
    
    if (!user) {
      throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND);
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete users (admin only)
 */
router.delete('/users', verifyAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('userIds must be a non-empty array', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    const db = authService.getDb();
    const placeholders = userIds.map(() => '?').join(',');
    
    await db.prepare(
      `DELETE FROM _user WHERE id IN (${placeholders})`
    ).run(...userIds);
    
    res.json({ 
      message: 'Users deleted successfully',
      deletedCount: userIds.length 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Google OAuth authorization URL
 */
router.get('/v1/google-auth', async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * Get GitHub OAuth authorization URL
 */
router.get('/v1/github-auth', async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * OAuth callback handler (unified for Google and GitHub)
 */
router.get('/v1/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, token } = req.query;
    
    // Determine provider from state or other means
    let provider: string | undefined;
    let redirectUrl = '/';
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        provider = stateData.provider;
        redirectUrl = stateData.redirectUrl || '/';
      } catch {
        // Invalid state
      }
    }
    
    // If no provider from state, try to determine from referer
    if (!provider) {
      const referer = req.headers.referer;
      if (referer) {
        if (referer.includes('accounts.google.com')) {
          provider = 'google';
        } else if (referer.includes('github.com')) {
          provider = 'github';
        }
      }
    }
    
    // If still no provider, check if we have a token parameter (Google specific)
    if (!provider && token) {
      provider = 'google';
    }
    
    if (!provider) {
      throw new AppError(
        'Callback state is invalid. You can retrieve the auth url with /api/auth/v1/google-auth or /api/auth/v1/github-auth endpoint and try again.',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    let result;
    
    if (provider === 'google') {
      // Handle Google OAuth
      let id_token: string;
      
      if (token) {
        // Direct callback with Google token
        id_token = token as string;
      } else if (code) {
        const tokens = await authService.exchangeCodeToTokenByGoogle(code as string);
        id_token = tokens.id_token;
      } else {
        throw new AppError('No authorization code or token provided', 400, ERROR_CODES.INVALID_INPUT);
      }
      
      // Verify the Google token and get user info
      const googleUserInfo = await authService.verifyGoogleToken(id_token);
      result = await authService.findOrCreateGoogleUser(googleUserInfo);
      
    } else if (provider === 'github') {
      // Handle GitHub OAuth
      if (!code) {
        throw new AppError('No authorization code provided', 400, ERROR_CODES.INVALID_INPUT);
      }
      
      const accessToken = await authService.exchangeGitHubCodeForToken(code as string);
      const githubUserInfo = await authService.getGitHubUserInfo(accessToken);
      result = await authService.findOrCreateGitHubUser(githubUserInfo);
      
    } else {
      throw new AppError('Invalid provider', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    // Redirect to client with token and user info
    const params = new URLSearchParams({
      accessToken: result.token,
      user_id: result.user.id,
      email: result.user.email,
      name: result.user.name || ''
    });
    
    const separator = redirectUrl.includes('?') ? '&' : '?';
    res.redirect(`${redirectUrl}${separator}${params.toString()}`);
    
  } catch (error) {
    logger.error('OAuth callback error', { error });
    next(error);
  }
});

export default router;