import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/features
 * Get all features for a project
 */
router.get('/projects/:projectId/features', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data: features, error } = await req.supabase!
      .from('features')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      features: features || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/features
 * Save features for a project
 */
router.post('/projects/:projectId/features', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { features } = req.body;

    // Delete existing
    await req.supabase!
      .from('features')
      .delete()
      .eq('project_id', projectId);

    // Insert new
    const featuresWithProjectId = features.map((feature: any) => ({
      ...feature,
      project_id: projectId
    }));

    const { data, error } = await req.supabase!
      .from('features')
      .insert(featuresWithProjectId)
      .select();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      features: data
    });
  } catch (error) {
    next(error);
  }
});

export default router;

