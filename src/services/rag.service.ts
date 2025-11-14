/**
 * RAG Service Integration
 * Connects the backend with the Python RAG service
 */

import axios from 'axios';
import { supabase } from '../config/supabase';

// Configuration for the RAG service
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';
const RAG_SERVICE_TIMEOUT = parseInt(process.env.RAG_SERVICE_TIMEOUT || '5000'); // Reduced to 5 seconds

interface ProjectData {
  projectName: string;
  projectDescription: string;
  businessObjectives?: string[];
  businessRequirements?: string[];
  modules: any[];
  [key: string]: any;
}

interface RAGQueryRequest {
  question: string;
  n_results?: number;
  min_similarity?: number;
  include_context?: boolean;
  session_id?: string;
}

interface RAGQueryResponse {
  question: string;
  answer: string;
  retrieved_chunks: number;
  status: string;
  context?: string[];
  context_metadata?: any[];
  timestamp?: string;
  session_id?: string;
}

class RAGService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: RAG_SERVICE_URL,
      timeout: RAG_SERVICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if RAG service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('RAG Service health check failed:', error);
      return false;
    }
  }

  /**
   * Ingest a project into the RAG system
   */
  async ingestProject(projectId: string, clearExisting: boolean = false): Promise<any> {
    try {
      // Fetch complete project data from Supabase
      const projectData = await this.fetchCompleteProjectData(projectId);
      
      if (!projectData) {
        throw new Error('Project not found');
      }

      // Send to RAG service for ingestion
      const response = await this.axiosInstance.post('/ingest', {
        project_data: projectData,
        clear_existing: clearExisting,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to ingest project:', error);
      throw error;
    }
  }

  /**
   * Query the RAG system
   */
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    try {
      const response = await this.axiosInstance.post('/query', request);
      return response.data;
    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Batch query the RAG system
   */
  async batchQuery(questions: string[], includeContext: boolean = false): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/batch_query', {
        questions,
        include_context: includeContext,
      });
      return response.data;
    } catch (error) {
      console.error('RAG batch query failed:', error);
      throw error;
    }
  }

  /**
   * Get RAG system statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get RAG stats:', error);
      throw error;
    }
  }

  /**
   * Clear the vector store
   */
  async clearVectorStore(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/clear');
      return response.data;
    } catch (error) {
      console.error('Failed to clear vector store:', error);
      throw error;
    }
  }

  /**
   * Fetch complete project data from Supabase
   */
  private async fetchCompleteProjectData(projectId: string): Promise<ProjectData | null> {
    try {
      // Fetch project information
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        console.error('Project fetch error:', projectError);
        return null;
      }

      // Fetch modules
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (modulesError) {
        console.error('Modules fetch error:', modulesError);
      }

      // Fetch user stories
      const { data: userStories, error: storiesError } = await supabase
        .from('user_stories')
        .select('*')
        .eq('project_id', projectId);

      if (storiesError) {
        console.error('User stories fetch error:', storiesError);
      }

      // Fetch features
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('*')
        .eq('project_id', projectId);

      if (featuresError) {
        console.error('Features fetch error:', featuresError);
      }

      // Fetch business rules
      const { data: businessRules, error: rulesError } = await supabase
        .from('business_rules')
        .select('*')
        .eq('project_id', projectId);

      if (rulesError) {
        console.error('Business rules fetch error:', rulesError);
      }

      // Fetch tech stack
      const { data: techStack, error: techError } = await supabase
        .from('tech_stack')
        .select('*')
        .eq('project_id', projectId);

      if (techError) {
        console.error('Tech stack fetch error:', techError);
      }

      // Construct the project data in the expected format
      const projectData: ProjectData = {
        projectName: project.name,
        projectDescription: project.description || '',
        businessObjectives: project.business_objectives || [],
        businessRequirements: project.business_requirements || [],
        stakeholders: project.stakeholders || [],
        projectScope: project.scope || {},
        constraints: project.constraints || [],
        assumptions: project.assumptions || [],
        modules: [],
      };

      // Process modules and attach related data
      if (modules) {
        projectData.modules = modules.map((module: any) => {
          const moduleData: any = {
            moduleName: module.name,
            moduleId: module.id,
            moduleDescription: module.description || '',
            priority: module.priority || 'Medium',
            userStories: [],
            features: [],
            technicalRequirements: [],
          };

          // Attach user stories to module
          if (userStories) {
            moduleData.userStories = userStories
              .filter((story: any) => story.module_id === module.id)
              .map((story: any) => ({
                title: story.title,
                description: story.description,
                acceptanceCriteria: story.acceptance_criteria || '',
                priority: story.priority,
                storyPoints: story.story_points,
              }));
          }

          // Attach features to module
          if (features) {
            moduleData.features = features
              .filter((feature: any) => feature.module_id === module.id)
              .map((feature: any) => ({
                name: feature.name,
                description: feature.description,
                priority: feature.priority,
              }));
          }

          return moduleData;
        });
      }

      // Add business rules
      if (businessRules && businessRules.length > 0) {
        projectData.businessRules = businessRules.map((rule: any) => ({
          name: rule.name,
          description: rule.description,
          category: rule.category,
        }));
      }

      // Add tech stack
      if (techStack && techStack.length > 0) {
        projectData.techStack = techStack.map((tech: any) => ({
          category: tech.category,
          technology: tech.technology,
          purpose: tech.purpose,
        }));
      }

      return projectData;
    } catch (error) {
      console.error('Error fetching complete project data:', error);
      return null;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId?: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/conversation/history', {
        params: { session_id: sessionId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/conversation/clear');
      return response.data;
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const ragService = new RAGService();
