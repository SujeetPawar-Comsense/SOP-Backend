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

    res.json({
      success: true,
      modules: modules || []
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

      // Delete existing modules
      await req.supabase!
        .from('modules')
        .delete()
        .eq('project_id', projectId);

      // Insert new modules
      const modulesWithProjectId = modules.map((module: any) => ({
        ...module,
        project_id: projectId
      }));

      const { data, error } = await req.supabase!
        .from('modules')
        .insert(modulesWithProjectId)
        .select();

      if (error) {
        throw new AppError(error.message, 400);
      }

      res.json({
        success: true,
        modules: data
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

