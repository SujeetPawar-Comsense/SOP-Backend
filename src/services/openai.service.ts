import OpenAI from 'openai';
import { BRD_PROJECT_OVERVIEW, BRD_PARSER_SYSTEM_PROMPT, DYNAMIC_PROMPT, STRUCT_TO_PROMPT } from '../config/prompts';
import { ParsedBRD, ProjectOverview, EnhancementRequest, EnhancementResponse, ApplicationType, DevelopmentType } from '../types/brd.types';

// Initialize OpenRouter client (compatible with OpenAI SDK)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AI Project SOP Platform'
  }
});

/**
 * Analyze BRD content to extract project overview only
 */
export async function analyzeProjectOverview(brdContent: string): Promise<{ projectOverview: ProjectOverview; ApplicationType: ApplicationType }> {
  try {
    console.log('🤖 Analyzing BRD for project overview with', process.env.OPENROUTER_MODEL);
    console.log(`📄 Content length: ${brdContent.length} characters`);

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: BRD_PROJECT_OVERVIEW
        },
        {
          role: 'user',
          content: `Please analyze this BRD and extract the project overview information:\n\n${brdContent}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI for project overview');
    }

    const result = JSON.parse(cleanJsonResponse(content)) as { projectOverview: ProjectOverview; ApplicationType: ApplicationType };
    console.log('✅ Project Overview and ApplicationType analyzed successfully');

    return result;
  } catch (error: any) {
    console.error('❌ Error analyzing project overview:', error.message);
    throw new Error(`Failed to analyze project overview: ${error.message}`);
  }
}

/**
 * Parse project details using project overview
 */
export async function parseBRDWithProjectOverview(projectOverview: any): Promise<ParsedBRD> {
  try {
    console.log('🤖 Parsing project details with BRD_PARSER_SYSTEM_PROMPT');
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: BRD_PARSER_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Given the following Project Overview:
${JSON.stringify(projectOverview, null, 2)}

ApplicationType: ${projectOverview.ApplicationType || 'Web Application'}

Please generate comprehensive modules, user stories, features, business rules, techStackSuggestions and uiUxGuidelines based on the project overview.`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const parsedData = JSON.parse(cleanJsonResponse(content)) as ParsedBRD;
    
    console.log(`✅ Project details parsed with ${parsedData.modules?.length || 0} modules`);
    
    return parsedData;
  } catch (error: any) {
    console.error('❌ Error parsing project details:', error.message);
    throw new Error(`Failed to parse project details: ${error.message}`);
  }
}

/**
 * Parse BRD document using OpenAI - Two-step process
 */
export async function parseBRDDocument(brdContent: string): Promise<ParsedBRD> {
  try {
    console.log('🤖 Starting two-step BRD parsing with', process.env.OPENROUTER_MODEL);
    console.log(`📄 Content length: ${brdContent.length} characters`);

    // Step 1: Extract Project Overview
    console.log('📋 Step 1: Extracting Project Overview...');
    const overviewResponse = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: BRD_PROJECT_OVERVIEW
        },
        {
          role: 'user',
          content: `Please analyze this BRD and extract the project overview information:\n\n${brdContent}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const overviewContent = overviewResponse.choices[0]?.message?.content;
    if (!overviewContent) {
      throw new Error('No response from OpenAI for project overview');
    }

    const overviewResult = JSON.parse(cleanJsonResponse(overviewContent)) as { projectOverview: ProjectOverview; ApplicationType: ApplicationType };
    console.log('✅ Project Overview and ApplicationType extracted');
    console.log(`📱 ApplicationType: ${overviewResult.ApplicationType}`);

    // Step 2: Extract Modules, User Stories, Features, and Generate Suggestions
    console.log('📋 Step 2: Extracting detailed structure and generating suggestions...');
    const detailsResponse = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: BRD_PARSER_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Given the following Project Overview:
${JSON.stringify(overviewResult.projectOverview, null, 2)}

ApplicationType: ${overviewResult.ApplicationType}

And the original BRD document:
${brdContent}

Please extract all modules, user stories, features, business rules, and generate techStackSuggestions and uiUxGuidelines based on the requirements and ApplicationType.`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const detailsContent = detailsResponse.choices[0]?.message?.content;
    if (!detailsContent) {
      throw new Error('No response from OpenAI for project details');
    }

    const projectDetails = JSON.parse(cleanJsonResponse(detailsContent)) as ParsedBRD;
    
    // Combine both results
    const parsedData: ParsedBRD = {
      projectOverview: overviewResult.projectOverview,
      ApplicationType: overviewResult.ApplicationType,
      modules: projectDetails.modules || [],
      businessRules: projectDetails.businessRules || [],
      techStackSuggestions: projectDetails.techStackSuggestions,
      uiUxGuidelines: projectDetails.uiUxGuidelines
    };

    console.log(`✅ BRD parsed successfully with ${parsedData.modules?.length || 0} modules`);
    
    return parsedData;
  } catch (error: any) {
    console.error('❌ Error parsing BRD:', error.message);
    throw new Error(`Failed to parse BRD: ${error.message}`);
  }
}

/**
 * Enhance specific section of project using AI
 */
