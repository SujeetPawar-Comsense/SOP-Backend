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

    res.json({
      success: true,
      userStories: userStories || []
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

      // Delete existing user stories for this project
      await req.supabase!
        .from('user_stories')
        .delete()
        .eq('project_id', projectId);

      // Insert new user stories
      const storiesWithProjectId = userStories.map((story: any) => ({
        ...story,
        project_id: projectId
      }));

      const { data, error } = await req.supabase!
        .from('user_stories')
        .insert(storiesWithProjectId)
        .select();

      if (error) {
        throw new AppError(error.message, 400);
      }

      res.json({
        success: true,
        userStories: data
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

