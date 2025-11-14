/**
 * RAG Service Routes
 * API endpoints for the RAG-based Q&A system
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ragService } from '../services/rag.service';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// All RAG routes require authentication
router.use(authenticateUser);

/**
 * Health check for RAG service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await ragService.healthCheck();
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'RAG Service',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      error: 'RAG service health check failed',
      message: error.message,
    });
  }
});

/**
 * Ingest a project into the RAG system
 */
router.post(
  '/ingest/:projectId',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    body('clearExisting').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;
      const { clearExisting = false } = req.body;

      // Check if RAG service is available
      const isHealthy = await ragService.healthCheck();
      if (!isHealthy) {
        // Return success but indicate RAG service is not available
        return res.json({
          success: true,
          message: 'RAG service is not available. Project data saved but not indexed.',
          result: {
            status: 'rag_service_unavailable',
            projectId,
          },
        });
      }

      const result = await ragService.ingestProject(projectId, clearExisting);
      
      res.json({
        success: true,
        message: 'Project ingested successfully',
        result,
      });
    } catch (error: any) {
      console.error('Project ingestion error:', error);
      
      // Check if it's a connection error to RAG service
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        return res.json({
          success: true,
          message: 'RAG service is not running. Project data is saved but not indexed for Q&A.',
          result: {
            status: 'rag_service_offline',
            projectId: req.params.projectId,
          },
        });
      }
      
      res.status(500).json({
        error: 'Failed to ingest project',
        message: error.message,
      });
    }
  }
);

/**
 * Query the RAG system
 */
router.post(
  '/query',
  [
    body('question').notEmpty().withMessage('Question is required'),
    body('projectId').optional().isUUID(),
    body('n_results').optional().isInt({ min: 1, max: 20 }),
    body('min_similarity').optional().isFloat({ min: 0, max: 1 }),
    body('include_context').optional().isBoolean(),
    body('session_id').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        question,
        projectId,
        n_results = 5,
        min_similarity = 0.3,
        include_context = false,
        session_id,
      } = req.body;

      // Check if RAG service is available
      const isHealthy = await ragService.healthCheck();
      if (!isHealthy) {
        return res.json({
          question,
          answer: 'The Q&A service is currently unavailable. Please try again later or contact support if the issue persists.',
          retrieved_chunks: 0,
          status: 'rag_service_unavailable',
          timestamp: new Date().toISOString(),
          session_id,
        });
      }

      // If projectId is provided, ensure it's ingested first
      if (projectId) {
        try {
          await ragService.ingestProject(projectId, false);
        } catch (error) {
          console.log('Project might already be ingested or ingestion failed:', error);
        }
      }

      const response = await ragService.query({
        question,
        n_results,
        min_similarity,
        include_context,
        session_id: session_id || `user_${(req as any).user?.id}`,
      });

      res.json(response);
    } catch (error: any) {
      console.error('Query error:', error);
      
      // Check if it's a connection error to RAG service
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        return res.json({
          question: req.body.question,
          answer: 'The Q&A service is currently offline. Please ensure the RAG service is running.',
          retrieved_chunks: 0,
          status: 'rag_service_offline',
          timestamp: new Date().toISOString(),
          session_id: req.body.session_id,
        });
      }
      
      res.status(500).json({
        error: 'Failed to process query',
        message: error.message,
      });
    }
  }
);

/**
 * Batch query the RAG system
 */
router.post(
  '/batch-query',
  [
    body('questions').isArray().withMessage('Questions must be an array'),
    body('questions.*').notEmpty().withMessage('Each question must be non-empty'),
    body('include_context').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { questions, include_context = false } = req.body;

      if (questions.length > 10) {
        return res.status(400).json({
          error: 'Too many questions',
          message: 'Maximum 10 questions allowed in batch',
        });
      }

      const response = await ragService.batchQuery(questions, include_context);
      res.json(response);
    } catch (error: any) {
      console.error('Batch query error:', error);
      res.status(500).json({
        error: 'Failed to process batch query',
        message: error.message,
      });
    }
  }
);

/**
 * Get RAG system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

/**
 * Clear the vector store (admin only)
 */
router.post('/clear', async (req: Request, res: Response) => {
  try {
    // Check if user is admin (you might want to implement proper role checking)
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'project_lead') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins and project leads can clear the vector store',
      });
    }

    const result = await ragService.clearVectorStore();
    res.json(result);
  } catch (error: any) {
    console.error('Clear error:', error);
    res.status(500).json({
      error: 'Failed to clear vector store',
      message: error.message,
    });
  }
});

/**
 * Get conversation history
 */
router.get('/conversation/history', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string || `user_${(req as any).user?.id}`;
    const history = await ragService.getConversationHistory(sessionId);
    res.json(history);
  } catch (error: any) {
    console.error('History error:', error);
    res.status(500).json({
      error: 'Failed to get conversation history',
      message: error.message,
    });
  }
});

/**
 * Clear conversation history
 */
router.post('/conversation/clear', async (req: Request, res: Response) => {
  try {
    const result = await ragService.clearConversationHistory();
    res.json(result);
  } catch (error: any) {
    console.error('Clear history error:', error);
    res.status(500).json({
      error: 'Failed to clear conversation history',
      message: error.message,
    });
  }
});

/**
 * Get suggested questions based on project context
 */
router.get(
  '/suggestions/:projectId',
  [param('projectId').isUUID().withMessage('Invalid project ID')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Predefined suggestions based on common queries
      const suggestions = [
        'What are the main modules in this project?',
        'What are the business objectives?',
        'List all user stories for authentication',
        'What are the technical requirements?',
        'What third-party integrations are planned?',
        'What are the high-priority features?',
        'Describe the project architecture',
        'What are the security requirements?',
      ];

      res.json({
        projectId: req.params.projectId,
        suggestions,
        status: 'success',
      });
    } catch (error: any) {
      // Always return suggestions even on error
      res.json({
        projectId: req.params.projectId,
        suggestions: [
          'What are the main modules in this project?',
          'What are the business objectives?',
          'List all user stories',
          'What are the technical requirements?',
        ],
        status: 'fallback',
      });
    }
  }
);

export default router;
