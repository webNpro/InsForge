import { Router } from 'express';
import { verifyUserOrApiKey } from '../middleware/auth.js';
import { TablesController } from '../../controllers/TablesController.js';

const router = Router();
const tablesController = new TablesController();

// All table routes accept either JWT token or API key authentication
router.use(verifyUserOrApiKey);

// Table management routes
router.get('/', tablesController.listTables);
router.post('/', tablesController.createTable);
router.get('/:table/schema', tablesController.getTableSchema);
router.patch('/:table', tablesController.updateTableSchema);
router.delete('/:table', tablesController.deleteTable);

export { router as tablesRouter };
