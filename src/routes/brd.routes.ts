import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateUser, requireProjectOwner, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parseBRDDocument, enhanceProjectSection, isOpenAIConfigured } from '../services/openai.service';
import { ParsedBRD } from '../types/brd.types';

const router = Router();
router.use(authenticateUser);

/**
 * POST /api/brd/parse
 * Parse a BRD document using OpenAI
 */
router.post(
  '/parse',
  requireProjectOwner,
  [
    body('brdContent').notEmpty().withMessage('BRD content is required'),
    body('projectName').optional()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI API is not configured. Please set OPENAI_API_KEY in environment variables.', 500);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { brdContent, projectName } = req.body;

      console.log('📄 Parsing BRD document...');
      console.log(`📊 Content length: ${brdContent.length} characters`);

      // Parse BRD using OpenAI
      const parsedBRD = await parseBRDDocument(brdContent);

      console.log('✅ BRD parsed successfully');
      console.log(`📦 Extracted ${parsedBRD.modules?.length || 0} modules`);

      // Optionally create project automatically
      if (projectName || parsedBRD.projectOverview?.projectName) {
        const name = projectName || parsedBRD.projectOverview.projectName;
        const description = parsedBRD.projectOverview?.projectDescription || '';

        // Create project
        const { data: project, error: projectError } = await req.supabase!
          .from('projects')
          .insert({
            name,
            description,
            created_by: req.user!.id,
            created_by_name: req.user!.email,
            created_by_role: req.user!.role,
            completion_percentage: 0
          })
          .select()
          .single();

        if (projectError) {
          throw new AppError(projectError.message, 400);
        }

        console.log('✅ Project created:', project.id);

        // Save project information
        if (parsedBRD.projectOverview) {
          const { businessIntent, requirements } = parsedBRD.projectOverview;

          await req.supabase!
            .from('project_information')
            .insert({
              project_id: project.id,
              vision: businessIntent?.vision || null,
              purpose: businessIntent?.purpose || null,
              objectives: businessIntent?.objectives?.join('\n') || null,
              project_scope: JSON.stringify(businessIntent?.projectScope) || null,
              functional_requirements: requirements?.functional?.join('\n') || null,
              non_functional_requirements: requirements?.nonFunctional?.join('\n') || null,
              integration_requirements: requirements?.integration?.join('\n') || null,
              reporting_requirements: requirements?.reporting?.join('\n') || null
            });

          console.log('✅ Project information saved');
        }

        // Save modules and nested data
        if (parsedBRD.modules && parsedBRD.modules.length > 0) {
          for (const module of parsedBRD.modules) {
            // Insert module
            const { data: moduleData, error: moduleError } = await req.supabase!
              .from('modules')
              .insert({
                project_id: project.id,
                module_name: module.moduleName,
                description: module.moduleDescription,
                priority: 'Medium',
                status: 'Not Started'
              })
              .select()
              .single();

            if (moduleError) {
              console.error('Error saving module:', moduleError);
              continue;
            }

            console.log(`✅ Module saved: ${module.moduleName}`);

            // Insert user stories for this module
            if (module.userStories && module.userStories.length > 0) {
              for (const story of module.userStories) {
                const { data: storyData, error: storyError } = await req.supabase!
                  .from('user_stories')
                  .insert({
                    project_id: project.id,
                    module_id: moduleData.id,
                    title: story.title,
                    user_role: story.userStory.match(/As (?:a|an) ([^,]+),/)?.[1] || 'User',
                    description: story.userStory,
                    acceptance_criteria: story.acceptanceCriteria?.join('\n') || null,
                    priority: story.priority || 'Medium',
                    status: 'Not Started'
                  })
                  .select()
                  .single();

                if (storyError) {
                  console.error('Error saving user story:', storyError);
                  continue;
                }

                console.log(`  ✅ User story saved: ${story.title}`);

                // Insert features for this user story
                if (story.features && story.features.length > 0) {
                  for (const feature of story.features) {
                    await req.supabase!
                      .from('features')
                      .insert({
                        project_id: project.id,
                        module_id: moduleData.id,
                        user_story_id: storyData.id,
                        title: feature.featureName,
                        description: feature.taskDescription,
                        priority: feature.priority || 'Medium',
                        status: 'Not Started'
                      });
                  }
                  console.log(`    ✅ ${story.features.length} features saved`);
                }
              }
            }
          }
        }

        // Save business rules
        if (parsedBRD.businessRules && parsedBRD.businessRules.length > 0) {
          await req.supabase!
            .from('business_rules')
            .upsert({
              project_id: project.id,
              config: {
                categories: parsedBRD.businessRules.map(rule => ({
                  id: rule.ruleName.toLowerCase().replace(/\s+/g, '-'),
                  name: rule.ruleName,
                  description: rule.ruleDescription,
                  applicableTo: rule.applicableTo
                })),
                applyToAllProjects: false,
                specificModules: []
              }
            });

          console.log(`✅ ${parsedBRD.businessRules.length} business rules saved`);
        }

        res.json({
          success: true,
          message: 'BRD parsed and project created successfully',
          parsedBRD,
          project: {
            id: project.id,
            name: project.name,
            description: project.description
          }
        });
      } else {
        // Just return parsed data without creating project
        res.json({
          success: true,
          message: 'BRD parsed successfully',
          parsedBRD
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/enhance
 * Enhance a specific section of the project
 */
router.post(
  '/enhance',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('enhancementRequest').notEmpty().withMessage('Enhancement request is required'),
    body('targetType').optional().isIn(['module', 'userStory', 'feature']),
    body('targetId').optional()
  ],
  async (req: AuthRequest, res, next) => {
    try {
      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI API is not configured', 500);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { projectId, enhancementRequest, targetType, targetId } = req.body;

      // Fetch existing project data
      const [projectRes, modulesRes, userStoriesRes, featuresRes, businessRulesRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single()
      ]);

      // Build existing project JSON structure
      const existingProjectJson: ParsedBRD = {
        projectOverview: {
          projectName: projectRes.data?.name || '',
          projectDescription: projectRes.data?.description || '',
          businessIntent: {
            vision: '',
            purpose: '',
            objectives: [],
            projectScope: { inScope: [], outOfScope: [] }
          },
          requirements: {
            functional: [],
            nonFunctional: [],
            integration: [],
            reporting: []
          }
        },
        modules: modulesRes.data?.map((m: any) => ({
          moduleName: m.module_name,
          moduleDescription: m.description || '',
          userStories: userStoriesRes.data
            ?.filter((us: any) => us.module_id === m.id)
            .map((us: any) => ({
              userStory: us.description,
              title: us.title,
              priority: us.priority as any,
              acceptanceCriteria: us.acceptance_criteria?.split('\n') || [],
              features: featuresRes.data
                ?.filter((f: any) => f.user_story_id === us.id)
                .map((f: any) => ({
                  featureName: f.title,
                  taskDescription: f.description || '',
                  priority: f.priority as any,
                  acceptanceCriteria: []
                })) || []
            })) || []
        })) || [],
        businessRules: []
      };

      // Enhance using OpenAI
      const enhancement = await enhanceProjectSection({
        existingProjectJson,
        enhancementRequest,
        targetType,
        targetId
      });

      res.json({
        success: true,
        message: 'Section enhanced successfully',
        enhancement
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/brd/check
 * Check if OpenAI is configured
 */
router.get('/check', async (req: AuthRequest, res, next) => {
  try {
    const configured = isOpenAIConfigured();

    res.json({
      success: true,
      openai: {
        configured,
        message: configured
          ? 'OpenAI is configured and ready'
          : 'OpenAI API key not found. Set OPENAI_API_KEY in .env'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

