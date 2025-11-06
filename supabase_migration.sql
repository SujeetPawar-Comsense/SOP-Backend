-- ============================================
-- SUPABASE DATABASE MIGRATION
-- AI Project Development SOP Understanding Platform
-- ============================================
-- This migration creates all necessary tables for the project management system
-- with proper relationships, indexes, and RLS policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('project_owner', 'vibe_engineer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster role-based queries
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by_name TEXT NOT NULL,
  created_by_role TEXT NOT NULL,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for projects
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- ============================================
-- PROJECT INFORMATION TABLE
-- ============================================
CREATE TABLE public.project_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Business Intent
  vision TEXT,
  purpose TEXT,
  objectives TEXT,
  project_scope TEXT,
  
  -- Requirements
  functional_requirements TEXT,
  non_functional_requirements TEXT,
  integration_requirements TEXT,
  reporting_requirements TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_project_information_project_id ON public.project_information(project_id);

-- ============================================
-- MODULES TABLE
-- ============================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  business_impact TEXT,
  dependencies TEXT,
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modules_project_id ON public.modules(project_id);
CREATE INDEX idx_modules_status ON public.modules(status);
CREATE INDEX idx_modules_priority ON public.modules(priority);

-- ============================================
-- USER STORIES TABLE
-- ============================================
CREATE TABLE public.user_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  user_role TEXT NOT NULL, -- The user role in the story (e.g., "As a customer")
  description TEXT NOT NULL,
  acceptance_criteria TEXT,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_stories_project_id ON public.user_stories(project_id);
CREATE INDEX idx_user_stories_module_id ON public.user_stories(module_id);
CREATE INDEX idx_user_stories_status ON public.user_stories(status);
CREATE INDEX idx_user_stories_priority ON public.user_stories(priority);

-- ============================================
-- FEATURES/TASKS TABLE
-- ============================================
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  status TEXT CHECK (status IN ('Not Started', 'In Progress', 'Completed')) DEFAULT 'Not Started',
  estimated_hours INTEGER,
  assignee TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_features_project_id ON public.features(project_id);
CREATE INDEX idx_features_user_story_id ON public.features(user_story_id);
CREATE INDEX idx_features_module_id ON public.features(module_id);
CREATE INDEX idx_features_status ON public.features(status);

-- ============================================
-- BUSINESS RULES TABLE
-- ============================================
CREATE TABLE public.business_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  config JSONB NOT NULL, -- Stores the entire BusinessRulesConfig structure
  apply_to_all_project BOOLEAN DEFAULT false,
  specific_modules UUID[], -- Array of module IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_business_rules_project_id ON public.business_rules(project_id);
CREATE INDEX idx_business_rules_config ON public.business_rules USING GIN(config);

-- ============================================
-- ACTIONS & INTERACTIONS TABLE
-- ============================================
CREATE TABLE public.actions_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  config JSONB NOT NULL, -- Stores the entire ActionsInteractionsConfig structure
  apply_to_all_project BOOLEAN DEFAULT false,
  specific_modules UUID[], -- Array of module IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_actions_interactions_project_id ON public.actions_interactions(project_id);
CREATE INDEX idx_actions_interactions_config ON public.actions_interactions USING GIN(config);

-- ============================================
-- UI/UX GUIDELINES TABLE
-- ============================================
CREATE TABLE public.uiux_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guidelines JSONB NOT NULL, -- Stores the entire guidelines structure
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_uiux_guidelines_project_id ON public.uiux_guidelines(project_id);
CREATE INDEX idx_uiux_guidelines_data ON public.uiux_guidelines USING GIN(guidelines);

-- ============================================
-- TECH STACK TABLE
-- ============================================
CREATE TABLE public.tech_stack (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tech_stack JSONB NOT NULL, -- Stores the technology stack configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_tech_stack_project_id ON public.tech_stack(project_id);
CREATE INDEX idx_tech_stack_data ON public.tech_stack USING GIN(tech_stack);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  documents JSONB NOT NULL, -- Stores document metadata and content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id)
);

CREATE INDEX idx_documents_project_id ON public.documents(project_id);
CREATE INDEX idx_documents_data ON public.documents USING GIN(documents);

-- ============================================
-- AI PROMPTS TABLE
-- ============================================
CREATE TABLE public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  generated_prompt TEXT NOT NULL,
  context JSONB, -- Additional context used to generate the prompt
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_prompts_project_id ON public.ai_prompts(project_id);
CREATE INDEX idx_ai_prompts_created_at ON public.ai_prompts(created_at DESC);
CREATE INDEX idx_ai_prompts_type ON public.ai_prompts(prompt_type);

-- ============================================
-- DEVELOPER FEEDBACK TABLE
-- ============================================
CREATE TABLE public.developer_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL, -- e.g., 'prompt_feedback', 'feature_feedback'
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_developer_feedback_project_id ON public.developer_feedback(project_id);
CREATE INDEX idx_developer_feedback_user_id ON public.developer_feedback(user_id);
CREATE INDEX idx_developer_feedback_created_at ON public.developer_feedback(created_at DESC);

