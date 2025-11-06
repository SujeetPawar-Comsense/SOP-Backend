import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/documents
 */
router.get('/projects/:projectId/documents', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      documents: data?.documents || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/documents
 */
router.post('/projects/:projectId/documents', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { documents } = req.body;

    const { data, error } = await req.supabase!
      .from('documents')
      .upsert({
        project_id: projectId,
        documents
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      documents: data.documents
    });
  } catch (error) {
    next(error);
  }
});

export default router;

