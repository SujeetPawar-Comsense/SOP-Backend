import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

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

      // TODO: Implement actual AI prompt generation
      // For now, return a mock prompt
      const generatedPrompt = `
# AI-Generated Prompt (${promptType})

Project ID: ${projectId}

This is a placeholder prompt. In production, this would:
1. Fetch all project data from database
2. Build context from modules, user stories, business rules
3. Send to AI API (OpenAI/Anthropic)
4. Return generated prompt

Replace this with actual AI integration.
      `.trim();

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

