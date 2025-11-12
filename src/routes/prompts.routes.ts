import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateContextualPrompt, isOpenAIConfigured } from '../services/openai.service';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/vibe-prompts
 * Get all Vibe Engineer prompts for a project (generated using STRUCT_TO_PROMPT)
 */
router.get('/projects/:projectId/vibe-prompts', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data: prompts, error } = await req.supabase!
      .from('ai_prompts')
      .select('*')
      .eq('project_id', projectId)
      .like('prompt_type', 'vibe_%')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    // Group prompts by development type
    const groupedPrompts = prompts?.reduce((acc: any, prompt: any) => {
      const devType = prompt.context?.developmentType || 'Unknown';
      if (!acc[devType]) acc[devType] = [];
      acc[devType].push(prompt);
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      prompts: groupedPrompts,
      totalCount: prompts?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:projectId/prompts
 * Get all AI prompts for a project
 */
router.get('/projects/:projectId/prompts', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data: prompts, error } = await req.supabase!
      .from('ai_prompts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      prompts: prompts || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/generate
 * Generate a new AI prompt for a project
 */
router.post(
  '/generate',
  [
    body('projectId').isUUID(),
    body('developmentType').notEmpty().withMessage('Development type is required (e.g., Frontend, Backend API, Database Schema)'),
    body('previousOutputs').optional().isArray(),
    body('context').optional()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, developmentType, previousOutputs = [], context } = req.body;

      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI API is not configured. Set OPENAI_API_KEY in .env', 500);
      }

      // Fetch project data
      const [projectRes, modulesRes, userStoriesRes, featuresRes, projectInfoRes, businessRulesRes, techStackRes, uiuxRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('project_information').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('tech_stack').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('uiux_guidelines').select('*').eq('project_id', projectId).single()
      ]);

      const projectData = {
        name: projectRes.data?.name,
        description: projectRes.data?.description,
        application_type: projectRes.data?.application_type,
        modules: modulesRes.data || [],
        userStories: userStoriesRes.data || [],
        features: featuresRes.data || [],
        vision: projectInfoRes.data?.vision,
        purpose: projectInfoRes.data?.purpose,
        objectives: projectInfoRes.data?.objectives,
        functionalRequirements: projectInfoRes.data?.functional_requirements,
        nonFunctionalRequirements: projectInfoRes.data?.non_functional_requirements,
        integrationRequirements: projectInfoRes.data?.integration_requirements,
        reportingRequirements: projectInfoRes.data?.reporting_requirements,
        businessRules: businessRulesRes.data?.config?.categories || [],
        techStack: techStackRes.data?.tech_stack,
        uiuxGuidelines: uiuxRes.data?.guidelines
      };

      console.log(`🤖 Generating ${developmentType} prompt for Vibe Engineer...`);

      // Fetch previous prompts of same type if not provided
      let previousPrompts = previousOutputs;
      if (previousPrompts.length === 0) {
        const { data: previousPromptsData } = await req.supabase!
          .from('ai_prompts')
          .select('generated_prompt')
          .eq('project_id', projectId)
          .eq('prompt_type', developmentType)
          .order('created_at', { ascending: true })
          .limit(5); // Get last 5 prompts of same type
        
        previousPrompts = previousPromptsData?.map(p => p.generated_prompt) || [];
      }

      // Generate prompt using STRUCT_TO_PROMPT
      const generatedPrompt = await generateContextualPrompt(
        projectId,
        projectData,
        developmentType,
        previousPrompts
      );

      // Save prompt to database with development type
      const { data: prompt, error } = await req.supabase!
        .from('ai_prompts')
        .insert({
          project_id: projectId,
          prompt_type: developmentType,
          generated_prompt: generatedPrompt,
          context: {
            ...context,
            developmentType,
            previousOutputsCount: previousPrompts.length
          }
        })
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 400);
      }

      console.log('✅ Prompt generated and saved');

      res.json({
        success: true,
        prompt
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/prompts/generate-vibe-prompt
 * Generate AI prompt specifically for Vibe Engineers using STRUCT_TO_PROMPT
 */
router.post(
  '/generate-vibe-prompt',
  [
    body('projectId').isUUID(),
    body('developmentType')
      .notEmpty()
      .isIn(['Frontend', 'Backend API', 'Database Schema', 'Unit Tests', 'Integration Tests', 'Batch Application', 'Microservices', 'CI/CD Pipeline', 'Documentation'])
      .withMessage('Invalid development type'),
    body('previousOutputs').optional().isArray().withMessage('Previous outputs must be an array')
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, developmentType, previousOutputs = [] } = req.body;

      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI API is not configured. Set OPENAI_API_KEY in .env', 500);
      }

      // Verify user is a Vibe Engineer
      if (req.user?.role !== 'vibe_engineer') {
        throw new AppError('This endpoint is only accessible to Vibe Engineers', 403);
      }

      console.log(`🎯 Vibe Engineer generating ${developmentType} prompt...`);

      // Fetch comprehensive project data
      const [projectRes, modulesRes, userStoriesRes, featuresRes, projectInfoRes, businessRulesRes, techStackRes, uiuxRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('project_information').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('tech_stack').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('uiux_guidelines').select('*').eq('project_id', projectId).single()
      ]);

      if (!projectRes.data) {
        throw new AppError('Project not found', 404);
      }

      // Build complete project data structure
      const projectData = {
        name: projectRes.data.name,
        description: projectRes.data.description,
        application_type: projectRes.data.application_type,
        modules: modulesRes.data || [],
        userStories: userStoriesRes.data || [],
        features: featuresRes.data || [],
        vision: projectInfoRes.data?.vision,
        purpose: projectInfoRes.data?.purpose,
        objectives: projectInfoRes.data?.objectives,
        projectScope: projectInfoRes.data?.project_scope ? JSON.parse(projectInfoRes.data.project_scope) : null,
        functionalRequirements: projectInfoRes.data?.functional_requirements,
        nonFunctionalRequirements: projectInfoRes.data?.non_functional_requirements,
        integrationRequirements: projectInfoRes.data?.integration_requirements,
        reportingRequirements: projectInfoRes.data?.reporting_requirements,
        businessRules: businessRulesRes.data?.config?.categories || [],
        techStack: techStackRes.data?.tech_stack,
        uiuxGuidelines: uiuxRes.data?.guidelines
      };

      // Generate the prompt using STRUCT_TO_PROMPT
      const generatedPrompt = await generateContextualPrompt(
        projectId,
        projectData,
        developmentType,
        previousOutputs
      );

      // Save the generated prompt with metadata
      const { data: savedPrompt, error } = await req.supabase!
        .from('ai_prompts')
        .insert({
          project_id: projectId,
          prompt_type: `vibe_${developmentType.toLowerCase().replace(/ /g, '_')}`,
          generated_prompt: generatedPrompt,
          context: {
            role: 'vibe_engineer',
            developmentType,
            applicationType: projectRes.data.application_type,
            previousOutputsCount: previousOutputs.length,
            generatedAt: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 400);
      }

      console.log(`✅ ${developmentType} prompt generated for Vibe Engineer`);

      res.json({
        success: true,
        prompt: savedPrompt,
        message: `${developmentType} prompt generated successfully using STRUCT_TO_PROMPT`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase!
      .from('ai_prompts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

