import OpenAI from 'openai';
import { BRD_PROJECT_OVERVIEW, BRD_PARSER_SYSTEM_PROMPT, DYNAMIC_PROMPT, STRUCT_TO_PROMPT } from '../config/prompts';
import { ParsedBRD, ProjectOverview, EnhancementRequest, EnhancementResponse } from '../types/brd.types';

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
export async function analyzeProjectOverview(brdContent: string): Promise<ProjectOverview> {
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

    const result = JSON.parse(cleanJsonResponse(content)) as { projectOverview: ProjectOverview };
    console.log('✅ Project Overview analyzed successfully');

    return result.projectOverview;
  } catch (error: any) {
    console.error('❌ Error analyzing project overview:', error.message);
    throw new Error(`Failed to analyze project overview: ${error.message}`);
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

    const projectOverview = JSON.parse(cleanJsonResponse(overviewContent)) as { projectOverview: ProjectOverview };
    console.log('✅ Project Overview extracted');

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
${JSON.stringify(projectOverview.projectOverview, null, 2)}

And the original BRD document:
${brdContent}

Please extract all modules, user stories, features, business rules, and generate techStackSuggestions and uiUxGuidelines based on the requirements.`
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
      projectOverview: projectOverview.projectOverview,
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
      temperature: 0.4,
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
 * Generate AI prompt for Vibe Engineers
 */
export async function generateContextualPrompt(
  _projectId: string, // Prefixed with underscore to indicate intentionally unused
  projectData: any,
  promptType: string
): Promise<string> {
  try {
    console.log(`🤖 Generating ${promptType} prompt...`);

    // Build context from project data
    const context = `
Project: ${projectData.name || 'Unnamed Project'}
Description: ${projectData.description || 'No description'}

Modules: ${projectData.modules?.length || 0}
User Stories: ${projectData.userStories?.length || 0}
Features: ${projectData.features?.length || 0}
    `.trim();

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software developer assistant. Generate detailed, context-aware prompts for developers to build features based on project requirements.'
        },
        {
          role: 'user',
          content: `Generate a comprehensive development prompt for this project:

${context}

Prompt Type: ${promptType}

The prompt should include:
1. Project context and requirements
2. Technical specifications
3. Implementation guidelines
4. Testing requirements
5. Code examples where relevant

Format the output as a detailed prompt that a developer can use with AI coding assistants.`
        }
      ],
      temperature: 0.7
    });

    const generatedPrompt = response.choices[0]?.message?.content || 'Failed to generate prompt';

    console.log('✅ Prompt generated');
    
    return generatedPrompt;
  } catch (error: any) {
    console.error('❌ Error generating prompt:', error.message);
    throw new Error(`Failed to generate prompt: ${error.message}`);
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
export async function generateDesignPrompts(projectData: ParsedBRD): Promise<string> {
  try {
    console.log('🎨 Generating design prompts...');

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: STRUCT_TO_PROMPT
        },
        {
          role: 'user',
          content: `Based on the following project structure, generate the four design prompts:\n\n${JSON.stringify(projectData, null, 2)}`
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

