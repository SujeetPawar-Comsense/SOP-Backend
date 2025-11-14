import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/actions
 * Get actions/interactions for a project
 */
router.get('/projects/:projectId/actions', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('actions_interactions')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      actions: data?.config || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/actions
 * Save actions/interactions for a project
 */
router.post('/projects/:projectId/actions', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { actions } = req.body;

    // Check if a record already exists for this project
    const { data: existingData, error: checkError } = await req.supabase!
      .from('actions_interactions')
      .select('id')
      .eq('project_id', projectId)
      .single();

    let data, error;

    if (existingData && !checkError) {
      // Update existing record
      const { data: updateData, error: updateError } = await req.supabase!
        .from('actions_interactions')
        .update({
          config: actions,
          apply_to_all_project: actions.applyToAllProjects || false,
          specific_modules: actions.specificModules || [],
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .select()
        .single();

      data = updateData;
      error = updateError;
    } else {
      // Insert new record
      const { data: insertData, error: insertError } = await req.supabase!
        .from('actions_interactions')
        .insert({
          project_id: projectId,
          config: actions,
          apply_to_all_project: actions.applyToAllProjects || false,
          specific_modules: actions.specificModules || []
        })
        .select()
        .single();

      data = insertData;
      error = insertError;
    }

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      actions: data.config
    });
  } catch (error) {
    next(error);
  }
});

export default router;

