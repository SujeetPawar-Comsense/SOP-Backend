import { Request, Response, NextFunction } from 'express';
import { createUserClient } from '../config/supabase';
import supabaseAdmin from '../config/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  supabase?: ReturnType<typeof createUserClient>;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Fetch user profile from database (optional - may not exist)
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Attach user to request
    // If no profile exists, use email from JWT and default role
    req.user = {
      id: user.id,
      email: userProfile?.email || user.email || '',
      name: userProfile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
      role: userProfile?.role || user.user_metadata?.role || 'project_owner' // Default to project_owner if no profile
    };

    // Create user-specific Supabase client (respects RLS)
    req.supabase = createUserClient(token);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Require Project Owner role
 */
export const requireProjectOwner = requireRole('project_owner');

/**
 * Require Vibe Engineer role
 */
export const requireVibeEngineer = requireRole('vibe_engineer');

