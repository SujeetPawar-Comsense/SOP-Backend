import OpenAI from 'openai';
import { BRD_PARSER_SYSTEM_PROMPT, DYNAMIC_PROMPT } from '../config/prompts';
import { ParsedBRD, EnhancementRequest, EnhancementResponse } from '../types/brd.types';

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
 * Parse BRD document using OpenAI
 */
export async function parseBRDDocument(brdContent: string): Promise<ParsedBRD> {
  try {
    console.log('🤖 Parsing BRD with', process.env.OPENROUTER_MODEL);
    console.log(`📄 Content length: ${brdContent.length} characters`);

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: BRD_PARSER_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Please analyze this BRD and extract all information according to the specified JSON structure:\n\n${brdContent}`
        }
      ],
      temperature: 0.3, // Lower for more consistent, factual output
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('✅ BRD parsed successfully');
    
    // Parse JSON response
    const parsedData = JSON.parse(content) as ParsedBRD;
    
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
    
    const updatedObject = JSON.parse(content);
    
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
  projectId: string,
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

