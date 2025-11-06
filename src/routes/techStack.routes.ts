import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/tech-stack
 */
router.get('/projects/:projectId/tech-stack', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('tech_stack')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      techStack: data?.tech_stack || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/tech-stack
 */
router.post('/projects/:projectId/tech-stack', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { techStack } = req.body;

    const { data, error } = await req.supabase!
      .from('tech_stack')
      .upsert({
        project_id: projectId,
        tech_stack: techStack
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      techStack: data.tech_stack
    });
  } catch (error) {
    next(error);
  }
});

export default router;

