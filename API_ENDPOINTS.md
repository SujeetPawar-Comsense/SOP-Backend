# API Endpoints Reference

This document defines all API endpoints needed for the frontend to work with the Supabase backend.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

Or use Supabase Edge Functions:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/
```

## Authentication

All endpoints (except auth) require authentication:
```
Authorization: Bearer <supabase_jwt_token>
```

---

## 🔐 Authentication Endpoints

### POST `/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "project_owner"  // or "vibe_engineer"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe",
      "role": "project_owner"
    }
  }
}
```

**Implementation:**
```typescript
// Using Supabase
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name, role }
  }
})

// Create user profile
await supabase.from('users').insert({
  id: data.user.id,
  email, name, role
})
```

---

### POST `/auth/signin`
Sign in existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "session": {
    "access_token": "jwt-token",
    "user": { /* user object */ }
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": { "name": "...", "role": "..." }
  }
}
```

---

### POST `/auth/signout`
Sign out current user.

**Response:**
```json
{
  "success": true
}
```

---

### GET `/auth/session`
Get current session.

**Response:**
```json
{
  "session": {
    "access_token": "jwt-token",
    "user": { /* user object */ }
  }
}
```

---

### GET `/auth/user`
Get current user details.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe",
      "role": "project_owner"
    }
  }
}
```

---

## 📁 Project Endpoints

### GET `/projects`
Get all projects for the current user.

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "E-commerce Platform",
      "description": "...",
      "created_by": "user-uuid",
      "created_by_name": "John Doe",
      "created_by_role": "project_owner",
      "completion_percentage": 45,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

**Implementation:**
```sql
SELECT * FROM projects 
WHERE created_by = auth.uid() 
OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'vibe_engineer')
ORDER BY created_at DESC;
```

---

### POST `/projects`
Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Project description"
}
```

**Response:**
```json
{
  "project": {
    "id": "uuid",
    "name": "New Project",
    "description": "...",
    "created_by": "user-uuid",
    /* ...other fields */
  }
}
```

---

### GET `/projects/:projectId`
Get a specific project by ID.

**Response:**
```json
{
  "project": { /* project object */ }
}
```

---

