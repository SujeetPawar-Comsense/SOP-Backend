import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateUser, requireProjectOwner, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All project routes require authentication
router.use(authenticateUser);

/**
 * GET /api/projects
 * Get all projects for current user
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { data: projects, error } = await req.supabase!
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      projects: projects || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects
 * Create a new project (Project Owners only)
 */
router.post(
  '/',
  requireProjectOwner,
  [
    body('name').notEmpty().withMessage('Project name is required'),
    body('description').optional()
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

      const { name, description } = req.body;

      const { data: project, error } = await req.supabase!
        .from('projects')
        .insert({
          name,
          description,
          created_by: req.user!.id,
          created_by_name: req.user!.email, // Will be updated when we have user names
          created_by_role: req.user!.role,
          completion_percentage: 0
        })
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 400);
      }

      res.status(201).json({
        success: true,
        project
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await req.supabase!
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new AppError('Project not found', 404);
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional(),
    body('description').optional(),
    body('completion_percentage').optional().isInt({ min: 0, max: 100 })
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

      const { id } = req.params;
      const updates = req.body;

      const { data: project, error } = await req.supabase!
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 400);
      }

      res.json({
        success: true,
        project
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase!
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new AppError(error.message, 400);
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

