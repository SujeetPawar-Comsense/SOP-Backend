import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateUser, requireProjectOwner, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parseBRDDocument, enhanceProjectSection, isOpenAIConfigured, generateDesignPrompts, analyzeProjectOverview, parseBRDWithProjectOverview, enhanceWithDynamicPrompt } from '../services/openai.service';
import { ParsedBRD } from '../types/brd.types';
import { SupabaseClient } from '@supabase/supabase-js';

const router = Router();
router.use(authenticateUser);

/**
 * POST /api/brd/parse-full
 * Parse BRD with full structure using BRD_PARSER_SYSTEM_PROMPT
 */
router.post(
  '/parse-full',
  authenticateUser, // Changed from requireProjectOwner to just authenticateUser
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('projectOverview').isObject().withMessage('Project overview is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { projectId, brdContent } = req.body;

      console.log('📄 Parsing full BRD structure...');

      // Get BRD content from database if not provided
      let contentToAnalyze = brdContent;
      if (!contentToAnalyze) {
        const { data: project } = await req.supabase!
          .from('projects')
          .select('brd_content')
          .eq('id', projectId)
          .single();
        
        contentToAnalyze = project?.brd_content;
      }

      if (!contentToAnalyze) {
        throw new AppError('No BRD content found for analysis', 400);
      }

      // Parse full BRD structure using BRD_PARSER_SYSTEM_PROMPT
      const parsedBRD = await parseBRDDocument(contentToAnalyze);

      console.log('✅ Full BRD structure parsed successfully');
      console.log(`📦 Extracted ${parsedBRD.modules?.length || 0} modules`);
      console.log(`📝 Extracted ${parsedBRD.businessRules?.length || 0} business rules`);

      // Save the parsed data to database
      if (parsedBRD.modules && parsedBRD.modules.length > 0) {
        for (const module of parsedBRD.modules) {
          // Insert module
          const { data: moduleData, error: moduleError } = await req.supabase!
            .from('modules')
            .insert({
              project_id: projectId,
              module_name: module.moduleName,
              description: module.moduleDescription,
              priority: module.priority || 'Medium',
              business_impact: module.businessImpact || null,
              dependencies: module.dependencies || [],
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
                  project_id: projectId,
                  module_id: moduleData.id,
                  title: story.title,
                  user_role: story.userRole || 'User',
                  description: story.description || '',
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
                console.log(`    Saving ${story.features.length} features for story: ${story.title}`);
                for (const feature of story.features) {
                  const featureData = {
                    project_id: projectId,
                    module_id: moduleData.id,
                    user_story_id: storyData.id,
                    title: feature.featureName,
                    description: feature.taskDescription,
                    priority: feature.priority || 'Medium',
                    estimated_hours: feature.estimated_hours ? parseInt(feature.estimated_hours) : null,
                    business_rules: feature.business_rules || null,
                    assignee: null,
                    status: 'Not Started'
                  };
                  
                  console.log('    Saving feature:', featureData.title);
                  
                  const { data: savedFeature, error: featureError } = await req.supabase!
                    .from('features')
                    .insert(featureData)
                    .select()
                    .single();
                  
                  if (featureError) {
                    console.error('    ❌ Error saving feature:', feature.featureName, featureError);
                  } else {
                    console.log('    ✅ Feature saved with ID:', savedFeature.id);
                  }
                }
                console.log(`    ✅ All features processed for story: ${story.title}`);
              }
            }
          }
        }
      }

      // Save business rules
      if (parsedBRD.businessRules && parsedBRD.businessRules.length > 0) {
        const businessRulesConfig = {
          categories: parsedBRD.businessRules.map(rule => ({
            id: rule.ruleName.toLowerCase().replace(/\s+/g, '-'),
            name: rule.ruleName,
            description: rule.ruleDescription,
            applicableTo: rule.applicableTo
          })),
          applyToAllProjects: false,
          specificModules: []
        };

        // Check if business rules already exist
        const { data: existingRules } = await req.supabase!
          .from('business_rules')
          .select('id')
          .eq('project_id', projectId)
          .single();

        if (existingRules) {
          // Update existing
          await req.supabase!
            .from('business_rules')
            .update({
              config: businessRulesConfig,
              apply_to_all_project: false,
              specific_modules: [],
              updated_at: new Date().toISOString()
            })
            .eq('project_id', projectId);
        } else {
          // Insert new
          await req.supabase!
            .from('business_rules')
            .insert({
              project_id: projectId,
              config: businessRulesConfig,
              apply_to_all_project: false,
              specific_modules: []
            });
        }

        console.log(`✅ ${parsedBRD.businessRules.length} business rules saved`);
      }

      // Save tech stack suggestions if present
      if (parsedBRD.techStackSuggestions) {
        await req.supabase!
          .from('tech_stack')
          .upsert({
            project_id: projectId,
            tech_stack: parsedBRD.techStackSuggestions
          });

        console.log('✅ Tech stack suggestions saved');
      }

      res.json({
        success: true,
        message: 'Full BRD structure parsed and saved successfully',
        parsedBRD: {
          modules: parsedBRD.modules || [],
          businessRules: parsedBRD.businessRules || [],
          techStackSuggestions: parsedBRD.techStackSuggestions || null,
          uiUxGuidelines: parsedBRD.uiUxGuidelines || null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/analyze-overview
 * Analyze BRD content to extract project overview only
 */
router.post(
  '/analyze-overview',
  requireProjectOwner,
  [
    body('brdContent').notEmpty().withMessage('BRD content is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { brdContent } = req.body;

      console.log('📄 Analyzing BRD for project overview...');
      console.log(`📊 Content length: ${brdContent.length} characters`);

      // Analyze BRD using OpenAI to get project overview
      const projectOverview = await analyzeProjectOverview(brdContent);

      console.log('✅ Project overview analyzed successfully');

      res.json({
        success: true,
        message: 'Project overview analyzed successfully',
        projectOverview
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/parse-project-details
 * Parse project information to generate modules, user stories, and features
 */
router.post(
  '/parse-project-details',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('projectOverview').isObject().withMessage('Project overview is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { projectId, projectOverview } = req.body;
      
      console.log('📄 Parsing project details for project:', projectId);
      
      // Parse the project details using BRD_PARSER_SYSTEM_PROMPT
      const parsedData = await parseBRDWithProjectOverview(projectOverview);
      
      console.log('✅ Project details parsed successfully');
      console.log(`📦 Extracted ${parsedData.modules?.length || 0} modules`);
      
      // Save the parsed data to database
      await saveParsedDataToDatabase(req.supabase!, projectId, parsedData);
      
      res.json({
        success: true,
        message: 'Project details parsed and saved successfully',
        data: parsedData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/create-from-brd
 * Create a project from BRD and immediately analyze project overview
 */
router.post(
  '/create-from-brd',
  requireProjectOwner,
  [
    body('brdContent').notEmpty().withMessage('BRD content is required'),
    body('projectName').notEmpty().withMessage('Project name is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      console.log('📄 Creating project from BRD and analyzing...');
      console.log(`📊 Content length: ${brdContent.length} characters`);

      // First, analyze the BRD to extract project overview using BRD_PROJECT_OVERVIEW prompt
      console.log('🤖 Analyzing BRD for project overview...');
      const analysisResult = await analyzeProjectOverview(brdContent);
      const { projectOverview, ApplicationType } = analysisResult;
      console.log('✅ Project overview analyzed successfully');
      console.log(`📱 ApplicationType: ${ApplicationType}`);

      // Extract description from the analyzed overview
      const projectDescription = projectOverview.projectDescription || 'Project created from BRD';

      // Create project with BRD flag and analyzed data
      const { data: project, error: projectError } = await req.supabase!
        .from('projects')
        .insert({
          name: projectName,
          description: projectDescription,
          created_by: req.user!.id,
          created_by_name: req.user!.name,
          created_by_role: req.user!.role,
          completion_percentage: 0,
          from_brd: true,
          brd_content: brdContent,
          application_type: ApplicationType
        })
        .select()
        .single();

      if (projectError) {
        throw new AppError(projectError.message, 400);
      }

      console.log('✅ Project created from BRD:', project.id);

      // Save the analyzed project overview to project_information table
      if (projectOverview) {
        const { businessIntent, requirements } = projectOverview;

        const { error: infoError } = await req.supabase!
          .from('project_information')
          .upsert({
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

        if (infoError) {
          console.error('Error saving project information:', infoError);
          // Don't fail the entire request if project info save fails
        } else {
          console.log('✅ Project information saved');
        }
      }

      res.json({
        success: true,
        message: 'Project created and analyzed successfully',
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          application_type: ApplicationType
        },
        projectOverview: projectOverview, // Include the analyzed overview in response
        ApplicationType: ApplicationType
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/parse
 * Parse a BRD document using OpenAI (full parsing)
 */
router.post(
  '/parse',
  requireProjectOwner,
  [
    body('brdContent').notEmpty().withMessage('BRD content is required'),
    body('projectName').optional()
  ],
  async (req: AuthRequest, res: any, next: any) => {
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
        const name = projectName || parsedBRD.projectOverview?.projectName || 'Untitled Project';
        const description = parsedBRD.projectOverview?.projectDescription || '';

        // Create project
        const { data: project, error: projectError } = await req.supabase!
          .from('projects')
          .insert({
            name,
            description,
            created_by: req.user!.id,
            created_by_name: req.user!.name,
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
            .upsert({
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

      // Save application type if present
      if (parsedBRD.ApplicationType) {
        await req.supabase!
          .from('projects')
          .update({ application_type: parsedBRD.ApplicationType })
          .eq('id', project.id);
        console.log('✅ Application type saved:', parsedBRD.ApplicationType);
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
                priority: module.priority || 'Medium',
                business_impact: module.businessImpact || null,
                dependencies: module.dependencies || [],
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
                    user_role: story.userRole || story.description?.match(/As (?:a|an) ([^,]+),/)?.[1] || 'User',
                    description: story.description || '',
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
                  console.log(`    Saving ${story.features.length} features for story: ${story.title}`);
                  for (const feature of story.features) {
                    const featureData = {
                      project_id: project.id,
                      module_id: moduleData.id,
                      user_story_id: storyData.id,
                      title: feature.featureName,
                      description: feature.taskDescription,
                      priority: feature.priority || 'Medium',
                      estimated_hours: feature.estimated_hours ? parseInt(feature.estimated_hours) : null,
                      assignee: null,
                      status: 'Not Started'
                    };
                    
                    console.log('    Saving feature:', featureData.title);
                    
                    const { data: savedFeature, error: featureError } = await req.supabase!
                      .from('features')
                      .insert(featureData)
                      .select()
                      .single();
                    
                    if (featureError) {
                      console.error('    ❌ Error saving feature:', feature.featureName, featureError);
                    } else {
                      console.log('    ✅ Feature saved with ID:', savedFeature.id);
                    }
                  }
                  console.log(`    ✅ All features processed for story: ${story.title}`);
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

        // Save tech stack suggestions
        if (parsedBRD.techStackSuggestions) {
          await req.supabase!
            .from('tech_stack')
            .upsert({
              project_id: project.id,
              tech_stack: parsedBRD.techStackSuggestions
            });

          console.log('✅ Tech stack suggestions saved');
        }

        // Save UI/UX guidelines (store as JSON in project_information)
        if (parsedBRD.uiUxGuidelines) {
          await req.supabase!
            .from('project_information')
            .update({
              ui_ux_guidelines: parsedBRD.uiUxGuidelines
            })
            .eq('project_id', project.id);

          console.log('✅ UI/UX guidelines saved');
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
 * POST /api/brd/enhance-dynamic
 * Enhance a specific section using DYNAMIC_PROMPT
 */
router.post(
  '/enhance-dynamic',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('targetType').isIn(['module', 'userStory', 'feature']).withMessage('Valid target type is required'),
    body('targetId').notEmpty().withMessage('Target ID is required'),
    body('enhancementRequest').notEmpty().withMessage('Enhancement request is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { targetType, targetId, enhancementRequest } = req.body;
      
      console.log('🎯 Enhancing', targetType, 'with ID:', targetId);
      
      // Get the current data based on target type
      let currentData: any = null;
      
      if (targetType === 'module') {
        const { data } = await req.supabase!
          .from('modules')
          .select('*, user_stories(*, features(*))')
          .eq('id', targetId)
          .single();
        currentData = data;
      } else if (targetType === 'userStory') {
        const { data } = await req.supabase!
          .from('user_stories')
          .select('*, features(*)')
          .eq('id', targetId)
          .single();
        currentData = data;
      } else if (targetType === 'feature') {
        const { data } = await req.supabase!
          .from('features')
          .select('*')
          .eq('id', targetId)
          .single();
        currentData = data;
      }
      
      if (!currentData) {
        throw new AppError('Target not found', 404);
      }
      
      // Enhance using DYNAMIC_PROMPT
      const enhancedData = await enhanceWithDynamicPrompt(currentData, targetType, enhancementRequest);
      
      console.log('✅ Enhancement completed');
      
      res.json({
        success: true,
        data: enhancedData
      });
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
  async (req: AuthRequest, res: any, next: any) => {
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
      const [projectRes, modulesRes, userStoriesRes, featuresRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId)
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
          priority: m.priority,
          businessImpact: m.business_impact,
          dependencies: m.dependencies,
          userStories: userStoriesRes.data
            ?.filter((us: any) => us.module_id === m.id)
            .map((us: any) => ({
              title: us.title,
              userRole: us.user_role,
              description: us.description || '',
              priority: us.priority as any,
              acceptanceCriteria: us.acceptance_criteria?.split('\n') || [],
              features: featuresRes.data
                ?.filter((f: any) => f.user_story_id === us.id)
                .map((f: any) => ({
                  featureName: f.title,
                  taskDescription: f.description || '',
                  priority: f.priority as any,
                  estimated_hours: f.estimated_hours?.toString(),
                  business_rules: f.business_rules
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
 * POST /api/brd/enhance-modules
 * Enhance selected modules with AI
 */
router.post(
  '/enhance-modules',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('modules').isArray().withMessage('Modules array is required'),
    body('enhancementRequest').notEmpty().withMessage('Enhancement request is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { projectId, modules, enhancementRequest } = req.body;

      // Fetch user stories and features for each module
      const modulesWithRelatedData = await Promise.all(modules.map(async (module: any) => {
        // Fetch user stories for this module
        const { data: userStories } = await req.supabase!
          .from('user_stories')
          .select('*')
          .eq('module_id', module.id)
          .eq('project_id', projectId);

        // Fetch features for this module
        const { data: features } = await req.supabase!
          .from('features')
          .select('*')
          .eq('module_id', module.id)
          .eq('project_id', projectId);

        // Build the complete module structure with user stories and features
        const userStoriesWithFeatures = userStories?.map(story => {
          const storyFeatures = features?.filter(f => f.user_story_id === story.id) || [];
          return {
            id: story.id,
            title: story.title,
            userRole: story.user_role,
            description: story.description,
            acceptanceCriteria: story.acceptance_criteria?.split('\n') || [],
            priority: story.priority,
            features: storyFeatures.map(f => ({
              id: f.id,
              featureName: f.title,
              taskDescription: f.description,
              priority: f.priority,
              estimated_hours: f.estimated_hours,
              business_rules: f.business_rules
            }))
          };
        }) || [];

        return {
          id: module.id,
          moduleName: module.module_name || module.moduleName,
          description: module.description,
          priority: module.priority,
          businessImpact: module.business_impact || module.businessImpact,
          dependencies: module.dependencies,
          status: module.status,
          userStories: userStoriesWithFeatures
        };
      }));

      console.log(`📊 Enhancing ${modulesWithRelatedData.length} modules with their user stories and features`);

      // Create a minimal ParsedBRD structure with just the modules
      const projectDataForEnhancement: ParsedBRD = {
        projectOverview: {
          projectName: '',
          projectDescription: '',
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
        modules: modulesWithRelatedData,
        businessRules: []
      };

      // Enhance modules with complete data using OpenAI
      const enhancedData = await enhanceProjectSection({
        existingProjectJson: projectDataForEnhancement,
        enhancementRequest,
        targetType: 'module'
      });

      // Extract the enhanced modules from the response
      let enhancedModules = modulesWithRelatedData;
      if (enhancedData?.updatedObject) {
        if (enhancedData.targetType === 'module') {
          // Single module was enhanced
          const updatedModule = enhancedData.updatedObject as any;
          enhancedModules = modulesWithRelatedData.map(m => 
            m.id === updatedModule.id ? updatedModule : m
          );
        } else if (enhancedData.targetType === 'project') {
          // Full project structure was enhanced - extract modules
          const updatedProject = enhancedData.updatedObject as ParsedBRD;
          if (updatedProject.modules) {
            enhancedModules = updatedProject.modules;
          }
        } else if ((enhancedData.updatedObject as any).modules) {
          // Direct modules array in response
          enhancedModules = (enhancedData.updatedObject as any).modules;
        } else if (Array.isArray(enhancedData.updatedObject)) {
          // Direct array of modules
          enhancedModules = enhancedData.updatedObject;
        }
      }

      // Save enhanced data to Supabase
      const savedModules: any[] = [];
      const savedUserStories: any[] = [];
      const savedFeatures: any[] = [];

      for (const module of enhancedModules) {
        try {
          // Update module in database
          const moduleToSave = {
            id: module.id,
            project_id: projectId,
            module_name: module.moduleName || module.module_name,
            description: module.description || module.moduleDescription,
            priority: module.priority || 'Medium',
            business_impact: module.businessImpact || module.business_impact,
            dependencies: Array.isArray(module.dependencies) 
              ? module.dependencies.join(', ') 
              : (module.dependencies || ''),
            status: module.status || 'Not Started'
          };

          const { data: savedModule, error: moduleError } = await req.supabase!
            .from('modules')
            .upsert(moduleToSave, { onConflict: 'id' })
            .select()
            .single();

          if (moduleError) {
            console.error(`❌ Error saving module ${module.id}:`, moduleError);
            continue;
          }

          savedModules.push(savedModule);
          console.log(`✅ Enhanced module saved: ${moduleToSave.module_name}`);

          // Save user stories if present
          if (module.userStories && Array.isArray(module.userStories)) {
            for (const story of module.userStories) {
              try {
                const storyToSave = {
                  id: story.id || crypto.randomUUID(),
                  project_id: projectId,
                  module_id: module.id,
                  title: story.title,
                  user_role: story.userRole || story.user_role || 'User',
                  description: story.description || '',
                  acceptance_criteria: Array.isArray(story.acceptanceCriteria)
                    ? story.acceptanceCriteria.join('\n')
                    : (story.acceptanceCriteria || story.acceptance_criteria || ''),
                  priority: story.priority || 'Medium',
                  status: story.status || 'Not Started'
                };

                const { data: savedStory, error: storyError } = await req.supabase!
                  .from('user_stories')
                  .upsert(storyToSave, { onConflict: 'id' })
                  .select()
                  .single();

                if (storyError) {
                  console.error(`  ❌ Error saving user story:`, storyError);
                  continue;
                }

                savedUserStories.push(savedStory);
                console.log(`  ✅ Enhanced user story saved: ${story.title}`);

                // Save features if present
                if (story.features && Array.isArray(story.features)) {
                  for (const feature of story.features) {
                    try {
                      const featureToSave = {
                        id: feature.id || crypto.randomUUID(),
                        project_id: projectId,
                        module_id: module.id,
                        user_story_id: story.id || savedStory.id,
                        title: feature.featureName || feature.title || feature.name || 'Untitled Feature',
                        description: feature.taskDescription || feature.description || '',
                        priority: feature.priority || 'Medium',
                        status: feature.status || 'Not Started',
                        business_rules: feature.business_rules || feature.businessRules || null,
                        estimated_hours: feature.estimated_hours || feature.estimatedHours || null,
                        assignee: feature.assignee || null
                      };

                      const { data: savedFeature, error: featureError } = await req.supabase!
                        .from('features')
                        .upsert(featureToSave, { onConflict: 'id' })
                        .select()
                        .single();

                      if (featureError) {
                        console.error(`    ❌ Error saving feature:`, featureError);
                        continue;
                      }

                      savedFeatures.push(savedFeature);
                      console.log(`    ✅ Enhanced feature saved: ${featureToSave.title}`);
                    } catch (featureErr) {
                      console.error('    ❌ Unexpected error saving feature:', featureErr);
                    }
                  }
                }
              } catch (storyErr) {
                console.error('  ❌ Unexpected error saving user story:', storyErr);
              }
            }
          }

          // Also check for features directly attached to modules
          if (module.features && Array.isArray(module.features)) {
            for (const feature of module.features) {
              try {
                const featureToSave = {
                  id: feature.id || crypto.randomUUID(),
                  project_id: projectId,
                  module_id: module.id,
                  user_story_id: feature.userStoryId || feature.user_story_id || null,
                  title: feature.featureName || feature.title || feature.name || 'Untitled Feature',
                  description: feature.taskDescription || feature.description || '',
                  priority: feature.priority || 'Medium',
                  status: feature.status || 'Not Started',
                  business_rules: feature.business_rules || feature.businessRules || null,
                  estimated_hours: feature.estimated_hours || feature.estimatedHours || null,
                  assignee: feature.assignee || null
                };

                const { data: savedFeature, error: featureError } = await req.supabase!
                  .from('features')
                  .upsert(featureToSave, { onConflict: 'id' })
                  .select()
                  .single();

                if (featureError) {
                  console.error(`  ❌ Error saving module feature:`, featureError);
                  continue;
                }

                savedFeatures.push(savedFeature);
                console.log(`  ✅ Enhanced module feature saved: ${featureToSave.title}`);
              } catch (featureErr) {
                console.error('  ❌ Unexpected error saving module feature:', featureErr);
              }
            }
          }
        } catch (moduleErr) {
          console.error('❌ Unexpected error saving module:', moduleErr);
        }
      }

      console.log(`
📊 Enhancement Summary:
  - Modules saved: ${savedModules.length}
  - User Stories saved: ${savedUserStories.length}
  - Features saved: ${savedFeatures.length}
      `);

      res.json({
        success: true,
        data: enhancedModules,
        saved: {
          modules: savedModules.length,
          userStories: savedUserStories.length,
          features: savedFeatures.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/enhance-user-stories
 * Enhance user stories for selected modules
 */
router.post(
  '/enhance-user-stories',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('userStories').isArray().withMessage('User stories array is required'),
    body('modules').isArray().withMessage('Modules array is required'),
    body('enhancementRequest').notEmpty().withMessage('Enhancement request is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { projectId, userStories, modules, enhancementRequest } = req.body;

      // Fetch features for each user story to provide full context
      const userStoriesWithFeatures = await Promise.all(userStories.map(async (story: any) => {
        const { data: features } = await req.supabase!
          .from('features')
          .select('*')
          .eq('user_story_id', story.id)
          .eq('project_id', projectId);

        return {
          ...story,
          features: features?.map(f => ({
            id: f.id,
            featureName: f.title,
            taskDescription: f.description,
            priority: f.priority,
            estimated_hours: f.estimated_hours,
            business_rules: f.business_rules
          })) || []
        };
      }));

      // Create a structure with modules and their user stories with features
      const modulesWithStories = modules.map((module: any) => ({
        id: module.id,
        moduleName: module.module_name || module.moduleName,
        description: module.description,
        priority: module.priority,
        businessImpact: module.business_impact || module.businessImpact,
        dependencies: module.dependencies,
        userStories: userStoriesWithFeatures.filter((story: any) => 
          story.moduleId === module.id || story.module_id === module.id
        )
      }));

      console.log(`📊 Enhancing ${userStoriesWithFeatures.length} user stories across ${modules.length} modules`);

      // Create a minimal ParsedBRD structure
      const projectDataForEnhancement: ParsedBRD = {
        projectOverview: {
          projectName: '',
          projectDescription: '',
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
        modules: modulesWithStories,
        businessRules: []
      };

      // Enhance user stories using OpenAI
      const enhancedData = await enhanceProjectSection({
        existingProjectJson: projectDataForEnhancement,
        enhancementRequest,
        targetType: 'userStory'
      });

      // Extract and process enhanced data
      let enhancedStories: any[] = [];
      let enhancedModulesData: any[] = [];

      if (enhancedData?.updatedObject) {
        if (enhancedData.targetType === 'userStory') {
          // Single user story was enhanced
          const updatedStory = enhancedData.updatedObject as any;
          enhancedStories = [updatedStory];
        } else if (enhancedData.targetType === 'project') {
          // Full project structure was enhanced
          const updatedProject = enhancedData.updatedObject as ParsedBRD;
          if (updatedProject.modules) {
            enhancedModulesData = updatedProject.modules;
            // Extract user stories from modules
            updatedProject.modules.forEach((module: any) => {
              if (module.userStories && Array.isArray(module.userStories)) {
                module.userStories.forEach((story: any) => {
                  enhancedStories.push({
                    ...story,
                    moduleId: module.id || story.moduleId || story.module_id
                  });
                });
              }
            });
          }
        } else if ((enhancedData.updatedObject as any).modules) {
          // Direct modules array in response
          enhancedModulesData = (enhancedData.updatedObject as any).modules;
          enhancedModulesData.forEach((module: any) => {
            if (module.userStories && Array.isArray(module.userStories)) {
              module.userStories.forEach((story: any) => {
                enhancedStories.push({
                  ...story,
                  moduleId: module.id || story.moduleId || story.module_id
                });
              });
            }
          });
        } else if (Array.isArray(enhancedData.updatedObject)) {
          // Direct array - could be user stories or modules
          const firstItem = enhancedData.updatedObject[0];
          if (firstItem && firstItem.userStories) {
            // Array of modules
            enhancedModulesData = enhancedData.updatedObject;
            enhancedData.updatedObject.forEach((module: any) => {
              if (module.userStories && Array.isArray(module.userStories)) {
                module.userStories.forEach((story: any) => {
                  enhancedStories.push({
                    ...story,
                    moduleId: module.id || story.moduleId || story.module_id
                  });
                });
              }
            });
          } else {
            // Direct array of user stories
            enhancedStories = enhancedData.updatedObject;
          }
        }
      }

      // Save enhanced data to Supabase
      const savedUserStories: any[] = [];
      const savedFeatures: any[] = [];

      for (const story of enhancedStories) {
        try {
          // Find the module ID for this story
          const moduleId = story.moduleId || story.module_id || 
            userStories.find((s: any) => s.id === story.id)?.module_id ||
            userStories.find((s: any) => s.id === story.id)?.moduleId;

          if (!moduleId) {
            console.error(`⚠️ No module ID found for user story: ${story.title}`);
            continue;
          }

          const storyToSave = {
            id: story.id || crypto.randomUUID(),
            project_id: projectId,
            module_id: moduleId,
            title: story.title,
            user_role: story.userRole || story.user_role || 'User',
            description: story.description || '',
            acceptance_criteria: Array.isArray(story.acceptanceCriteria)
              ? story.acceptanceCriteria.join('\n')
              : (story.acceptanceCriteria || story.acceptance_criteria || ''),
            priority: story.priority || 'Medium',
            status: story.status || 'Not Started'
          };

          const { data: savedStory, error: storyError } = await req.supabase!
            .from('user_stories')
            .upsert(storyToSave, { onConflict: 'id' })
            .select()
            .single();

          if (storyError) {
            console.error(`❌ Error saving user story:`, storyError);
            continue;
          }

          savedUserStories.push(savedStory);
          console.log(`✅ Enhanced user story saved: ${story.title}`);

          // Save features if present
          if (story.features && Array.isArray(story.features)) {
            for (const feature of story.features) {
              try {
                const featureToSave = {
                  id: feature.id || crypto.randomUUID(),
                  project_id: projectId,
                  module_id: moduleId,
                  user_story_id: story.id || savedStory.id,
                  title: feature.featureName || feature.title || feature.name || 'Untitled Feature',
                  description: feature.taskDescription || feature.description || '',
                  priority: feature.priority || 'Medium',
                  status: feature.status || 'Not Started',
                  business_rules: feature.business_rules || feature.businessRules || null,
                  estimated_hours: feature.estimated_hours || feature.estimatedHours || null,
                  assignee: feature.assignee || null
                };

                const { data: savedFeature, error: featureError } = await req.supabase!
                  .from('features')
                  .upsert(featureToSave, { onConflict: 'id' })
                  .select()
                  .single();

                if (featureError) {
                  console.error(`  ❌ Error saving feature:`, featureError);
                  continue;
                }

                savedFeatures.push(savedFeature);
                console.log(`  ✅ Enhanced feature saved: ${featureToSave.title}`);
              } catch (featureErr) {
                console.error('  ❌ Unexpected error saving feature:', featureErr);
              }
            }
          }
        } catch (storyErr) {
          console.error('❌ Unexpected error saving user story:', storyErr);
        }
      }

      console.log(`
📊 Enhancement Summary:
  - User Stories saved: ${savedUserStories.length}
  - Features saved: ${savedFeatures.length}
      `);

      res.json({
        success: true,
        data: enhancedStories,
        saved: {
          userStories: savedUserStories.length,
          features: savedFeatures.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/brd/enhance-business-rules
 * Enhance selected business rule categories with AI
 */
router.post(
  '/enhance-business-rules',
  requireProjectOwner,
  [
    body('projectId').isUUID().withMessage('Valid project ID is required'),
    body('categories').isArray().withMessage('Categories array is required'),
    body('enhancementRequest').notEmpty().withMessage('Enhancement request is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
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

      const { categories, enhancementRequest } = req.body;

      // Create a minimal ParsedBRD structure with business rules
      const projectDataForEnhancement: ParsedBRD = {
        projectOverview: {
          projectName: '',
          projectDescription: '',
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
        modules: [],
        businessRules: categories || []
      };

      // Enhance business rules using OpenAI
      const enhancedData = await enhanceProjectSection({
        existingProjectJson: projectDataForEnhancement,
        enhancementRequest,
        targetType: undefined // Let the service determine based on content
      });

      // Extract enhanced business rules
      let enhancedBusinessRules = categories;
      if (enhancedData?.updatedObject) {
        if (enhancedData.targetType === 'project') {
          // Full project structure - extract business rules
          const updatedProject = enhancedData.updatedObject as ParsedBRD;
          if (updatedProject.businessRules) {
            enhancedBusinessRules = updatedProject.businessRules;
          }
        } else if ((enhancedData.updatedObject as any).businessRules) {
          enhancedBusinessRules = (enhancedData.updatedObject as any).businessRules;
        } else {
          // Direct business rules array
          enhancedBusinessRules = enhancedData.updatedObject as any;
        }
      }

      res.json({
        success: true,
        data: enhancedBusinessRules
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
router.get('/check', async (_req: AuthRequest, res: any, next: any) => {
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

/**
 * POST /api/brd/generate-design-prompts
 * Generate design prompts for different application types
 */
router.post(
  '/generate-design-prompts',
  [
    body('projectId').isUUID().withMessage('Valid project ID is required')
  ],
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      if (!isOpenAIConfigured()) {
        throw new AppError('OpenAI is not configured', 500);
      }

      const { projectId } = req.body;

      // Fetch project data to build ParsedBRD structure
      const [projectRes, modulesRes, userStoriesRes, featuresRes, businessRulesRes, techStackRes] = await Promise.all([
        req.supabase!.from('projects').select('*').eq('id', projectId).single(),
        req.supabase!.from('modules').select('*').eq('project_id', projectId),
        req.supabase!.from('user_stories').select('*').eq('project_id', projectId),
        req.supabase!.from('features').select('*').eq('project_id', projectId),
        req.supabase!.from('business_rules').select('*').eq('project_id', projectId).single(),
        req.supabase!.from('tech_stack').select('*').eq('project_id', projectId).single()
      ]);

      // Build ParsedBRD structure
      const projectData: ParsedBRD = {
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
          priority: m.priority,
          businessImpact: m.business_impact,
          dependencies: m.dependencies,
          userStories: userStoriesRes.data
            ?.filter((us: any) => us.module_id === m.id)
            .map((us: any) => ({
              title: us.title,
              userRole: us.user_role,
              description: us.description || '',
              priority: us.priority as any,
              acceptanceCriteria: us.acceptance_criteria?.split('\n') || [],
              features: featuresRes.data
                ?.filter((f: any) => f.user_story_id === us.id)
                .map((f: any) => ({
                  featureName: f.title,
                  taskDescription: f.description || '',
                  priority: f.priority as any,
                  estimated_hours: f.estimated_hours?.toString(),
                  business_rules: f.business_rules
                })) || []
            })) || []
        })) || [],
        businessRules: businessRulesRes.data?.config?.categories || [],
        techStackSuggestions: techStackRes.data?.tech_stack || undefined,
        uiUxGuidelines: undefined // Will be fetched from project_information if needed
      };

      // Get application type from project
      const appTypeRes = await req.supabase!
        .from('projects')
        .select('application_type')
        .eq('id', projectId)
        .single();

      // Generate design prompts
      const designPrompts = await generateDesignPrompts(projectData, appTypeRes.data?.application_type);

      res.json({
        success: true,
        prompts: designPrompts
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function to save parsed data to database
async function saveParsedDataToDatabase(supabase: SupabaseClient, projectId: string, parsedData: ParsedBRD) {
  console.log('💾 Saving parsed data to database for project:', projectId);
  
  try {
    // Save modules
    if (parsedData.modules && parsedData.modules.length > 0) {
      console.log(`📦 Saving ${parsedData.modules.length} modules...`);
      
      for (const module of parsedData.modules) {
        const moduleData = {
          id: crypto.randomUUID(),
          project_id: projectId,
          module_name: module.moduleName,
          description: module.moduleDescription,
          priority: module.priority || 'Medium',
          business_impact: module.businessImpact,
          dependencies: module.dependencies?.join(', '),
          status: 'Not Started'
        };
        
        const { data: savedModule, error: moduleError } = await supabase
          .from('modules')
          .upsert(moduleData, { onConflict: 'id' })
          .select()
          .single();
        
        if (moduleError) {
          console.error('❌ Error saving module:', moduleError);
          continue;
        }
        
        console.log(`✅ Module saved: ${module.moduleName}`);
        
        // Save user stories for this module
        if (module.userStories && module.userStories.length > 0) {
          console.log(`  Saving ${module.userStories.length} user stories for module: ${module.moduleName}`);
          
          for (const story of module.userStories) {
            const storyData = {
              id: crypto.randomUUID(),
              project_id: projectId,
              module_id: savedModule.id,
              title: story.title,
              user_role: story.userRole,
              description: story.description,
              acceptance_criteria: story.acceptanceCriteria?.join('\n'),
              priority: story.priority || 'Medium',
              status: 'Not Started'
            };
            
            const { data: savedStory, error: storyError } = await supabase
              .from('user_stories')
              .upsert(storyData, { onConflict: 'id' })
              .select()
              .single();
            
            if (storyError) {
              console.error('  ❌ Error saving user story:', storyError);
              continue;
            }
            
            console.log(`  ✅ User story saved: ${story.title}`);
            
            // Save features for this user story
            if (story.features && story.features.length > 0) {
              console.log(`    Saving ${story.features.length} features for story: ${story.title}`);
              
              for (const feature of story.features) {
                const featureData = {
                  id: crypto.randomUUID(),
                  project_id: projectId,
                  module_id: savedModule.id,
                  user_story_id: savedStory.id,
                  title: feature.featureName,
                  description: feature.taskDescription,
                  priority: feature.priority || 'Medium',
                  estimated_hours: feature.estimated_hours ? parseInt(feature.estimated_hours) : null,
                  business_rules: feature.business_rules || null,
                  status: 'Not Started'
                };
                
                const { error: featureError } = await supabase
                  .from('features')
                  .upsert(featureData, { onConflict: 'id' })
                  .select();
                
                if (featureError) {
                  console.error('    ❌ Error saving feature:', featureError);
                } else {
                  console.log(`    ✅ Feature saved: ${feature.featureName}`);
                }
              }
            }
          }
        }
      }
    }
    
    // Save global business rules
    if (parsedData.businessRules && parsedData.businessRules.length > 0) {
      console.log(`📋 Saving ${parsedData.businessRules.length} business rules...`);
      
      const businessRulesConfig = {
        categories: parsedData.businessRules.map((rule: any) => ({
          id: crypto.randomUUID(),
          name: 'General',
          rules: [rule]
        }))
      };
      
      const { error: rulesError } = await supabase
        .from('business_rules')
        .upsert({
          project_id: projectId,
          config: businessRulesConfig,
          apply_to_all_project: true
        }, { onConflict: 'project_id' });
      
      if (rulesError) {
        console.error('❌ Error saving business rules:', rulesError);
      } else {
        console.log('✅ Business rules saved');
      }
    }
    
    // Save tech stack suggestions
    if (parsedData.techStackSuggestions) {
      console.log('💻 Saving tech stack suggestions...');
      
      const { error: techError } = await supabase
        .from('tech_stack')
        .upsert({
          project_id: projectId,
          tech_stack: parsedData.techStackSuggestions
        }, { onConflict: 'project_id' });
      
      if (techError) {
        console.error('❌ Error saving tech stack:', techError);
      } else {
        console.log('✅ Tech stack saved');
      }
    }
    
    // Save UI/UX guidelines
    if (parsedData.uiUxGuidelines) {
      console.log('🎨 Saving UI/UX guidelines...');
      
      const { error: uiError } = await supabase
        .from('uiux_guidelines')
        .upsert({
          project_id: projectId,
          guidelines: parsedData.uiUxGuidelines
        }, { onConflict: 'project_id' });
      
      if (uiError) {
        console.error('❌ Error saving UI/UX guidelines:', uiError);
      } else {
        console.log('✅ UI/UX guidelines saved');
      }
    }
    
    console.log('✅ All parsed data saved successfully');
  } catch (error) {
    console.error('❌ Error saving parsed data:', error);
    throw error;
  }
}

export default router;

