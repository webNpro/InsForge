import { Router } from 'express';
import { verifyUserOrApiKey } from '@/api/middleware/auth.js';
import { DatabaseController } from '@/controllers/DatabaseController.js';

const router = Router();
const databaseController = new DatabaseController();

// Apply authentication to all routes
router.use(verifyUserOrApiKey);

// Forward all database operations to PostgREST
router.all('/:tablename', databaseController.forwardToPostgrest);
router.all('/:tablename/*', databaseController.forwardToPostgrest);

export { router as databaseRouter };
