import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import supabaseAdmin, { supabasePublic } from '../config/supabase';
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
  async (req: Request, res: Response, next: NextFunction) => {
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

      // Use public client to sign up (this automatically sends verification email)
      const { data: authData, error: authError } = await supabasePublic.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          },
          emailRedirectTo: process.env.SITE_URL || 'http://localhost:5173'
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
      console.log('✅ Verification email automatically sent to:', email);

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
        message: 'User created successfully. Please check your email to verify your account.',
        requiresVerification: true,
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // First, try to get user to check verification status
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === email);

      // If user exists, check if email is verified
      if (existingUser && !existingUser.email_confirmed_at) {
        throw new AppError('Please verify your email before signing in. Check your inbox for the verification link.', 403);
      }

      // Now try to sign in
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
router.post('/signout', async (req: Request, res: Response, next: NextFunction) => {
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
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post(
  '/resend-verification',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Get user by email
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (userError) {
        throw new AppError('Failed to lookup user', 500);
      }

      const user = users.users.find(u => u.email === email);

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If an account with that email exists and is unverified, a verification email has been sent.'
        });
      }

      // Check if already verified
      if (user.email_confirmed_at) {
        throw new AppError('Email is already verified. Please sign in.', 400);
      }

      // Use Supabase to resend confirmation email
      // Note: Supabase will automatically send the email if SMTP is configured
      const { error } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Failed to resend verification email:', error);
        throw new AppError('Failed to send verification email', 500);
      }

      res.json({
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/verify
 * Verify email with token
 */
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, type } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is required', 400);
    }

    // Verify the token using Supabase
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: type === 'email' ? 'email' : 'signup'
    });

    if (error) {
      console.error('Verification error:', error);
      throw new AppError('Invalid or expired verification link', 400);
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      user: data.user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
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

