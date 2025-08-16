import { Router } from 'express';
import { DatabaseManager } from '@/core/database/database.js';
import { verifyApiKey, verifyCloudBackend } from '@/api/middleware/auth.js';

export const usageRouter = Router();

// Create MCP tool usage record
usageRouter.post('/mcp', verifyApiKey, async (req, res, next) => {
  try {
    const { tool_name, success = true } = req.body;
    
    if (!tool_name) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: 'tool_name is required' 
      });
    }

    const dbManager = DatabaseManager.getInstance();
    await dbManager.trackMcpUsage(tool_name, success);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get MCP usage statistics within date range (called by cloud backend)
usageRouter.get('/mcp/stats', verifyCloudBackend, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: 'start_date and end_date are required' 
      });
    }
    
    const dbManager = DatabaseManager.getInstance();
    const count = await dbManager.getMcpUsageCount(
      new Date(start_date as string),
      new Date(end_date as string)
    );
    
    res.json({ count });
  } catch (error) {
    next(error);
  }
});