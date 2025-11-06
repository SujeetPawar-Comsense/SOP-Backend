import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/uiux
 * Get UI/UX guidelines for a project
 */
router.get('/projects/:projectId/uiux', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('uiux_guidelines')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      guidelines: data?.guidelines || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/uiux
 * Save UI/UX guidelines for a project
 */
router.post('/projects/:projectId/uiux', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { guidelines } = req.body;

    const { data, error } = await req.supabase!
      .from('uiux_guidelines')
      .upsert({
        project_id: projectId,
        guidelines
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      guidelines: data.guidelines
    });
  } catch (error) {
    next(error);
  }
});

export default router;

