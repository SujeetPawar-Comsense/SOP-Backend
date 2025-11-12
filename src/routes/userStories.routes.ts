import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/user-stories
 * Get all user stories for a project
 */
router.get('/projects/:projectId/user-stories', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    const { data: userStories, error } = await req.supabase!
      .from('user_stories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformedStories = (userStories || []).map(story => ({
      id: story.id,
      title: story.title,
      userRole: story.user_role,
      description: story.description,
      acceptanceCriteria: story.acceptance_criteria?.split('\n').filter(Boolean) || [],
      priority: story.priority,
      status: story.status,
      moduleId: story.module_id,
      createdAt: story.created_at,
      updatedAt: story.updated_at
    }));

    res.json({
      success: true,
      userStories: transformedStories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/user-stories
 * Save user stories for a project (bulk operation)
 */
router.post(
  '/projects/:projectId/user-stories',
  [
    param('projectId').isUUID(),
    body('userStories').isArray()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { projectId } = req.params;
      const { userStories } = req.body;

      // Transform camelCase to snake_case for database
      const transformedStories = userStories.map((story: any) => ({
        id: story.id, // Preserve the ID
        project_id: projectId,
        title: story.title,
        user_role: story.userRole,
        description: story.description,
        acceptance_criteria: Array.isArray(story.acceptanceCriteria) 
          ? story.acceptanceCriteria.join('\n') 
          : story.acceptanceCriteria,
        priority: story.priority,
        status: story.status,
        module_id: story.moduleId
      }));

      // Use upsert to handle both new and existing stories
      const { data, error } = await req.supabase!
        .from('user_stories')
        .upsert(transformedStories, { onConflict: 'id' })
        .select();

      if (error) {
        throw new AppError(error.message, 400);
      }

      // Transform back to camelCase for response
      const responseStories = (data || []).map(story => ({
        id: story.id,
        title: story.title,
        userRole: story.user_role,
        description: story.description,
        acceptanceCriteria: story.acceptance_criteria?.split('\n') || [],
        priority: story.priority,
        status: story.status,
        moduleId: story.module_id
      }));

      res.json({
        success: true,
        userStories: responseStories
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/user-stories/:id
 * Update a specific user story
 */
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await req.supabase!
      .from('user_stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      userStory: data
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/user-stories/:id
 * Delete a user story
 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase!
      .from('user_stories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      message: 'User story deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

