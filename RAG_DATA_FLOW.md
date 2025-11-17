# RAG System Data Flow

## Data Passed During Initialization (One-time)

When the AI Assistance tab is opened, the following COMPLETE project data is fetched from the database and sent to the RAG system:

### 1. **Project Details**
```json
{
  "name": "Project Name",
  "description": "Project description",
  "application_type": "Web Application",
  "status": "Active"
}
```

### 2. **Project Information**
```json
{
  "vision": "Project vision statement",
  "purpose": "Project purpose",
  "objectives": "Project objectives",
  "functional_requirements": "Functional requirements",
  "non_functional_requirements": "Non-functional requirements",
  "integration_requirements": "Integration requirements",
  "reporting_requirements": "Reporting requirements"
}
```

### 2. **Modules** (Array)
Each module contains:
```json
{
  "id": "module-uuid",
  "module_name": "Authentication Module",
  "description": "Module description",
  "priority": "High",
  "business_impact": "Critical for user access"
}
```

### 3. **User Stories** (Array)
Each user story contains:
```json
{
  "id": "story-uuid",
  "module_id": "module-uuid",
  "title": "User Registration",
  "user_role": "As a new user",
  "description": "I want to register an account",
  "acceptance_criteria": "Given/When/Then criteria",
  "priority": "High",
  "status": "In Progress"
}
```

### 4. **Features** (Array)
Each feature contains:
```json
{
  "id": "feature-uuid",
  "user_story_id": "story-uuid",
  "title": "Email Validation",
  "description": "Validate email format",
  "business_rules": "Email must be unique and valid format",
  "priority": "High",
  "status": "Pending"
}
```

### 5. **Business Rules**
```json
{
  "categories": [
    {
      "name": "Data Validation",
      "description": "All user inputs must be validated"
    }
  ]
}
```

### 6. **Tech Stack**
```json
{
  "frontend": ["React", "TypeScript", "Tailwind CSS"],
  "backend": ["Node.js", "Express", "PostgreSQL"],
  "deployment": ["Docker", "AWS"]
}
```

### 7. **UI/UX Guidelines**
```json
{
  "guidelines": "Design principles and standards"
}
```

### 8. **Actions and Interactions** (Array)
Each action contains:
```json
{
  "component_name": "Login Button",
  "action_type": "Click",
  "description": "User clicks login button",
  "trigger_event": "onClick",
  "response_action": "Submit form and validate"
}
```

### 9. **Animation Effects** (Array)
Each animation contains:
```json
{
  "element_name": "Card",
  "animation_type": "Fade In",
  "duration": "0.3s",
  "trigger": "On Load"
}
```

### 10. **Recent AI Prompts** (Last 10)
Recent AI-generated content for context:
```json
{
  "prompt_type": "Frontend",
  "context": "Generated React component for..."
}
```

## How Data is Processed

### During Initialization:
1. **All data is fetched once** when AI Assistance tab opens
2. **Converted to document chunks** with relationships preserved:
   - Modules → User Stories → Features (hierarchical structure maintained)
3. **Vector embeddings created** using HuggingFace model
4. **Stored in FAISS vector database** at `Backend/rag_db/{project_id}/`

### During Query:
1. **Only the question is sent** to the RAG system
2. **RAG searches the vector store** for relevant chunks (top 5 matches)
3. **Context + Question sent to LLM** (OpenRouter GPT-4)
4. **Answer returned** based on project context

## Data Flow Diagram

```
INITIALIZATION (Once per session):
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────>│   Backend    │────>│  RAG Service│
│ AI Assistant│     │   Express    │     │   Python    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐      ┌─────────────┐
                    │   Database   │      │Vector Store │
                    │  (Supabase)  │      │   (FAISS)   │
                    └──────────────┘      └─────────────┘
                    Fetch ALL project     Create embeddings
                    data (11 tables):     Store in rag_db/
                    - projects
                    - project_information
                    - modules
                    - user_stories
                    - features
                    - business_rules
                    - tech_stack
                    - uiux_guidelines
                    - actions_interactions
                    - animation_effects
                    - ai_prompts (recent)

QUERY (Each question):
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Question  │────>│   Backend    │────>│  RAG Service│
│   "What...?"│     │   /rag/query │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                          ┌─────────────┐
                                          │Vector Search│
                                          │  (Top 5)    │
                                          └─────────────┘
                                                │
                                                ▼
                                          ┌─────────────┐
                                          │   LLM       │
                                          │ (OpenRouter)│
                                          └─────────────┘
                                                │
                                                ▼
                                          Context-aware
                                            Answer
```

## Important Notes

1. **Data is loaded ONCE per session** - not on every query
2. **The vector store is cached** per project for performance
3. **Only the question is sent** during queries (lightweight)
4. **Context retrieval is automatic** based on semantic similarity
5. **No sensitive data leaves your backend** - only goes to OpenRouter for LLM processing

## Example Query Process

**User asks:** "What are the user stories for authentication?"

**RAG Process:**
1. Search vector store for "user stories" + "authentication"
2. Find relevant chunks:
   - Authentication Module description
   - User Registration story
   - Login story
   - Password Reset story
3. Send context + question to LLM
4. Return: "The authentication module has the following user stories:
   1. User Registration - As a new user...
   2. User Login - As a registered user...
   3. Password Reset - As a user who forgot password..."

The RAG system maintains full context of your project structure and relationships!
