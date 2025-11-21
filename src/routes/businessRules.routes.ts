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
 * Create business rules for a project (initial creation only)
 */
router.post('/projects/:projectId/business-rules', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { businessRules } = req.body;

    // Insert new record
    const { data, error } = await req.supabase!
      .from('business_rules')
      .insert({
        project_id: projectId,
        config: businessRules,
        apply_to_all_project: businessRules.applyToAllProjects || false,
        specific_modules: businessRules.specificModules || []
      })
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, suggest using PUT instead
      if (error.code === '23505') {
        throw new AppError('Business rules already exist for this project. Use PUT to update.', 409);
      }
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

/**
 * PUT /api/projects/:projectId/business-rules
 * Update business rules for a project
 */
router.put('/projects/:projectId/business-rules', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { businessRules } = req.body;

    // Update existing record
    const { data, error } = await req.supabase!
      .from('business_rules')
      .update({
        config: businessRules,
        apply_to_all_project: businessRules.applyToAllProjects || false,
        specific_modules: businessRules.specificModules || [],
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      // If no record found to update, suggest using POST instead
      if (error.code === 'PGRST116') {
        throw new AppError('Business rules not found for this project. Use POST to create.', 404);
      }
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

