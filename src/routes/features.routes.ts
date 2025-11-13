import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import OpenAI from 'openai';

// Initialize OpenRouter client for AI recommendations
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.YOUR_SITE_URL || 'http://localhost:3000',
    'X-Title': 'BRD Parser'
  }
});

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
      .upsert(transformedFeatures, { onConflict: 'id' as any })
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

/**
 * GET /api/projects/:projectId/features/recommendations/:userStoryId
 * Get feature recommendations for a specific user story
 */
router.get('/projects/:projectId/features/recommendations/:userStoryId', async (req: AuthRequest, res, next) => {
  try {
    const { projectId, userStoryId } = req.params;

    console.log('🎯 Fetching feature recommendations for user story:', userStoryId);

    // Get the user story details
    const { data: userStory, error: storyError } = await req.supabase!
      .from('user_stories')
      .select('*')
      .eq('id', userStoryId)
      .eq('project_id', projectId)
      .single();

    if (storyError || !userStory) {
      throw new AppError('User story not found', 404);
    }

    console.log('📖 User story:', userStory.title);

    // Get project information for context
    const { data: projectInfo } = await req.supabase!
      .from('project_information')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Get module information
    const { data: module } = await req.supabase!
      .from('modules')
      .select('*')
      .eq('id', userStory.module_id)
      .single();

    // Get existing features to avoid duplicates
    const { data: existingFeatures } = await req.supabase!
      .from('features')
      .select('title, description')
      .eq('user_story_id', userStoryId)
      .eq('project_id', projectId);

    // Get similar user stories and their features from the same project or module
    const { data: similarStories } = await req.supabase!
      .from('user_stories')
      .select('id, title')
      .eq('module_id', userStory.module_id)
      .neq('id', userStoryId)
      .limit(5);

    let learningFeatures: any[] = [];
    if (similarStories && similarStories.length > 0) {
      const similarStoryIds = similarStories.map((s: any) => s.id);
      const { data: similarFeatures } = await req.supabase!
        .from('features')
        .select('title, description')
        .in('user_story_id', similarStoryIds)
        .limit(20);
      
      learningFeatures = similarFeatures || [];
    }

    // Get features from similar projects (if any)
    if (projectInfo?.project_type) {
      const { data: similarProjects } = await req.supabase!
        .from('project_information')
        .select('project_id')
        .eq('project_type', projectInfo.project_type)
        .neq('project_id', projectId)
        .limit(3);

      if (similarProjects && similarProjects.length > 0) {
        const similarProjectIds = similarProjects.map((p: any) => p.project_id);
        const { data: templateFeatures } = await req.supabase!
          .from('features')
          .select('title, description')
          .in('project_id', similarProjectIds)
          .limit(30);
        
        if (templateFeatures) {
          learningFeatures = [...learningFeatures, ...templateFeatures];
        }
      }
    }

    const existingTitles = (existingFeatures || []).map(f => f.title.toLowerCase());

    try {
      // Try to use AI for intelligent recommendations
      const aiRecommendations = await generateAIFeatureRecommendations({
        userStory: {
          title: userStory.title,
          description: userStory.description || '',
          userRole: userStory.user_role || '',
          acceptanceCriteria: userStory.acceptance_criteria || ''
        },
        module: module ? {
          name: module.module_name,
          description: module.description
        } : undefined,
        projectContext: projectInfo ? {
          name: projectInfo.project_name,
          type: projectInfo.project_type,
          description: projectInfo.project_description
        } : undefined,
        existingFeatures: existingFeatures || [],
        learningFeatures: learningFeatures,
        existingTitles
      });

      res.json({
        success: true,
        recommendations: aiRecommendations,
        source: 'ai'
      });
    } catch (aiError) {
      console.error('⚠️ AI recommendation failed, falling back to database-driven recommendations:', aiError);
      
      // Fallback: Use database-driven recommendations
      const recommendations = getDatabaseDrivenRecommendations(
        userStory,
        module,
        learningFeatures,
        existingTitles
      );

      res.json({
        success: true,
        recommendations,
        source: 'database'
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Generate feature recommendations using AI
 */
async function generateAIFeatureRecommendations(context: {
  userStory: {
    title: string;
    description: string;
    userRole: string;
    acceptanceCriteria: string;
  };
  module?: {
    name: string;
    description: string;
  };
  projectContext?: {
    name: string;
    type: string;
    description: string;
  };
  existingFeatures: any[];
  learningFeatures: any[];
  existingTitles: string[];
}): Promise<string[]> {
  try {
    console.log('🤖 Generating AI-powered feature recommendations');

    // Build context from learning features
    const learningContext = context.learningFeatures.length > 0 
      ? `\n\nSimilar features from related user stories:\n${context.learningFeatures.slice(0, 10).map(f => `- ${f.title}: ${f.description || 'No description'}`).join('\n')}`
      : '';

    const prompt = `You are a senior software architect helping to identify features for a user story.

User Story: "${context.userStory.title}"
Description: ${context.userStory.description || 'No description provided'}
User Role: ${context.userStory.userRole || 'Not specified'}
Acceptance Criteria: ${context.userStory.acceptanceCriteria || 'Not specified'}

${context.module ? `Module: ${context.module.name} - ${context.module.description}` : ''}
${context.projectContext ? `Project: ${context.projectContext.name} (${context.projectContext.type}) - ${context.projectContext.description}` : ''}

Existing features for this user story:
${context.existingFeatures.length > 0 ? context.existingFeatures.map(f => `- ${f.title}`).join('\n') : 'None yet'}
${learningContext}

Based on this context, suggest 10-15 specific, actionable features that would be needed to implement this user story. 
Focus on:
1. Technical implementation features (not just UI elements)
2. Security and validation features
3. Performance and optimization features
4. User experience enhancements
5. Integration points
6. Data management features

DO NOT suggest features that are already listed above.
Return ONLY a JSON array of feature titles (strings), no descriptions or explanations.
Example format: ["Feature 1", "Feature 2", "Feature 3"]`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect. Return only valid JSON arrays of feature titles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const recommendations = JSON.parse(cleanContent);

    if (!Array.isArray(recommendations)) {
      throw new Error('Invalid response format from AI');
    }

    // Filter out any existing features
    const filteredRecommendations = recommendations
      .filter((rec: string) => !context.existingTitles.includes(rec.toLowerCase()))
      .slice(0, 15); // Limit to 15 recommendations

    console.log(`✅ Generated ${filteredRecommendations.length} feature recommendations`);
    return filteredRecommendations;

  } catch (error) {
    console.error('Error generating AI feature recommendations:', error);
    throw error;
  }
}

/**
 * Helper function for database-driven recommendations when AI is not available
 */
function getDatabaseDrivenRecommendations(
  userStory: any,
  _module: any,
  learningFeatures: any[],
  existingTitles: string[]
): string[] {
  const recommendations = new Set<string>();
  
  // Extract patterns from learning features
  const featurePatterns = new Map<string, number>();
  
  learningFeatures.forEach(feature => {
    const title = feature.title.toLowerCase();
    
    // Count occurrences of feature patterns
    if (!existingTitles.includes(title)) {
      featurePatterns.set(feature.title, (featurePatterns.get(feature.title) || 0) + 1);
    }
  });
  
  // Sort by frequency and take top recommendations
  const sortedPatterns = Array.from(featurePatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([title]) => title);
  
  sortedPatterns.forEach(title => recommendations.add(title));
  
  // Add context-based recommendations based on keywords
  const context = `${userStory.title} ${userStory.description || ''}`.toLowerCase();
  
  // Add basic features based on common patterns
  if (context.includes('create') || context.includes('add') || context.includes('new')) {
    recommendations.add('Form validation');
    recommendations.add('Success notification');
    recommendations.add('Error handling');
    recommendations.add('Data persistence');
  }
  
  if (context.includes('edit') || context.includes('update') || context.includes('modify')) {
    recommendations.add('Edit mode toggle');
    recommendations.add('Save changes confirmation');
    recommendations.add('Undo/Redo functionality');
    recommendations.add('Version history');
  }
  
  if (context.includes('delete') || context.includes('remove')) {
    recommendations.add('Delete confirmation dialog');
    recommendations.add('Soft delete option');
    recommendations.add('Restore functionality');
    recommendations.add('Bulk delete');
  }
  
  if (context.includes('list') || context.includes('view') || context.includes('display')) {
    recommendations.add('Pagination');
    recommendations.add('Sorting options');
    recommendations.add('Filter functionality');
    recommendations.add('Search capability');
    recommendations.add('Export data');
  }
  
  if (context.includes('upload') || context.includes('file') || context.includes('document')) {
    recommendations.add('File type validation');
    recommendations.add('File size limits');
    recommendations.add('Drag and drop upload');
    recommendations.add('Progress indicator');
    recommendations.add('Multiple file support');
  }
  
  // Filter out existing features and convert to array
  return Array.from(recommendations)
    .filter(rec => !existingTitles.includes(rec.toLowerCase()))
    .slice(0, 12); // Limit to 12 recommendations
}

export default router;

