import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/project-information
 * Get project information (vision, objectives, requirements)
 */
router.get('/projects/:projectId/project-information', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await req.supabase!
      .from('project_information')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 400);
    }

    // Transform database format to frontend format
    const projectInfo = data ? {
      vision: data.vision || '',
      purpose: data.purpose || '',
      objectives: data.objectives || '',
      projectScope: data.project_scope || '',
      functionalRequirements: data.functional_requirements || '',
      nonFunctionalRequirements: data.non_functional_requirements || '',
      integrationRequirements: data.integration_requirements || '',
      reportingRequirements: data.reporting_requirements || ''
    } : null;

    res.json({
      success: true,
      projectInformation: projectInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/project-information
 * Save/update project information
 */
router.post('/projects/:projectId/project-information', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const projectInfo = req.body;

    // Transform frontend format to database format
    const { data, error } = await req.supabase!
      .from('project_information')
      .upsert({
        project_id: projectId,
        vision: projectInfo.vision || null,
        purpose: projectInfo.purpose || null,
        objectives: projectInfo.objectives || null,
        project_scope: projectInfo.projectScope || null,
        functional_requirements: projectInfo.functionalRequirements || null,
        non_functional_requirements: projectInfo.nonFunctionalRequirements || null,
        integration_requirements: projectInfo.integrationRequirements || null,
        reporting_requirements: projectInfo.reportingRequirements || null
      })
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      projectInformation: data
    });
  } catch (error) {
    next(error);
  }
});

export default router;

