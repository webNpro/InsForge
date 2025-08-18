/**
 * Environment utility functions for checking runtime environment
 */

/**
 * Check if the application is running in a cloud environment
 * Currently checks for AWS instance profile, but can be extended for other cloud providers
 */
export function isCloudEnvironment(): boolean {
  return !!(
    process.env.AWS_INSTANCE_PROFILE_NAME &&
    process.env.AWS_INSTANCE_PROFILE_NAME.trim().length > 0
  );
}

/**
 * Check if the application should use shared OAuth keys
 * This is typically enabled in cloud environments to avoid storing secrets
 */
export function shouldUseSharedOAuthKeys(): boolean {
  return isCloudEnvironment();
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}