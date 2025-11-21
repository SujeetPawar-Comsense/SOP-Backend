-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.actions_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  config jsonb NOT NULL,
  apply_to_all_project boolean DEFAULT false,
  specific_modules ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT actions_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT actions_interactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.ai_prompts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  prompt_type text NOT NULL,
  generated_prompt text NOT NULL,
  context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT ai_prompts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.business_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  config jsonb NOT NULL,
  apply_to_all_project boolean DEFAULT false,
  specific_modules ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_rules_pkey PRIMARY KEY (id),
  CONSTRAINT business_rules_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.developer_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT developer_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT developer_feedback_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT developer_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  documents jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  user_story_id uuid,
  module_id uuid,
  priority text DEFAULT 'Medium'::text CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  status text DEFAULT 'Not Started'::text CHECK (status = ANY (ARRAY['Not Started'::text, 'In Progress'::text, 'Completed'::text])),
  estimated_hours integer,
  assignee text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  business_rules text,
  CONSTRAINT features_pkey PRIMARY KEY (id),
  CONSTRAINT features_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT features_user_story_id_fkey FOREIGN KEY (user_story_id) REFERENCES public.user_stories(id),
  CONSTRAINT features_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id)
);
CREATE TABLE public.modules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  module_name text NOT NULL,
  description text,
  priority text DEFAULT 'Medium'::text CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  business_impact text,
  dependencies text,
  status text DEFAULT 'Not Started'::text CHECK (status = ANY (ARRAY['Not Started'::text, 'In Progress'::text, 'Completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT modules_pkey PRIMARY KEY (id),
  CONSTRAINT modules_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.project_collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text])),
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT project_collaborators_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.project_information (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  vision text,
  purpose text,
  objectives text,
  project_scope text,
  functional_requirements text,
  non_functional_requirements text,
  integration_requirements text,
  reporting_requirements text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_information_pkey PRIMARY KEY (id),
  CONSTRAINT project_information_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  created_by_role text NOT NULL,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  from_brd boolean DEFAULT false,
  brd_content text,
  application_type text CHECK (application_type = ANY (ARRAY['Batch Application'::text, 'Web Application'::text, 'Website'::text, 'Microservices'::text])),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.tech_stack (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  tech_stack jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tech_stack_pkey PRIMARY KEY (id),
  CONSTRAINT tech_stack_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.uiux_guidelines (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL UNIQUE,
  guidelines jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT uiux_guidelines_pkey PRIMARY KEY (id),
  CONSTRAINT uiux_guidelines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.user_stories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  user_role text NOT NULL,
  description text NOT NULL,
  acceptance_criteria text,
  priority text DEFAULT 'Medium'::text CHECK (priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  status text DEFAULT 'Not Started'::text CHECK (status = ANY (ARRAY['Not Started'::text, 'In Progress'::text, 'Completed'::text])),
  module_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_stories_pkey PRIMARY KEY (id),
  CONSTRAINT user_stories_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT user_stories_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['project_owner'::text, 'vibe_engineer'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);