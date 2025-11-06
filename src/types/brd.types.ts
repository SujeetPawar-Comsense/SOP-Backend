/**
 * Type definitions for BRD parsing
 */

export interface ParsedBRD {
  projectOverview: ProjectOverview;
  modules: Module[];
  businessRules: BusinessRule[];
}

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
  userStories: UserStory[];
}

export interface UserStory {
  userStory: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  acceptanceCriteria: string[];
  features: Feature[];
}

export interface Feature {
  featureName: string;
  taskDescription: string;
  priority: 'High' | 'Medium' | 'Low';
  acceptanceCriteria: string[];
}

export interface BusinessRule {
  ruleName: string;
  ruleDescription: string;
  applicableTo: string[];
}

export interface EnhancementRequest {
  existingProjectJson: ParsedBRD;
  enhancementRequest: string;
  targetType?: 'module' | 'userStory' | 'feature';
  targetId?: string;
}

export interface EnhancementResponse {
  updatedObject: Module | UserStory | Feature;
  targetType: 'module' | 'userStory' | 'feature';
  message: string;
}

