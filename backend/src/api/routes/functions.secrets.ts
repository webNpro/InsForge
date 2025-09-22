import { Router, Response, NextFunction } from 'express';
import { FunctionSecretsService } from '@/core/secrets/function-secrets.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';

const router = Router();
const functionSecretsService = new FunctionSecretsService();

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
    const result = await functionSecretsService.setSecret(key, value, req.user?.email, req.ip);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Delete a function secret
router.delete('/:key', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const result = await functionSecretsService.deleteSecret(key, req.user?.email, req.ip);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;