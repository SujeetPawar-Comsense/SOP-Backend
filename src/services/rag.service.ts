/**
 * RAG Service Integration
 * This service communicates with the Python RAG API
 */

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8001';

interface ProjectData {
  project_information?: any;
  modules?: any[];
  user_stories?: any[];
  features?: any[];
  business_rules?: any;
  tech_stack?: any;
  uiux_guidelines?: any;
}

interface RAGResponse {
  success: boolean;
  answer?: string;
  message?: string;
}

/**
 * Initialize RAG system with project data
 */
export async function initializeRAG(projectId: string, projectData: ProjectData): Promise<void> {
  try {
    const response = await fetch(`${RAG_API_URL}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        project_data: projectData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize RAG');
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error initializing RAG:', error);
    throw error;
  }
}

/**
 * Query RAG system with a question
 */
export async function queryRAG(projectId: string, question: string): Promise<string> {
  try {
    const response = await fetch(`${RAG_API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        question: question,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to query RAG');
    }

    const result: RAGResponse = await response.json();
    if (result.success && result.answer) {
      return result.answer;
    }
    throw new Error(result.message || 'No answer received from RAG');
  } catch (error: any) {
    console.error('Error querying RAG:', error);
    throw error;
  }
}

/**
 * Check if RAG service is healthy
 */
export async function checkRAGHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAG_API_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

