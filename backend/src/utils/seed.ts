import { DatabaseManager } from '@/core/database/manager.js';
import { AIConfigService } from '@/core/ai/config.js';
import { isCloudEnvironment } from '@/utils/environment.js';
import logger from '@/utils/logger.js';
import { SecretsService } from '@/core/secrets/secrets';

/**
 * Validates admin credentials are configured
 * Admin is authenticated via environment variables, not stored in DB
 */
function ensureFirstAdmin(adminEmail: string, adminPassword: string): void {
  if (adminEmail && adminPassword) {
    logger.info(`✅ Admin configured: ${adminEmail}`);
  } else {
    logger.warn('⚠️ Admin credentials not configured - check ADMIN_EMAIL and ADMIN_PASSWORD');
  }
}

/**
 * Seeds default AI configurations for cloud environments
 */
async function seedDefaultAIConfigs(): Promise<void> {
  // Only seed default AI configs in cloud environment
  if (!isCloudEnvironment()) {
    return;
  }

  const aiConfigService = new AIConfigService();

  // Check if AI configs already exist
  const existingConfigs = await aiConfigService.findAll();

  if (existingConfigs.length > 0) {
    return;
  }

  await aiConfigService.create(
    'text',
    'openrouter',
    'openai/gpt-4o',
    'You are a helpful assistant.'
  );

  await aiConfigService.create('image', 'openrouter', 'google/gemini-2.5-flash-image-preview');

  logger.info('✅ Default AI models configured (cloud environment)');
}

// Create api key, admin user, and default AI configs
export async function seedBackend(): Promise<void> {
  const secretService = new SecretsService();
  const dbManager = DatabaseManager.getInstance();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-this-password';

  try {
    logger.info(`\n🚀 Insforge Backend Starting...`);

    // Validate admin credentials are configured
    ensureFirstAdmin(adminEmail, adminPassword);

    // Initialize API key (from env or generate)
    const apiKey = await secretService.initializeApiKey();

    // Get database stats
    const tableCount = await dbManager.getUserTableCount();

    logger.info(`✅ Database connected to PostgreSQL`, {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || '5432',
      database: process.env.POSTGRES_DB || 'insforge',
    });
    // Database connection info is already logged above

    if (tableCount > 0) {
      logger.info(`✅ Found ${tableCount} user tables`);
    }

    // seed AI configs for cloud environment
    await seedDefaultAIConfigs();

    logger.info(`API key generated: ${apiKey}`);
    logger.info(`Setup complete:
      - Save this API key for your apps!
      - Dashboard: http://localhost:7131
      - API: http://localhost:7130/api
    `);
  } catch (error) {
    logger.error('Error during setup', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
