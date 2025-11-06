import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import supabaseAdmin from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').isIn(['project_owner', 'vibe_engineer']).withMessage('Invalid role')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password, name, role } = req.body;

      // Check if user already exists in database
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new AppError('User already exists with this email', 400);
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name,
          role
        }
      });

      if (authError) {
        console.error('Supabase Auth error:', authError);
        throw new AppError(authError.message, 400);
      }

      if (!authData.user) {
        throw new AppError('User creation failed', 500);
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Check if profile already exists (in case trigger created it)
      let profileData = null;
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        console.log('ℹ️  User profile already exists (created by trigger)');
        profileData = existingProfile;
      } else {
        // Create user profile in database
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            name,
            role
          })
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          
          // Check if it's duplicate key error (profile might have been created by trigger)
          if (profileError.code === '23505') {
            console.log('ℹ️  Profile was created by trigger, fetching it...');
            const { data: triggeredProfile } = await supabaseAdmin
              .from('users')
              .select('*')
              .eq('id', authData.user.id)
              .single();
            
            if (triggeredProfile) {
              profileData = triggeredProfile;
            } else {
              // Still can't find profile, rollback
              await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
              throw new AppError('Failed to create or retrieve user profile', 500);
            }
          } else {
            // Other error, rollback
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw new AppError(`Failed to create user profile: ${profileError.message}`, 500);
          }
        } else {
          profileData = newProfile;
          console.log('✅ User profile created:', profileData.id);
        }
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          user_metadata: authData.user.user_metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/signin
 * Sign in existing user
 */
router.post(
  '/signin',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new AppError('Invalid email or password', 401);
      }

      res.json({
        success: true,
        session: data.session,
        user: data.user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/signout
 * Sign out current user
 */
router.post('/signout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.json({ success: true, message: 'Already signed out' });
    }

    const token = authHeader.substring(7);

    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      console.error('Signout error:', error);
    }

    res.json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authorization header required', 401);
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Invalid token', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new AppError('User profile not found', 404);
    }

    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    next(error);
  }
});

export default router;