-- ============================================
-- PROJECT COLLABORATORS TABLE (Optional - for future use)
-- ============================================
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_collaborators_project_id ON public.project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON public.project_collaborators(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_information_updated_at BEFORE UPDATE ON public.project_information
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stories_updated_at BEFORE UPDATE ON public.user_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON public.features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_rules_updated_at BEFORE UPDATE ON public.business_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_interactions_updated_at BEFORE UPDATE ON public.actions_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uiux_guidelines_updated_at BEFORE UPDATE ON public.uiux_guidelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tech_stack_updated_at BEFORE UPDATE ON public.tech_stack
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uiux_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_stack ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================

-- Project owners can see their own projects
CREATE POLICY "Project owners can view their projects"
  ON public.projects FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'vibe_engineer'
    )
  );

-- Project owners can create projects
CREATE POLICY "Project owners can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'project_owner'
    )
  );

-- Project owners can update their own projects
CREATE POLICY "Project owners can update their projects"
  ON public.projects FOR UPDATE
  USING (created_by = auth.uid());

-- Project owners can delete their own projects
CREATE POLICY "Project owners can delete their projects"
  ON public.projects FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- PROJECT DATA POLICIES (applies to related tables)
-- ============================================

-- Helper function to check project access
CREATE OR REPLACE FUNCTION has_project_access(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'vibe_engineer')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Project Information Policies
CREATE POLICY "Users can view project information if they have project access"
  ON public.project_information FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can insert project information"
  ON public.project_information FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

CREATE POLICY "Project owners can update project information"
  ON public.project_information FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

CREATE POLICY "Project owners can delete project information"
  ON public.project_information FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Modules Policies
CREATE POLICY "Users can view modules if they have project access"
  ON public.modules FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage modules"
  ON public.modules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- User Stories Policies
CREATE POLICY "Users can view user stories if they have project access"
  ON public.user_stories FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage user stories"
  ON public.user_stories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Features Policies
CREATE POLICY "Users can view features if they have project access"
  ON public.features FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage features"
  ON public.features FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Business Rules Policies
CREATE POLICY "Users can view business rules if they have project access"
  ON public.business_rules FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage business rules"
  ON public.business_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Actions & Interactions Policies
CREATE POLICY "Users can view actions if they have project access"
  ON public.actions_interactions FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage actions"
  ON public.actions_interactions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- UI/UX Guidelines Policies
CREATE POLICY "Users can view uiux guidelines if they have project access"
  ON public.uiux_guidelines FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage uiux guidelines"
  ON public.uiux_guidelines FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Tech Stack Policies
CREATE POLICY "Users can view tech stack if they have project access"
  ON public.tech_stack FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage tech stack"
  ON public.tech_stack FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- Documents Policies
CREATE POLICY "Users can view documents if they have project access"
  ON public.documents FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage documents"
  ON public.documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- AI Prompts Policies
CREATE POLICY "Users can view prompts if they have project access"
  ON public.ai_prompts FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Users can create prompts for accessible projects"
  ON public.ai_prompts FOR INSERT
  WITH CHECK (has_project_access(project_id));

-- Developer Feedback Policies
CREATE POLICY "Users can view feedback for accessible projects"
  ON public.developer_feedback FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Users can create feedback"
  ON public.developer_feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND has_project_access(project_id)
  );

-- Project Collaborators Policies
CREATE POLICY "Users can view collaborators for accessible projects"
  ON public.project_collaborators FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Project owners can manage collaborators"
  ON public.project_collaborators FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
  );

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View to get project summary with statistics
CREATE OR REPLACE VIEW project_summary AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.created_by,
  p.created_by_name,
  p.created_by_role,
  p.completion_percentage,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT m.id) as module_count,
  COUNT(DISTINCT us.id) as user_story_count,
  COUNT(DISTINCT f.id) as feature_count,
  COUNT(DISTINCT CASE WHEN f.status = 'Completed' THEN f.id END) as completed_feature_count
FROM public.projects p
LEFT JOIN public.modules m ON p.id = m.project_id
LEFT JOIN public.user_stories us ON p.id = us.project_id
LEFT JOIN public.features f ON p.id = f.project_id
GROUP BY p.id, p.name, p.description, p.created_by, p.created_by_name, p.created_by_role, p.completion_percentage, p.created_at, p.updated_at;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Note: This will be executed after authentication is set up
-- You can add seed data here or use a separate seed script

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- ============================================
-- GRANT PERMISSIONS (CRITICAL FOR API TO WORK!)
-- ============================================

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO service_role;

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on future tables (important!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- Explicitly grant INSERT on users table (fixes "permission denied" error)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO authenticated;

-- Grant permissions to postgres role (owner)
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