### PUT `/projects/:projectId`
Update a project.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "completion_percentage": 75
}
```

**Response:**
```json
{
  "project": { /* updated project */ }
}
```

---

### DELETE `/projects/:projectId`
Delete a project.

**Response:**
```json
{
  "success": true
}
```

---

## 📝 User Stories Endpoints

### GET `/projects/:projectId/user-stories`
Get all user stories for a project.

**Response:**
```json
{
  "userStories": [
    {
      "id": "uuid",
      "project_id": "project-uuid",
      "title": "User login",
      "user_role": "customer",
      "description": "As a customer, I want to...",
      "acceptance_criteria": "Given... When... Then...",
      "priority": "High",
      "status": "In Progress",
      "module_id": "module-uuid",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### POST `/projects/:projectId/user-stories`
Create or bulk save user stories.

**Request:**
```json
{
  "userStories": [
    {
      "title": "User login",
      "user_role": "customer",
      "description": "...",
      "acceptance_criteria": "...",
      "priority": "High",
      "status": "Not Started",
      "module_id": "module-uuid"
    }
  ]
}
```

**Response:**
```json
{
  "userStories": [ /* created stories */ ]
}
```

---

## 📦 Modules Endpoints

### GET `/projects/:projectId/modules`

**Response:**
```json
{
  "modules": [
    {
      "id": "uuid",
      "project_id": "project-uuid",
      "module_name": "Authentication Module",
      "description": "Handles user authentication",
      "priority": "High",
      "business_impact": "Critical for security",
      "dependencies": "Database, Email service",
      "status": "In Progress",
      "user_story_id": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### POST `/projects/:projectId/modules`

**Request:**
```json
{
  "modules": [ /* module objects */ ]
}
```

---

## ⚖️ Business Rules Endpoints

### GET `/projects/:projectId/business-rules`

**Response:**
```json
{
  "businessRules": {
    "categories": [
      {
        "id": "data-integrity",
        "name": "Data Integrity Rules",
        "subcategories": [ /* ... */ ]
      }
    ],
    "applyToAllProjects": false,
    "specificModules": []
  }
}
```

---

### POST `/projects/:projectId/business-rules`

**Request:**
```json
{
  "businessRules": {
    "categories": [ /* ... */ ],
    "applyToAllProjects": false,
    "specificModules": []
  }
}
```

---

## ⚡ Actions & Interactions Endpoints

### GET `/projects/:projectId/actions`

**Response:**
```json
{
  "actions": {
    "categories": [
      {
        "id": "click-tap",
        "name": "Click & Tap Actions",
        "actions": ["Click", "Double-click", "Long press"]
      }
    ],
    "selectedActions": {
      "click-tap": ["Click", "Double-click"]
    },
    "applyToAllProjects": false,
    "specificModules": []
  }
}
```

---

### POST `/projects/:projectId/actions`

**Request:**
```json
{
  "actions": { /* actions config */ }
}
```

---

## 🎨 UI/UX Guidelines Endpoints

### GET `/projects/:projectId/uiux`

**Response:**
```json
{
  "guidelines": {
    /* Complex JSONB structure with design guidelines */
  }
}
```

---

### POST `/projects/:projectId/uiux`

**Request:**
```json
{
  "guidelines": { /* guidelines object */ }
}
```

---

## 🛠️ Features/Tasks Endpoints

### GET `/projects/:projectId/features`

**Response:**
```json
{
  "features": [
    {
      "id": "uuid",
      "title": "Implement login form",
      "description": "...",
      "user_story_id": "story-uuid",
      "module_id": "module-uuid",
      "priority": "High",
      "status": "In Progress",
      "estimated_hours": 8,
      "assignee": "developer@example.com"
    }
  ]
}
```

---

### POST `/projects/:projectId/features`

**Request:**
```json
{
  "features": [ /* feature objects */ ]
}
```

---

## 💻 Tech Stack Endpoints

### GET `/projects/:projectId/tech-stack`

**Response:**
```json
{
  "techStack": {
    /* Technology stack configuration */
  }
}
```

---

### POST `/projects/:projectId/tech-stack`

**Request:**
```json
{
  "techStack": { /* tech stack object */ }
}
```

---

## 📄 Documents Endpoints

### GET `/projects/:projectId/documents`

**Response:**
```json
{
  "documents": {
    /* Documents metadata and content */
  }
}
```

---

### POST `/projects/:projectId/documents`

**Request:**
```json
{
  "documents": { /* documents object */ }
}
```

---

## 🤖 AI Prompts Endpoints

### GET `/projects/:projectId/prompts`
Get all AI prompts for a project.

**Response:**
```json
{
  "prompts": [
    {
      "id": "uuid",
      "project_id": "project-uuid",
      "prompt_type": "full-project",
      "generated_prompt": "Complete AI prompt text...",
      "context": {},
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

### POST `/prompts/generate`
Generate a new AI prompt.

**Request:**
```json
{
  "projectId": "project-uuid",
  "promptType": "full-project",
  "context": {}
}
```

**Response:**
```json
{
  "prompt": {
    "id": "uuid",
    "generated_prompt": "Generated prompt content...",
    "created_at": "..."
  }
}
```

**Implementation Notes:**
- This endpoint should integrate with AI APIs (OpenAI, Anthropic, etc.)
- Fetch all project data from database
- Generate context-aware prompt
- Store in `ai_prompts` table
- Return to frontend

---

## 💬 Feedback Endpoints

### POST `/projects/:projectId/feedback`

**Request:**
```json
{
  "feedbackType": "prompt_feedback",
  "content": "This prompt was very helpful!",
  "rating": 5
}
```

**Response:**
```json
{
  "feedback": {
    "id": "uuid",
    "created_at": "..."
  }
}
```

---

### GET `/projects/:projectId/feedback`

**Response:**
```json
{
  "feedback": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "feedback_type": "prompt_feedback",
      "content": "...",
      "rating": 5,
      "created_at": "..."
    }
  ]
}
```

---

## 📊 Summary

### Total Endpoints: 25+

| Category | Endpoints |
|----------|-----------|
| Authentication | 5 |
| Projects | 5 |
| User Stories | 2 |
| Modules | 2 |
| Features | 2 |
| Business Rules | 2 |
| Actions | 2 |
| UI/UX | 2 |
| Tech Stack | 2 |
| Documents | 2 |
| AI Prompts | 2 |
| Feedback | 2 |

### Implementation Options

#### Option 1: Supabase Direct (Recommended for MVP)
- Frontend connects directly to Supabase
- No custom backend server needed
- RLS handles all security
- Fastest to implement

#### Option 2: Custom API Server
- Build REST API with Express/Hono
- More control over business logic
- Can add custom validation
- Better for complex operations

#### Option 3: Hybrid
- Use Supabase for CRUD operations
- Custom endpoints for AI generation, file processing
- Best of both worlds

---

## 🔗 Supabase Client Example

### Frontend Integration

```typescript
// src/utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Example: Get projects
export const projectAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { projects: data }
  },
  
  create: async (projectData: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        created_by: user.id,
        created_by_name: user.user_metadata.name,
        created_by_role: user.user_metadata.role
      })
      .select()
      .single()
    
    if (error) throw error
    return { project: data }
  }
}
```

---

## 🎯 Next Steps

1. Choose your implementation approach (Supabase Direct vs Custom API)
2. Set up authentication hooks
3. Implement each endpoint
4. Test with frontend
5. Add AI integration for prompt generation
6. Deploy!

See `README.md` for setup instructions and `DATABASE_SCHEMA.md` for database details.

