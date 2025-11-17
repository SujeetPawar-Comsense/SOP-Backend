import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateContextualPrompt, isOpenAIConfigured } from '../services/openai.service';
import { initializeRAG, queryRAG, checkRAGHealth } from '../services/rag.service';

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
      .isIn(['Frontend', 'Backend API', 'Database Schema', 'Unit Tests', 'Integration Tests', 'Batch Application', 'Microservices', 'CI/CD Pipeline', 'Documentation', 'UI Components', 'API Endpoints', 'Database Schema', 'Business Logic', 'Authentication', 'Validation', 'Testing'])
      .withMessage('Invalid development type'),
    body('previousOutputs').optional().isArray().withMessage('Previous outputs must be an array'),
    body('selectedModuleId').optional().isUUID(),
    body('selectedFeatureId').optional().isUUID()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, developmentType, previousOutputs = [], selectedModuleId, selectedFeatureId } = req.body;

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
      const [projectRes, modulesRes, userStoriesRes, featuresRes, projectInfoRes, businessRulesRes, techStackRes, uiuxRes, previousPromptsRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('project_information').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('tech_stack').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('uiux_guidelines').select('*').eq('project_id', projectId).single(),
        // Fetch previous prompts and their saved implementations
        req.supabase!.from('ai_prompts')
          .select('generated_prompt, context')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })
      ]);

      if (!projectRes.data) {
        throw new AppError('Project not found', 404);
      }

      // Filter modules and features based on selection
      let filteredModules = modulesRes.data || [];
      let filteredFeatures = featuresRes.data || [];
      let filteredUserStories = userStoriesRes.data || [];

      if (selectedModuleId) {
        filteredModules = filteredModules.filter((m: any) => m.id === selectedModuleId);
        filteredFeatures = filteredFeatures.filter((f: any) => f.module_id === selectedModuleId);
        filteredUserStories = filteredUserStories.filter((us: any) => us.module_id === selectedModuleId);
      }

      if (selectedFeatureId) {
        filteredFeatures = filteredFeatures.filter((f: any) => f.id === selectedFeatureId);
      }

      // Build complete project data structure with filtered data
      const projectData = {
        name: projectRes.data.name,
        description: projectRes.data.description,
        application_type: projectRes.data.application_type,
        modules: filteredModules,
        userStories: filteredUserStories,
        features: filteredFeatures,
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
        uiuxGuidelines: uiuxRes.data?.guidelines,
        selectedModuleId,
        selectedFeatureId
      };

      // Collect previous outputs from saved prompts and implementations
      const allPreviousOutputs = [...previousOutputs];
      
      // Add saved implementation code from previous prompts if available
      if (previousPromptsRes.data && previousPromptsRes.data.length > 0) {
        previousPromptsRes.data.forEach((prompt: any) => {
          // Include the generated prompt itself
          if (prompt.generated_prompt) {
            allPreviousOutputs.push(prompt.generated_prompt);
          }
          // Include saved implementation code if available in context
          if (prompt.context?.implementationCode) {
            allPreviousOutputs.push(prompt.context.implementationCode);
          }
        });
      }

      // Map layer types to proper DevelopmentType
      const developmentTypeMap: Record<string, string> = {
        'UI Components': 'Frontend',
        'API Endpoints': 'Backend API',
        'Database Schema': 'Database Schema',
        'Business Logic': 'Backend API',
        'Authentication': 'Backend API',
        'Validation': 'Backend API',
        'Testing': 'Unit Tests'
      };

      const mappedDevelopmentType = developmentTypeMap[developmentType] || developmentType;

      // Generate the prompt using STRUCT_TO_PROMPT
      const generatedPrompt = await generateContextualPrompt(
        projectId,
        projectData,
        mappedDevelopmentType,
        allPreviousOutputs
      );

      // Save the generated prompt with metadata
      const { data: savedPrompt, error } = await req.supabase!
        .from('ai_prompts')
        .insert({
          project_id: projectId,
          prompt_type: `vibe_${mappedDevelopmentType.toLowerCase().replace(/ /g, '_')}`,
          generated_prompt: generatedPrompt,
          context: {
            role: 'vibe_engineer',
            developmentType: mappedDevelopmentType,
            originalDevelopmentType: developmentType,
            applicationType: projectRes.data.application_type,
            previousOutputsCount: allPreviousOutputs.length,
            selectedModuleId,
            selectedFeatureId,
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
        generatedPrompt: generatedPrompt,
        message: `${mappedDevelopmentType} prompt generated successfully using STRUCT_TO_PROMPT`
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/prompts/:id/implementation
 * Save implementation code for a prompt
 */
router.put(
  '/:id/implementation',
  [
    param('id').isUUID(),
    body('implementationCode').notEmpty().withMessage('Implementation code is required'),
    body('developerNotes').optional()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { implementationCode, developerNotes } = req.body;

      // Verify user is a Vibe Engineer
      if (req.user?.role !== 'vibe_engineer') {
        throw new AppError('This endpoint is only accessible to Vibe Engineers', 403);
      }

      // Get existing prompt
      const { data: existingPrompt, error: fetchError } = await req.supabase!
        .from('ai_prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !existingPrompt) {
        throw new AppError('Prompt not found', 404);
      }

      // Update prompt with implementation code
      const { data: updatedPrompt, error: updateError } = await req.supabase!
        .from('ai_prompts')
        .update({
          context: {
            ...existingPrompt.context,
            implementationCode,
            developerNotes: developerNotes || existingPrompt.context?.developerNotes,
            implementationSavedAt: new Date().toISOString()
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new AppError(updateError.message, 400);
      }

      res.json({
        success: true,
        prompt: updatedPrompt,
        message: 'Implementation code saved successfully'
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

/**
 * POST /api/prompts/rag/initialize
 * Initialize RAG system with project data
 */
router.post(
  '/rag/initialize',
  [
    body('projectId').isUUID(),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId } = req.body;

      // Verify user is a Vibe Engineer
      if (req.user?.role !== 'vibe_engineer') {
        throw new AppError('This endpoint is only accessible to Vibe Engineers', 403);
      }

      console.log(`🔍 Initializing RAG for project: ${projectId}`);

      // Fetch comprehensive project data - ALL tables
      const [
        projectRes, 
        modulesRes, 
        userStoriesRes, 
        featuresRes, 
        projectInfoRes, 
        businessRulesRes, 
        techStackRes, 
        uiuxRes,
        actionsRes,
        animationsRes,
        promptsRes
      ] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('project_information').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('tech_stack').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('uiux_guidelines').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('actions_interactions').select('*').eq('project_id', projectId),
        req.supabase!.from('animation_effects').select('*').eq('project_id', projectId),
        req.supabase!.from('ai_prompts').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10)
      ]);

      if (!projectRes.data) {
        throw new AppError('Project not found', 404);
      }

      // Prepare complete project data for RAG
      const projectData = {
        project: projectRes.data || {},
        project_information: projectInfoRes.data || {},
        modules: modulesRes.data || [],
        user_stories: userStoriesRes.data || [],
        features: featuresRes.data || [],
        business_rules: businessRulesRes.data || {},
        tech_stack: techStackRes.data || {},
        uiux_guidelines: uiuxRes.data || {},
        actions_interactions: actionsRes.data || [],
        animation_effects: animationsRes.data || [],
        recent_ai_prompts: promptsRes.data || []
      };

      // Initialize RAG
      await initializeRAG(projectId, projectData);

      res.json({
        success: true,
        message: 'RAG system initialized successfully'
      });
    } catch (error: any) {
      console.error('Error initializing RAG:', error);
      next(error);
    }
  }
);

/**
 * POST /api/prompts/rag/query
 * Query RAG system with a question
 */
router.post(
  '/rag/query',
  [
    body('projectId').isUUID(),
    body('question').notEmpty().withMessage('Question is required'),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, question } = req.body;

      // Verify user is a Vibe Engineer
      if (req.user?.role !== 'vibe_engineer') {
        throw new AppError('This endpoint is only accessible to Vibe Engineers', 403);
      }

      console.log(`🔍 Querying RAG for project: ${projectId}, question: ${question}`);

      // Query RAG
      const answer = await queryRAG(projectId, question);

      res.json({
        success: true,
        answer: answer
      });
    } catch (error: any) {
      console.error('Error querying RAG:', error);
      next(error);
    }
  }
);

/**
 * GET /api/prompts/rag/health
 * Check RAG service health
 */
router.get('/rag/health', async (req: AuthRequest, res, next) => {
  try {
    const isHealthy = await checkRAGHealth();
    res.json({
      success: true,
      healthy: isHealthy
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

