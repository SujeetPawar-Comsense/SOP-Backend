import { Router } from 'express';
import { param } from 'express-validator';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/projects/:projectId/features
 * Get all features for a project
 */
router.get('/projects/:projectId/features', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    console.log('📖 Fetching features for project:', projectId);

    const { data: features, error } = await req.supabase!
      .from('features')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching features:', error);
      throw new AppError(error.message, 400);
    }

    console.log(`📊 Found ${features?.length || 0} features`);
    
    // Log user story relationships
    const withUserStory = features?.filter(f => f.user_story_id).length || 0;
    console.log(`🔗 Features with user_story_id: ${withUserStory}/${features?.length || 0}`);
    
    if (features && features.length > 0) {
      console.log('📝 Sample feature:', {
        id: features[0].id,
        user_story_id: features[0].user_story_id,
        title: features[0].title
      });
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformedFeatures = (features || []).map(feature => ({
      id: feature.id,
      title: feature.title,
      description: feature.description,
      userStoryId: feature.user_story_id,
      moduleId: feature.module_id,
      priority: feature.priority,
      status: feature.status,
      estimatedHours: feature.estimated_hours,
      assignee: feature.assignee,
      businessRules: feature.business_rules,
      createdAt: feature.created_at,
      updatedAt: feature.updated_at
    }));

    console.log('✅ Returning transformed features with userStoryIds:', 
      transformedFeatures.map(f => ({ id: f.id, userStoryId: f.userStoryId })));
    
    console.log('📤 Full response being sent:', {
      success: true,
      featuresCount: transformedFeatures.length,
      sampleFeature: transformedFeatures.length > 0 ? transformedFeatures[0] : null
    });

    res.json({
      success: true,
      features: transformedFeatures
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/features
 * Save features for a project
 */
router.post('/projects/:projectId/features', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const { features } = req.body;

    console.log('📝 Saving features for project:', projectId);
    console.log('📊 Number of features to save:', features.length);
    
    // Log the user story IDs being saved
    const userStoryIds = features.map((f: any) => f.userStoryId).filter(Boolean);
    console.log('🔗 User story IDs in features:', userStoryIds);
    
    // Validate that user stories exist
    if (userStoryIds.length > 0) {
      const { data: existingStories, error: storyError } = await req.supabase!
        .from('user_stories')
        .select('id')
        .in('id', userStoryIds);
      
      if (storyError) {
        console.error('❌ Error checking user stories:', storyError);
      } else {
        console.log(`✅ Found ${existingStories?.length || 0} valid user stories out of ${userStoryIds.length} referenced`);
        const existingIds = new Set(existingStories?.map(s => s.id) || []);
        const missingIds = userStoryIds.filter(id => !existingIds.has(id));
        if (missingIds.length > 0) {
          console.warn('⚠️ Missing user story IDs:', missingIds);
        }
      }
    }

    // Transform camelCase to snake_case for database
    const transformedFeatures = features.map((feature: any) => {
      const transformed = {
        id: feature.id,
        project_id: projectId,
        title: feature.title || 'Untitled Feature',
        description: feature.description || '',
        user_story_id: feature.userStoryId || null,
        module_id: feature.moduleId || null,
        priority: feature.priority || 'Medium',
        status: feature.status || 'Not Started',
        estimated_hours: feature.estimatedHours || null,
        assignee: feature.assignee || null,
        business_rules: feature.businessRules || null
      };
      
      console.log(`🔧 Feature ${transformed.id}: user_story_id=${transformed.user_story_id}, title=${transformed.title}`);
      return transformed;
    });

    // Use upsert to handle both new and existing features
    const { data, error } = await req.supabase!
      .from('features')
      .upsert(transformedFeatures, { onConflict: 'id' })
      .select();

    if (error) {
      throw new AppError(error.message, 400);
    }

    // Transform back to camelCase for response
    const responseFeatures = (data || []).map(feature => ({
      id: feature.id,
      title: feature.title,
      description: feature.description,
      userStoryId: feature.user_story_id,
      moduleId: feature.module_id,
      priority: feature.priority,
      status: feature.status,
      estimatedHours: feature.estimated_hours,
      assignee: feature.assignee,
      businessRules: feature.business_rules
    }));

    res.json({
      success: true,
      features: responseFeatures
    });
  } catch (error) {
    next(error);
  }
});

export default router;

