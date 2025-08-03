import { AuthService } from '@/core/auth/auth.js';
import { DatabaseManager } from '@/core/database/database.js';
import logger from '@/utils/logger.js';

export async function seedAdmin() {
  const authService = AuthService.getInstance();
  const dbManager = DatabaseManager.getInstance();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-this-password';

  try {
    let superUser = await authService.getSuperUserByEmail(adminEmail);
    if (!superUser) {
      superUser = await authService.createSuperUser(adminEmail, adminPassword, 'Admin');
      logger.info('Insforge Backend Starting');
      logger.info('Admin account created', { email: adminEmail });
    } else {
      logger.info('Insforge Backend Starting');
      logger.info('Admin account exists', { email: adminEmail });
    }

    // Initialize or get the single API key
    const apiKey = await authService.initializeApiKey();

    // Get database stats
    const tableCount = await dbManager.getUserTableCount();

    logger.info('Database connected to PostgreSQL', {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || '5432',
      database: process.env.POSTGRES_DB || 'insforge',
    });
    if (tableCount > 0) {
      logger.info('Found user tables', { count: tableCount });
    }
    logger.info('API key generated', { apiKey });
    logger.info('Setup complete', {
      message: 'Save this API key for your apps!',
      dashboard: 'http://localhost:7131',
      api: 'http://localhost:7130/api',
    });
  } catch (error) {
    logger.error('Error during setup', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
