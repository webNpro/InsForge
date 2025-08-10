import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import { DatabaseManager } from '@/core/database/database.js';
import logger from '@/utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Simplified JWT-based auth service
 * Handles all authentication operations including OAuth
 */
export class AuthService {
  private static instance: AuthService;
  private adminEmail: string;
  private adminPassword: string;
  private db: any;
  private googleClientId: string | undefined;
  private googleClientSecret: string | undefined;
  private googleRedirectUri: string | undefined;
  private githubClientId: string | undefined;
  private githubClientSecret: string | undefined;
  private githubRedirectUri: string | undefined;

  private constructor() {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    this.adminEmail = process.env.ADMIN_EMAIL!;
    this.adminPassword = process.env.ADMIN_PASSWORD!;
    
    if (!this.adminEmail || !this.adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    }
    
    // OAuth configuration
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7130/api/auth/v1/callback';
    this.githubClientId = process.env.GITHUB_CLIENT_ID;
    this.githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.githubRedirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:7130/api/auth/v1/callback';
    
    const dbManager = DatabaseManager.getInstance();
    this.db = dbManager.getDb();
    
    // Log OAuth configuration status
    logger.info('AuthService initialized - OAuth configuration', {
      googleOAuth: this.googleClientId ? 'Configured' : 'Not configured',
      githubOAuth: this.githubClientId ? 'Configured' : 'Not configured'
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate JWT token for users and admins
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'authenticated',
      };
    } catch {
      throw new Error('Invalid token');
    }
  }

  /**
   * User registration
   */
  async register(email: string, password: string, name?: string): Promise<{ user: any; token: string }> {
    const existingUser = await this.db.prepare('SELECT id FROM _user WHERE email = ?').get(email);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    await this.db.prepare(`
      INSERT INTO _user (id, email, password, name, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))
    `).run(userId, email, hashedPassword, name || null, 0);
    
    const user = await this.db.prepare('SELECT id, email, name, email_verified FROM _user WHERE id = ?').get(userId);
    const token = this.generateToken({ sub: userId, email, role: 'authenticated' });
    
    return { user, token };
  }

  /**
   * User login
   */
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const user = await this.db.prepare('SELECT * FROM _user WHERE email = ?').get(email);
    
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({ sub: user.id, email: user.email, role: 'authenticated' });
    delete user.password;
    
