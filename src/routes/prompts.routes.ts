import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { generateContextualPrompt, isOpenAIConfigured } from '../services/openai.service';

const router = Router();
router.use(authenticateUser);

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
    body('promptType').notEmpty(),
    body('context').optional()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, promptType, context } = req.body;

      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI API is not configured. Set OPENAI_API_KEY in .env', 500);
      }

      // Fetch project data
      const [projectRes, modulesRes, userStoriesRes, featuresRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId)
      ]);

      const projectData = {
        name: projectRes.data?.name,
        description: projectRes.data?.description,
        modules: modulesRes.data || [],
        userStories: userStoriesRes.data || [],
        features: featuresRes.data || []
      };

      console.log('🤖 Generating AI prompt...');

      // Generate prompt using OpenAI
      const generatedPrompt = await generateContextualPrompt(
        projectId,
        projectData,
        promptType
      );

      // Save prompt to database
      const { data: prompt, error } = await req.supabase!
        .from('ai_prompts')
        .insert({
          project_id: projectId,
          prompt_type: promptType,
          generated_prompt: generatedPrompt,
          context: context || {}
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

