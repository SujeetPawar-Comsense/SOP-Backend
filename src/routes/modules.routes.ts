import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/modules
 * Get all modules for a project
 */
router.get('/projects/:projectId/modules', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data: modules, error } = await req.supabase!
      .from('modules')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformedModules = (modules || []).map(module => ({
      id: module.id,
      moduleName: module.module_name,
      description: module.description,
      priority: module.priority,
      businessImpact: module.business_impact,
      dependencies: module.dependencies,
      status: module.status,
      createdAt: module.created_at,
      updatedAt: module.updated_at
    }));

    res.json({
      success: true,
      modules: transformedModules
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/modules
 * Save modules for a project (bulk operation)
 */
router.post(
  '/projects/:projectId/modules',
  [
    param('projectId').isUUID(),
    body('modules').isArray()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { projectId } = req.params;
      const { modules } = req.body;

      // Transform camelCase to snake_case for database
      const transformedModules = modules.map((module: any) => ({
        id: module.id, // Preserve the ID
        project_id: projectId,
        module_name: module.moduleName,
        description: module.description,
        priority: module.priority,
        business_impact: module.businessImpact,
        dependencies: module.dependencies,
        status: module.status
      }));

      // Use upsert to handle both new and existing modules
      const { data, error } = await req.supabase!
        .from('modules')
        .upsert(transformedModules, { onConflict: 'id' })
        .select();

      if (error) {
        throw new AppError(error.message, 400);
      }

      // Transform back to camelCase for response
      const responseModules = (data || []).map(module => ({
        id: module.id,
        moduleName: module.module_name,
        description: module.description,
        priority: module.priority,
        businessImpact: module.business_impact,
        dependencies: module.dependencies,
        status: module.status
      }));

      res.json({
        success: true,
        modules: responseModules
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