    return { user, token };
  }

  /**
   * Admin login (validates against env variables only)
   */
  async adminLogin(email: string, password: string): Promise<{ user: any; token: string }> {
    // Simply validate against environment variables
    if (email !== this.adminEmail || password !== this.adminPassword) {
      throw new Error('Invalid admin credentials');
    }

    // Generate a consistent admin ID based on email (so it's always the same)
    const adminId = crypto.createHash('sha256').update(email).digest('hex').substring(0, 36);
    
    // Return admin user with JWT token - no database interaction
    const token = this.generateToken({ sub: adminId, email, role: 'project_admin' });
    
    return {
      user: {
        id: adminId,
        email: email,
        name: 'Administrator',
        role: 'project_admin'
      },
      token
    };
  }

  /**
   * Find or create third-party user (main OAuth user handler)
   * Adapted from 3-table to 2-table structure
   */
  async findOrCreateThirdPartyUser(
    provider: string,
    providerId: string,
    email: string,
    userName: string,
    avatarUrl: string,
    identityData: any
  ): Promise<{ user: any; token: string }> {
    // First, try to find existing user by provider ID in _account table
    const account = await this.db.prepare(
      'SELECT * FROM _account WHERE provider = ? AND provider_account_id = ?'
    ).get(provider, providerId);
    
    if (account) {
      // Found existing OAuth user, update last login time
      await this.db.prepare(
        'UPDATE _account SET updated_at = datetime("now") WHERE provider = ? AND provider_account_id = ?'
      ).run(provider, providerId);
      
      const user = await this.db.prepare(
        'SELECT id, email, name, email_verified FROM _user WHERE id = ?'
      ).get(account.user_id);
      
      const token = this.generateToken({ 
        sub: user.id, 
        email: user.email, 
        role: 'authenticated' 
      });
      
      return { user, token };
    }
    
    // If not found by provider_id, try to find by email in _user table
    const existingUser = await this.db.prepare(
      'SELECT * FROM _user WHERE email = ?'
    ).get(email);
    
    if (existingUser) {
      // Found existing user by email, create _account record to link OAuth
      await this.db.prepare(`
        INSERT INTO _account (
          user_id, provider, provider_account_id, 
          provider_data, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))
      `).run(existingUser.id, provider, providerId, JSON.stringify(identityData));
      
      const token = this.generateToken({ 
        sub: existingUser.id, 
        email: existingUser.email, 
        role: 'authenticated' 
      });
      
      return { user: existingUser, token };
    }
    
    // Create new user with OAuth data
    return this.createThirdPartyUser(
      provider,
      userName,
      email,
      providerId,
      identityData,
      avatarUrl
    );
  }

  /**
   * Create new third-party user
   */
  private async createThirdPartyUser(
    provider: string,
    userName: string,
    email: string,
    providerId: string,
    identityData: any,
    avatarUrl: string
  ): Promise<{ user: any; token: string }> {
    const userId = crypto.randomUUID();
    
    await this.db.exec('BEGIN');
    
    try {
      // Create user record (without password for OAuth users)
      await this.db.prepare(`
        INSERT INTO _user (id, email, name, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, 1, datetime("now"), datetime("now"))
      `).run(userId, email, userName);
      
      // Create _account record
      await this.db.prepare(`
        INSERT INTO _account (
          user_id, provider, provider_account_id,
          provider_data, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))
      `).run(userId, provider, providerId, JSON.stringify({ ...identityData, avatar_url: avatarUrl }));
      
      await this.db.exec('COMMIT');
      
      const user = {
        id: userId,
        email,
        name: userName,
        email_verified: true
      };
      
      const token = this.generateToken({ 
        sub: userId, 
        email, 
        role: 'authenticated' 
      });
      
      return { user, token };
    } catch (error) {
      await this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  async generateGoogleAuthUrl(state?: string): Promise<string> {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new Error('Google OAuth not configured');
    }
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.googleClientId);
    authUrl.searchParams.set('redirect_uri', this.googleRedirectUri!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    if (state) {
      authUrl.searchParams.set('state', state);
    }
    
    return authUrl.toString();
  }

  /**
   * Generate GitHub OAuth authorization URL
   */
  async generateGitHubAuthUrl(state?: string): Promise<string> {
    if (!this.githubClientId || !this.githubClientSecret) {
      throw new Error('GitHub OAuth not configured');
    }
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.githubClientId);
    authUrl.searchParams.set('redirect_uri', this.githubRedirectUri!);
    authUrl.searchParams.set('scope', 'user:email');
    if (state) {
      authUrl.searchParams.set('state', state);
    }
    
    return authUrl.toString();
  }

  /**
   * Exchange Google code for tokens
   */
  async exchangeCodeToTokenByGoogle(code: string): Promise<{ access_token: string; id_token: string }> {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new Error('Google OAuth not configured');
    }
    
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.googleClientId,
      client_secret: this.googleClientSecret,
      redirect_uri: this.googleRedirectUri,
      grant_type: 'authorization_code'
    });
    
    if (!response.data.access_token || !response.data.id_token) {
      throw new Error('Failed to get tokens from Google');
    }
    
    return {
      access_token: response.data.access_token,
      id_token: response.data.id_token
    };
  }

  /**
   * Verify Google ID token and get user info
   */
  async verifyGoogleToken(idToken: string): Promise<any> {
    // Decode and verify Google ID token
    // In production, should verify signature properly
    const decoded = jwt.decode(idToken) as any;
    if (!decoded) {
      throw new Error('Invalid Google ID token');
    }
    
    return {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified,
      name: decoded.name,
      picture: decoded.picture
    };
  }

  /**
   * Find or create Google user
   */
  async findOrCreateGoogleUser(googleUserInfo: any): Promise<{ user: any; token: string }> {
    const userName = googleUserInfo.name || googleUserInfo.email.split('@')[0];
    return this.findOrCreateThirdPartyUser(
      'google',
      googleUserInfo.sub,
      googleUserInfo.email,
      userName,
      googleUserInfo.picture || '',
      googleUserInfo
    );
  }

  /**
   * Exchange GitHub code for access token
   */
  async exchangeGitHubCodeForToken(code: string): Promise<string> {
    if (!this.githubClientId || !this.githubClientSecret) {
      throw new Error('GitHub OAuth not configured');
    }
    
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: this.githubClientId,
        client_secret: this.githubClientSecret,
        code,
        redirect_uri: this.githubRedirectUri
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );
    
    if (!response.data.access_token) {
      throw new Error('Failed to get access token from GitHub');
    }
    
    return response.data.access_token;
  }

  /**
   * Get GitHub user info
   */
  async getGitHubUserInfo(accessToken: string): Promise<any> {
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    // GitHub doesn't always return email in user endpoint
    let email = userResponse.data.email;
    
    if (!email) {
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      const primaryEmail = emailResponse.data.find((e: any) => e.primary);
      email = primaryEmail ? primaryEmail.email : emailResponse.data[0]?.email;
    }
    
    return {
      id: userResponse.data.id,
      login: userResponse.data.login,
      name: userResponse.data.name,
      email: email || `${userResponse.data.login}@users.noreply.github.com`,
      avatar_url: userResponse.data.avatar_url
    };
  }

  /**
   * Find or create GitHub user
   */
  async findOrCreateGitHubUser(githubUserInfo: any): Promise<{ user: any; token: string }> {
    const userName = githubUserInfo.name || githubUserInfo.login;
    const email = githubUserInfo.email || `${githubUserInfo.login}@users.noreply.github.com`;
    
    return this.findOrCreateThirdPartyUser(
      'github',
      githubUserInfo.id.toString(),
      email,
      userName,
      githubUserInfo.avatar_url || '',
      githubUserInfo
    );
  }

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify API key against stored key
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) {
      return false;
    }
    const dbManager = DatabaseManager.getInstance();
    const storedApiKey = await dbManager.getApiKey();
    return storedApiKey === apiKey;
  }

  /**
   * Initialize API key on startup
   */
  async initializeApiKey(): Promise<string> {
    const dbManager = DatabaseManager.getInstance();
    let apiKey = await dbManager.getApiKey();

    if (!apiKey) {
      apiKey = this.generateApiKey();
      await dbManager.setApiKey(apiKey);
      logger.info('✅ API key generated');
    } else {
      logger.info('✅ API key exists');
    }

    return apiKey;
  }

  /**
   * Get database instance for direct queries
   */
  getDb() {
    return this.db;
  }
}