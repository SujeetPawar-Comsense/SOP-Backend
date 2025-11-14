import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateUser);

/**
 * Save a chat message to history
 */
router.post('/history', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      projectId, 
      role, 
      content, 
      context, 
      sessionId,
      userRole 
    } = req.body;
    
    const userId = req.user?.id;

    if (!projectId || !role || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'projectId, role, and content are required'
      });
    }

    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        project_id: projectId,
        user_id: userId,
        user_role: userRole || 'vibe_engineer',
        session_id: sessionId || `session_${Date.now()}`,
        role,
        content,
        context: context || null,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_app'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving chat message:', error);
      return res.status(500).json({
        error: 'Failed to save chat message',
        message: error.message
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Chat history save error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get chat history for a project
 */
router.get('/history/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { 
      userRole, 
      sessionId, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (userRole) {
      query = query.eq('user_role', userRole);
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching chat history:', error);
      return res.status(500).json({
        error: 'Failed to fetch chat history',
        message: error.message
      });
    }

    // Reverse to get chronological order
    const chronologicalData = data ? data.reverse() : [];

    res.json({
      success: true,
      data: chronologicalData,
      count: chronologicalData.length
    });
  } catch (error: any) {
    console.error('Chat history fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Delete chat history for a session
 */
router.delete('/history/session/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting chat history:', error);
      return res.status(500).json({
        error: 'Failed to delete chat history',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Chat history deleted successfully'
    });
  } catch (error: any) {
    console.error('Chat history delete error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get chat statistics for a project
 */
router.get('/stats/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get message count by role
    const { data: roleStats, error: roleError } = await supabase
      .from('chat_history')
      .select('role')
      .eq('project_id', projectId);

    if (roleError) {
      throw roleError;
    }

    // Get message count by user role
    const { data: userRoleStats, error: userRoleError } = await supabase
      .from('chat_history')
      .select('user_role')
      .eq('project_id', projectId);

    if (userRoleError) {
      throw userRoleError;
    }

    // Calculate statistics
    const stats = {
      totalMessages: roleStats?.length || 0,
      messagesByRole: {
        user: roleStats?.filter(m => m.role === 'user').length || 0,
        assistant: roleStats?.filter(m => m.role === 'assistant').length || 0,
        system: roleStats?.filter(m => m.role === 'system').length || 0
      },
      messagesByUserRole: {
        vibe_engineer: userRoleStats?.filter(m => m.user_role === 'vibe_engineer').length || 0,
        project_owner: userRoleStats?.filter(m => m.user_role === 'project_owner').length || 0,
        developer: userRoleStats?.filter(m => m.user_role === 'developer').length || 0
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Chat stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
