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

    // Check if project information already exists
    const { data: existingData, error: checkError } = await req.supabase!
      .from('project_information')
      .select('project_id')
      .eq('project_id', projectId)
      .single();
    
    // Record exists if we have data and no error, or if error is not "not found"
    const recordExists = existingData !== null && (!checkError || (checkError as any)?.code !== 'PGRST116');

    // Transform frontend format to database format
    const projectInfoData = {
      project_id: projectId,
      vision: projectInfo.vision || null,
      purpose: projectInfo.purpose || null,
      objectives: projectInfo.objectives || null,
      project_scope: projectInfo.projectScope || null,
      functional_requirements: projectInfo.functionalRequirements || null,
      non_functional_requirements: projectInfo.nonFunctionalRequirements || null,
      integration_requirements: projectInfo.integrationRequirements || null,
      reporting_requirements: projectInfo.reportingRequirements || null
    };

    let data, error;

    if (recordExists) {
      // Update existing record
      const result = await req.supabase!
        .from('project_information')
        .update(projectInfoData)
        .eq('project_id', projectId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new record
      const result = await req.supabase!
        .from('project_information')
        .insert(projectInfoData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Project information save error:', error);
      throw new AppError(error.message || 'Failed to save project information', 400);
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