export async function enhanceProjectSection(
  request: EnhancementRequest
): Promise<EnhancementResponse> {
  try {
    console.log('🤖 Enhancing project section with', process.env.OPENROUTER_MODEL);
    console.log(`🎯 Enhancement request: ${request.enhancementRequest}`);

    const existingProjectJson = JSON.stringify(request.existingProjectJson, null, 2);

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: DYNAMIC_PROMPT
        },
        {
          role: 'user',
          content: `[EXISTING PROJECT JSON]:
${existingProjectJson}

[USER'S ENHANCEMENT REQUEST]:
${request.enhancementRequest}

Please analyze, locate the target, apply the enhancement, and output ONLY the updated JSON object for the target level.`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('✅ Enhancement completed');
    
    // Clean the response and parse JSON
    const cleanedContent = cleanJsonResponse(content);
    const updatedObject = JSON.parse(cleanedContent);
    
    // Determine what type of object was returned
    let targetType: 'module' | 'userStory' | 'feature' = 'feature';
    
    if (updatedObject.moduleName && updatedObject.userStories) {
      targetType = 'module';
    } else if (updatedObject.userStory && updatedObject.features) {
      targetType = 'userStory';
    } else if (updatedObject.featureName && updatedObject.taskDescription) {
      targetType = 'feature';
    }

    return {
      updatedObject,
      targetType,
      message: 'Enhancement applied successfully'
    };
  } catch (error: any) {
    console.error('❌ Error enhancing section:', error.message);
    throw new Error(`Failed to enhance section: ${error.message}`);
  }
}

/**
 * Generate AI prompt for Vibe Engineers using STRUCT_TO_PROMPT
 */
export async function generateContextualPrompt(
  _projectId: string, // Will be used for fetching additional data in future
  projectData: any,
  developmentType: DevelopmentType | string, // Can be DevelopmentType or custom string
  previousOutputs: string[] = []
): Promise<string> {
  try {
    console.log(`🤖 Generating ${developmentType} prompt using STRUCT_TO_PROMPT...`);

    // Fetch complete project data including BRD parsed data
    const parsedBRD: ParsedBRD = {
      projectOverview: {
        projectName: projectData.name || 'Unnamed Project',
        projectDescription: projectData.description || 'No description',
        businessIntent: {
          vision: projectData.vision || '',
          purpose: projectData.purpose || '',
          objectives: projectData.objectives?.split('\n').filter(Boolean) || [],
          projectScope: {
            inScope: projectData.projectScope?.inScope || [],
            outOfScope: projectData.projectScope?.outOfScope || []
          }
        },
        requirements: {
          functional: projectData.functionalRequirements?.split('\n').filter(Boolean) || [],
          nonFunctional: projectData.nonFunctionalRequirements?.split('\n').filter(Boolean) || [],
          integration: projectData.integrationRequirements?.split('\n').filter(Boolean) || [],
          reporting: projectData.reportingRequirements?.split('\n').filter(Boolean) || []
        }
      },
      ApplicationType: projectData.application_type as ApplicationType || 'Web Application',
      modules: projectData.modules || [],
      businessRules: projectData.businessRules || [],
      techStackSuggestions: projectData.techStack,
      uiUxGuidelines: projectData.uiuxGuidelines
    };

    // Use STRUCT_TO_PROMPT with proper parameters
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: STRUCT_TO_PROMPT
        },
        {
          role: 'user',
          content: `ProjectJSON: ${JSON.stringify(parsedBRD, null, 2)}\n\nApplicationType: ${developmentType}\n\nPreviousOutputs: ${JSON.stringify(previousOutputs)}`
        }
      ],
      temperature: 0.7
    });

    const generatedPrompt = response.choices[0]?.message?.content || 'Failed to generate prompt';

    console.log(`✅ ${developmentType} prompt generated using STRUCT_TO_PROMPT`);
    
    return generatedPrompt;
  } catch (error: any) {
    console.error('❌ Error generating prompt:', error.message);
    throw new Error(`Failed to generate prompt: ${error.message}`);
  }
}

/**
 * Enhance data using DYNAMIC_PROMPT
 */
export async function enhanceWithDynamicPrompt(
  currentData: any,
  targetType: 'module' | 'userStory' | 'feature',
  enhancementRequest: string
): Promise<any> {
  try {
    console.log('🤖 Enhancing with DYNAMIC_PROMPT');
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: DYNAMIC_PROMPT
        },
        {
          role: 'user',
          content: `Enhancement Request: ${enhancementRequest}

Target Type: ${targetType}

Current Data:
${JSON.stringify(currentData, null, 2)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const enhancedData = JSON.parse(cleanJsonResponse(content));
    
    console.log('✅ Enhancement completed');
    
    return enhancedData;
  } catch (error: any) {
    console.error('❌ Error enhancing with DYNAMIC_PROMPT:', error.message);
    throw new Error(`Failed to enhance: ${error.message}`);
  }
}

/**
 * Check if OpenAI/OpenRouter is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Generate design prompts for different application types
 */
export async function generateDesignPrompts(projectData: ParsedBRD, applicationType?: string): Promise<string> {
  try {
    console.log('🎨 Generating design prompts...');
    const appType = applicationType || projectData.ApplicationType || 'Web Application';
    console.log(`📱 ApplicationType: ${appType}`);

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: STRUCT_TO_PROMPT
        },
        {
          role: 'user',
          content: `ProjectJSON: ${JSON.stringify(projectData, null, 2)}\n\nApplicationType: ${appType}\n\nPreviousOutputs: []\n\nGenerate a comprehensive prompt for building the ${appType}.`
        }
      ],
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('✅ Design prompts generated successfully');
    return content;
  } catch (error: any) {
    console.error('❌ Error generating design prompts:', error.message);
    throw new Error(`Failed to generate design prompts: ${error.message}`);
  }
}

/**
 * Helper function to clean JSON response from markdown code blocks
 */
function cleanJsonResponse(content: string): string {
  let cleanedContent = content.trim();
  
  // Remove ```json and ``` markers if present
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.substring(7); // Remove ```json
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.substring(3); // Remove ```
  }
  
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3); // Remove trailing ```
  }
  
  return cleanedContent.trim();
}

