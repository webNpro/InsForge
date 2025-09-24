import { Router, Response, NextFunction } from 'express';
import { SecretsService } from '@/core/secrets/secrets.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { AuditService } from '@/core/logs/audit.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';

const router = Router();
const secretsService = new SecretsService();
const auditService = AuditService.getInstance();

/**
 * List all secrets (metadata only, no values)
 * GET /api/secrets
 */
router.get('/', verifyAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const secrets = await secretsService.listSecrets();
    res.json({ secrets });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific secret value by name
 * GET /api/secrets/:name
 */
router.get('/:name', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const value = await secretsService.getSecretByName(name);
    
    if (value === null) {
      throw new AppError(`Secret not found: ${name}`, 404, ERROR_CODES.NOT_FOUND);
    }
    
    // Log audit
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'GET_SECRET',
      module: 'SECRETS',
      details: { name },
      ip_address: req.ip,
    });
    
    res.json({ name, value });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new secret
 * POST /api/secrets
 */
router.post('/', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, value, expiresAt } = req.body;
    
    // Validate input
    if (!name || !value) {
      throw new AppError('Both name and value are required', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    // Validate name format (uppercase alphanumeric with underscores only)
    if (!/^[A-Z0-9_]+$/.test(name)) {
      throw new AppError(
        'Invalid name format. Use uppercase letters, numbers, and underscores only (e.g., STRIPE_API_KEY)',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    // Check if secret already exists
    const existing = await secretsService.getSecretByName(name);
    if (existing !== null) {
      throw new AppError(`Secret already exists: ${name}`, 409, ERROR_CODES.INVALID_INPUT);
    }
    
    const result = await secretsService.createSecret({
      name,
      value,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    
    // Log audit
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'CREATE_SECRET',
      module: 'SECRETS',
      details: { name, id: result.id },
      ip_address: req.ip,
    });
    
    res.status(201).json({
      success: true,
      message: `Secret ${name} has been created successfully`,
      id: result.id
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update an existing secret
 * PUT /api/secrets/:name
 */
router.put('/:name', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { value, isActive, expiresAt } = req.body;
    
    // Get existing secret
    const secrets = await secretsService.listSecrets();
    const secret = secrets.find(s => s.name === name);
    
    if (!secret) {
      throw new AppError(`Secret not found: ${name}`, 404, ERROR_CODES.NOT_FOUND);
    }
    
    const success = await secretsService.updateSecret(secret.id, {
      value,
      isActive,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined
    });
    
    if (!success) {
      throw new AppError(`Failed to update secret: ${name}`, 500, ERROR_CODES.INTERNAL_ERROR);
    }
    
    // Log audit
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'UPDATE_SECRET',
      module: 'SECRETS',
      details: { name, updates: { hasNewValue: !!value, isActive, expiresAt } },
      ip_address: req.ip,
    });
    
    res.json({
      success: true,
      message: `Secret ${name} has been updated successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a secret (mark as inactive)
 * DELETE /api/secrets/:name
 */
router.delete('/:name', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    
    // Get existing secret
    const secrets = await secretsService.listSecrets();
    const secret = secrets.find(s => s.name === name);
    
    if (!secret) {
      throw new AppError(`Secret not found: ${name}`, 404, ERROR_CODES.NOT_FOUND);
    }
    
    // Mark as inactive instead of hard delete
    const success = await secretsService.updateSecret(secret.id, { isActive: false });
    
    if (!success) {
      throw new AppError(`Failed to delete secret: ${name}`, 500, ERROR_CODES.INTERNAL_ERROR);
    }
    
    // Log audit
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'DELETE_SECRET',
      module: 'SECRETS',
      details: { name },
      ip_address: req.ip,
    });
    
    res.json({
      success: true,
      message: `Secret ${name} has been deleted successfully`
    });
  } catch (error) {
    next(error);
  }
});

export default router;