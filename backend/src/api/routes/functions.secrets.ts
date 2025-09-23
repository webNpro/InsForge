import { Router, Response, NextFunction } from 'express';
import { FunctionSecretsService } from '@/core/secrets/function-secrets.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { AuditService } from '@/core/logs/audit.js';

const router = Router();
const functionSecretsService = new FunctionSecretsService();
const auditService = AuditService.getInstance();

// List all function secrets (keys only, no values)
router.get('/', verifyAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const secrets = await functionSecretsService.listSecrets();
    res.json({ secrets });
  } catch (error) {
    next(error);
  }
});

// Create or update a function secret
router.post('/', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const result = await functionSecretsService.setSecret(key, value);
    
    // Log audit at router level
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'SET_FUNCTION_SECRET',
      module: 'FUNCTIONS',
      details: { key },
      ip_address: req.ip,
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete a function secret
router.delete('/:key', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const result = await functionSecretsService.deleteSecret(key);
    
    // Log audit at router level
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'DELETE_FUNCTION_SECRET',
      module: 'FUNCTIONS',
      details: { key },
      ip_address: req.ip,
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;