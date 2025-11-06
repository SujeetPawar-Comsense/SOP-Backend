import { Router } from 'express';
import authRoutes from './auth.routes';
import projectsRoutes from './projects.routes';
import userStoriesRoutes from './userStories.routes';
import modulesRoutes from './modules.routes';
import featuresRoutes from './features.routes';
import businessRulesRoutes from './businessRules.routes';
import actionsRoutes from './actions.routes';
import promptsRoutes from './prompts.routes';
import uiuxRoutes from './uiux.routes';
import techStackRoutes from './techStack.routes';
import documentsRoutes from './documents.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectsRoutes);
router.use('/', userStoriesRoutes); // Includes /projects/:projectId/user-stories
router.use('/', modulesRoutes); // Includes /projects/:projectId/modules
router.use('/', featuresRoutes); // Includes /projects/:projectId/features
router.use('/', businessRulesRoutes); // Includes /projects/:projectId/business-rules
router.use('/', actionsRoutes); // Includes /projects/:projectId/actions
router.use('/', uiuxRoutes); // Includes /projects/:projectId/uiux
router.use('/', techStackRoutes); // Includes /projects/:projectId/tech-stack
router.use('/', documentsRoutes); // Includes /projects/:projectId/documents
router.use('/prompts', promptsRoutes); // Includes /prompts/generate and /projects/:projectId/prompts

export default router;

