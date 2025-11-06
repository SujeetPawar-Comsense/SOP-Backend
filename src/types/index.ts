// ============================================
// TYPE DEFINITIONS
// ============================================

export type UserRole = 'project_owner' | 'vibe_engineer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_by_name: string;
  created_by_role: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectInformation {
  id: string;
  project_id: string;
  vision: string | null;
  purpose: string | null;
  objectives: string | null;
  project_scope: string | null;
  functional_requirements: string | null;
  non_functional_requirements: string | null;
  integration_requirements: string | null;
  reporting_requirements: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  project_id: string;
  module_name: string;
  description: string | null;
  priority: 'High' | 'Medium' | 'Low';
  business_impact: string | null;
  dependencies: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

export interface UserStory {
  id: string;
  project_id: string;
  title: string;
  user_role: string;
  description: string;
  acceptance_criteria: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Completed';
  module_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  user_story_id: string | null;
  module_id: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Completed';
  estimated_hours: number | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessRulesConfig {
  categories: Array<{
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
      example: string;
      userRule?: string;
      isCustom?: boolean;
    }>;
    customSubcategories?: Array<any>;
  }>;
  applyToAllProjects: boolean;
  specificModules: string[];
}

export interface ActionsInteractionsConfig {
  categories: Array<{
    id: string;
    name: string;
    actions: string[];
  }>;
  selectedActions: Record<string, string[]>;
  applyToAllProjects: boolean;
  specificModules: string[];
}

export interface AIPrompt {
  id: string;
  project_id: string;
  prompt_type: string;
  generated_prompt: string;
  context: any;
  created_at: string;
}

export interface DeveloperFeedback {
  id: string;
  project_id: string;
  user_id: string;
  feedback_type: string;
  content: string;
  rating: number;
  created_at: string;
}

// Request/Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}

