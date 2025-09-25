import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, verifyAdmin } from '@/api/middleware/auth.js';
import { DatabaseManager } from '@/core/database/manager.js';
import { AuditService } from '@/core/logs/audit.js';
import { DatabaseError } from 'pg';
import logger from '@/utils/logger.js';

const router = Router();
const db = DatabaseManager.getInstance();
const auditService = AuditService.getInstance();

// Schema for function upload
const functionUploadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Invalid slug format - must be alphanumeric with hyphens or underscores only'
    )
    .optional(),
  code: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active']).optional().default('active'),
});

// Schema for function update
const functionUpdateSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'error']).optional(),
});

/**
 * GET /api/functions
 * List all edge functions
 */
router.get('/', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const functions = await db
      .prepare(
        `SELECT 
          id, slug, name, description, status, 
          created_at, updated_at, deployed_at
        FROM _functions
        ORDER BY created_at DESC`
      )
      .all();

    res.json(functions);
  } catch (error) {
    logger.error('Failed to list functions', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'listFunctions',
    });
    res.status(500).json({ error: 'Failed to list functions' });
  }
});

/**
 * GET /api/functions/:slug
 * Get specific function details including code
 */
router.get('/:slug', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const func = await db
      .prepare(
        `
      SELECT 
        id, slug, name, description, code, status,
        created_at, updated_at, deployed_at
      FROM _functions
      WHERE slug = ?
    `
      )
      .get(slug);

    if (!func) {
      return res.status(404).json({ error: 'Function not found' });
    }

    res.json(func);
  } catch (error) {
    logger.error('Failed to get function', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'getFunction',
      slug: req.params.slug,
    });
    res.status(500).json({ error: 'Failed to get function' });
  }
});

/**
 * POST /api/functions
 * Create a new function
 */
router.post('/', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const validation = functionUploadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
    }

    const { name, code, description, status } = validation.data;
    const slug = validation.data.slug || name.toLowerCase().replace(/\s+/g, '-');

    // Basic security validation
    const dangerousPatterns = [
      /Deno\.run/i,
      /Deno\.spawn/i,
      /Deno\.Command/i,
      /child_process/i,
      /process\.exit/i,
      /require\(['"]fs['"]\)/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return res.status(400).json({
          error: 'Code contains potentially dangerous patterns',
          pattern: pattern.toString(),
        });
      }
    }

    // Generate UUID
    const id = crypto.randomUUID();

    // Insert function
    await db
      .prepare(
        `
      INSERT INTO _functions (id, slug, name, description, code, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, slug, name, description || null, code, status);

    // If status is active, update deployed_at
    if (status === 'active') {
      await db
        .prepare(
          `
        UPDATE _functions SET deployed_at = CURRENT_TIMESTAMP WHERE id = ?
      `
        )
        .run(id);
    }

    // Fetch the created function
    const created = await db
      .prepare(
        `
      SELECT id, slug, name, description, status, created_at
      FROM _functions WHERE id = ?
    `
      )
      .get(id);

    // Log function creation for audit purposes, this is required before finishing serverless function completely
    logger.info(`Function ${name} (${slug}) created by ${req.user?.email}`);

    // Log audit for function creation
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'CREATE_FUNCTION',
      module: 'FUNCTIONS',
      details: {
        functionId: id,
        slug,
        name,
        status,
      },
      ip_address: req.ip,
    });

    res.status(201).json({
      success: true,
      function: created,
    });
  } catch (error) {
    logger.error('Failed to create function', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'createFunction',
    });

    // PostgreSQL unique constraint error
    if (error instanceof DatabaseError && error.code === '23505') {
      return res.status(409).json({
        error: 'Function with this slug already exists',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create function',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * PUT /api/functions/:slug
 * Update an existing function
 */
router.put('/:slug', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const validation = functionUpdateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
    }

    const updates = validation.data;

    // Check if function exists
    const existing = await db.prepare('SELECT id FROM _functions WHERE slug = ?').get(slug);
    if (!existing) {
      return res.status(404).json({ error: 'Function not found' });
    }

    // Update fields
    if (updates.name !== undefined) {
      await db.prepare('UPDATE _functions SET name = ? WHERE slug = ?').run(updates.name, slug);
    }

    if (updates.description !== undefined) {
      await db
        .prepare('UPDATE _functions SET description = ? WHERE slug = ?')
        .run(updates.description, slug);
    }

    if (updates.code !== undefined) {
      await db.prepare('UPDATE _functions SET code = ? WHERE slug = ?').run(updates.code, slug);
    }

    if (updates.status !== undefined) {
      await db.prepare('UPDATE _functions SET status = ? WHERE slug = ?').run(updates.status, slug);

      // Update deployed_at if status changes to active
      if (updates.status === 'active') {
        await db
          .prepare('UPDATE _functions SET deployed_at = CURRENT_TIMESTAMP WHERE slug = ?')
          .run(slug);
      }
    }

    // Update updated_at
    await db
      .prepare('UPDATE _functions SET updated_at = CURRENT_TIMESTAMP WHERE slug = ?')
      .run(slug);

    // Fetch updated function
    const updated = await db
      .prepare(
        `
      SELECT id, slug, name, description, status, updated_at
      FROM _functions WHERE slug = ?
    `
      )
      .get(slug);

    // Log function update for audit purposes, this is required before finishing serverless function completely
    logger.info(`Function ${slug} updated by ${req.user?.email}`);

    // Log audit for function update
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'UPDATE_FUNCTION',
      module: 'FUNCTIONS',
      details: {
        slug,
        changes: updates,
      },
      ip_address: req.ip,
    });

    res.json({
      success: true,
      function: updated,
    });
  } catch (error) {
    logger.error('Failed to update function', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'updateFunction',
      slug: req.params.slug,
    });
    res.status(500).json({ error: 'Failed to update function' });
  }
});

/**
 * DELETE /api/functions/:slug
 * Delete a function
 */
router.delete('/:slug', verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const result = await db.prepare('DELETE FROM _functions WHERE slug = ?').run(slug);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Function not found' });
    }

    // Log function deletion for audit purposes, this is required before finishing serverless function completely
    logger.info(`Function ${slug} deleted by ${req.user?.email}`);

    // Log audit for function deletion
    await auditService.log({
      actor: req.user?.email || 'api-key',
      action: 'DELETE_FUNCTION',
      module: 'FUNCTIONS',
      details: {
        slug,
      },
      ip_address: req.ip,
    });

    res.json({
      success: true,
      message: `Function ${slug} deleted successfully`,
    });
  } catch (error) {
    logger.error('Failed to delete function', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'deleteFunction',
      slug: req.params.slug,
    });
    res.status(500).json({ error: 'Failed to delete function' });
  }
});

export default router;
