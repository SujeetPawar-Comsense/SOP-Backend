/**
 * Type definitions for BRD parsing
 */

export interface ParsedBRD {
  projectOverview?: ProjectOverview;
  ApplicationType?: ApplicationType;
  modules: Module[];
  businessRules: BusinessRule[];
  techStackSuggestions?: TechStackSuggestions;
  uiUxGuidelines?: UIUXGuidelines;
}

export type ApplicationType = 
  | 'Batch Application' 
  | 'Web Application' 
  | 'Website' 
  | 'Microservices';

export interface ProjectOverview {
  projectName: string;
  projectDescription: string;
  businessIntent: BusinessIntent;
  requirements: Requirements;
}

export interface BusinessIntent {
  vision: string;
  purpose: string;
  objectives: string[];
  projectScope: ProjectScope;
}

export interface ProjectScope {
  inScope: string[];
  outOfScope: string[];
}

export interface Requirements {
  functional: string[];
  nonFunctional: string[];
  integration: string[];
  reporting: string[];
}

export interface Module {
  moduleName: string;
  moduleDescription: string;
  priority?: 'High' | 'Medium' | 'Low';
  businessImpact?: string;
  dependencies?: string[];
  userStories: UserStory[];
}

export interface UserStory {
  title: string;
  userRole?: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'High' | 'Medium' | 'Low';
  features: Feature[];
}

export interface Feature {
  featureName: string;
  taskDescription: string;
  priority: 'High' | 'Medium' | 'Low';
  estimated_hours?: string;
  business_rules?: string;
}

export interface BusinessRule {
  ruleName: string;
  ruleDescription: string;
  applicableTo: string[];
}

export interface TechStackSuggestions {
  frontend?: TechStackItem[];
  backend?: TechStackItem[];
  database?: TechStackItem[];
  cloud?: TechStackItem[];
  other?: TechStackItem[];
}

export interface TechStackItem {
  name: string;
  rationale: string;
}

export interface UIUXGuidelines {
  keyPersonas?: Persona[];
  corePrinciples?: string[];
  designSystem?: DesignSystem;
}

export interface Persona {
  persona: string;
  description: string;
}

export interface DesignSystem {
  colorPalette?: string;
  typography?: string;
  keyComponents?: string[];
}

export interface EnhancementRequest {
  existingProjectJson: ParsedBRD;
  enhancementRequest: string;
  targetType?: 'module' | 'userStory' | 'feature';
  targetId?: string;
}

export interface EnhancementResponse {
  updatedObject: Module | UserStory | Feature | ParsedBRD;
  targetType: 'module' | 'userStory' | 'feature' | 'project';
  message: string;
}

export type DevelopmentType = 
  | 'Frontend'
  | 'Backend API'
  | 'Database Schema'
  | 'Unit Tests'
  | 'Integration Tests'
  | 'Batch Application'
  | 'Microservices'
  | 'CI/CD Pipeline'
  | 'Documentation';

export interface PromptGenerationRequest {
  projectJSON: ParsedBRD;
  developmentType: DevelopmentType;
  previousOutputs: string[];
}

