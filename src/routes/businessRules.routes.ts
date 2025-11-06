import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/business-rules
 * Get business rules for a project
 */
router.get('/projects/:projectId/business-rules', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('business_rules')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      businessRules: data?.config || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/business-rules
 * Save business rules for a project
 */
router.post('/projects/:projectId/business-rules', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { businessRules } = req.body;

    // Upsert (update if exists, insert if not)
    const { data, error } = await req.supabase!
      .from('business_rules')
      .upsert({
        project_id: projectId,
        config: businessRules,
        apply_to_all_project: businessRules.applyToAllProjects || false,
        specific_modules: businessRules.specificModules || []
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      businessRules: data.config
    });
  } catch (error) {
    next(error);
  }
});

export default router;

