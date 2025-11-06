# Frontend-Backend Integration Guide

## 🎯 Overview

This guide shows you how to connect your standalone frontend (currently using `mockApi.ts`) to the Supabase backend.

## 📋 Prerequisites

✅ Supabase project created  
✅ Migration applied (`supabase_migration.sql`)  
✅ Database tables verified  
✅ RLS policies tested  

## 🔄 Migration Steps

### Step 1: Install Supabase Client

```bash
cd frontend
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Client

Create `frontend/src/utils/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export types for TypeScript
export type { User, Session } from '@supabase/supabase-js'
```

### Step 3: Create Environment Variables

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from:
- Supabase Dashboard → Settings → API

### Step 4: Create Real API Implementation

Create `frontend/src/utils/realApi.ts`:

```typescript
import { supabase } from './supabaseClient'

// ============================================
// AUTHENTICATION API
// ============================================

export interface MockUser {
  id: string
  email: string
  user_metadata: {
    name: string
    role: 'project_owner' | 'vibe_engineer'
  }
}

export interface MockSession {
  access_token: string
  user: MockUser
}

export const authAPI = {
  signUp: async (
    email: string, 
    password: string, 
    name: string, 
    role: 'project_owner' | 'vibe_engineer'
  ) => {
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    })
    
    if (error) throw error
    if (!data.user) throw new Error('User creation failed')
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email,
        name,
        role
      })
    
    if (profileError) throw profileError
    
    return { user: data.user }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return { 
      session: data.session, 
      user: data.user 
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }
}

// ============================================
// PROJECT API
// ============================================

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  createdBy: string
  createdByName: string
  createdByRole: string
  completionPercentage: number
  updatedAt: string
}

export const projectAPI = {
  create: async (projectData: { name: string; description: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        created_by: user.id,
        created_by_name: user.user_metadata.name,
        created_by_role: user.user_metadata.role
      })
      .select()
      .single()
    
    if (error) throw error
    return { project: data }
  },

  getAll: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { projects: data }
  },

  getById: async (projectId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (error) throw error
    return { project: data }
  },

  update: async (projectId: string, updates: any) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) throw error
    return { project: data }
  },

  delete: async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) throw error
    return { success: true }
  }
}

// ============================================
// USER STORIES API
// ============================================

export const userStoriesAPI = {
  get: async (projectId: string) => {
    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { userStories: data }
  },

  save: async (projectId: string, userStories: any[]) => {
    // Delete existing and insert new (for bulk save)
    await supabase
      .from('user_stories')
      .delete()
      .eq('project_id', projectId)
    
    const { data, error } = await supabase
      .from('user_stories')
      .insert(
        userStories.map(story => ({
          ...story,
          project_id: projectId
        }))
      )
      .select()
    
    if (error) throw error
    return { userStories: data }
  }
}

// ============================================
// MODULES API
// ============================================

export const modulesAPI = {
  get: async (projectId: string) => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return { modules: data }
  },

  save: async (projectId: string, modules: any[]) => {
    await supabase
      .from('modules')
      .delete()
      .eq('project_id', projectId)
    
    const { data, error } = await supabase
      .from('modules')
      .insert(
        modules.map(module => ({
          ...module,
          project_id: projectId
        }))
      )
      .select()
    
    if (error) throw error
    return { modules: data }
  }
}

// Similar implementations for other APIs...
// (businessRulesAPI, actionsAPI, uiuxAPI, techStackAPI, etc.)

// ============================================
// API CLIENT
// ============================================

export const apiClient = {
  get: async (url: string) => {
    // Parse URL and route to appropriate API
    // Example implementation
    const parts = url.split('/')
    const projectId = parts[2]
    const endpoint = parts[3]
    
    switch (endpoint) {
      case 'user-stories':
        return userStoriesAPI.get(projectId)
      case 'modules':
        return modulesAPI.get(projectId)
      // ... etc
      default:
        if (!endpoint) return projectAPI.getById(projectId)
        throw new Error('Unknown endpoint')
    }
  },
  
  post: async (url: string, data: any) => {
    // Similar routing logic for POST
  },
  
  put: async (url: string, data: any) => {
    // Similar routing logic for PUT
  },
  
  delete: async (url: string) => {
    // Similar routing logic for DELETE
  }
}
```

### Step 5: Toggle Between Mock and Real API

Update your imports to conditionally use mock or real API:

**Option A: Environment Variable Toggle**

```typescript
// src/utils/api.ts
import * as mockApi from './mockApi'
import * as realApi from './realApi'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const authAPI = USE_MOCK ? mockApi.authAPI : realApi.authAPI
export const projectAPI = USE_MOCK ? mockApi.projectAPI : realApi.projectAPI
// ... export all other APIs
```

**Option B: Direct Import Replacement**

Simply update all imports:
```typescript
// FROM:
import { authAPI, projectAPI } from '../utils/mockApi'

// TO:
import { authAPI, projectAPI } from '../utils/realApi'
```

### Step 6: Update AuthProvider

The `AuthProvider` component should work with minimal changes since we've maintained the same interface!

Just verify the imports are correct.

### Step 7: Test Integration

1. **Test Authentication:**
   ```typescript
   // Should create user in Supabase
   await authAPI.signUp('test@example.com', 'password', 'Test User', 'project_owner')
   await authAPI.signIn('test@example.com', 'password')
   ```

2. **Test Project Creation:**
   ```typescript
   const project = await projectAPI.create({
     name: 'Test Project',
     description: 'Testing Supabase integration'
   })
   ```

3. **Verify in Supabase Dashboard:**
   - Go to Table Editor
   - Check `users` and `projects` tables
   - Verify data was inserted

### Step 8: Handle Errors

Add proper error handling:

```typescript
try {
  await projectAPI.create(data)
} catch (error) {
  if (error.code === 'PGRST116') {
    // RLS policy violation
    toast.error('Permission denied')
  } else if (error.code === '23505') {
    // Unique constraint violation
    toast.error('Record already exists')
  } else {
    toast.error(error.message)
  }
}
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Environment variables not committed to git
- [ ] RLS policies tested thoroughly
- [ ] API keys secured (use service_role key only on server)
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on frontend AND backend
- [ ] SQL injection prevention (Supabase handles this)
- [ ] Authentication token expiry handled

---

## 🧪 Testing Strategy

### 1. Test with Mock API (Current)
```bash
VITE_USE_MOCK=true npm run dev
```

### 2. Test with Supabase
```bash
VITE_USE_MOCK=false npm run dev
```

### 3. Compare Behaviors
Both should work identically from user's perspective!

---

## 🐛 Common Issues

### Issue: RLS blocks all queries

**Solution:** Verify user is authenticated
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user) // Should not be null
```

### Issue: Foreign key violations

**Solution:** Ensure referenced records exist first
```typescript
// Create project first
const project = await projectAPI.create(...)

// Then create module
await modulesAPI.save(project.id, modules)
```

### Issue: JSONB validation fails

**Solution:** Validate structure before saving
```typescript
const isValidConfig = (config) => {
  return config && 
         Array.isArray(config.categories) &&
         typeof config.applyToAllProjects === 'boolean'
}
```

---

## 📈 Performance Tips

### 1. Use Select Filters
```typescript
// BAD: Fetch all then filter
const all = await supabase.from('projects').select('*')
const filtered = all.filter(p => p.status === 'active')

// GOOD: Filter in query
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'active')
```

### 2. Use Joins Wisely
```typescript
// Get project with modules in one query
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    modules (*)
  `)
  .eq('id', projectId)
  .single()
```

### 3. Paginate Large Results
```typescript
const { data } = await supabase
  .from('user_stories')
  .select('*')
  .range(0, 49)  // Get first 50
  .order('created_at', { ascending: false })
```

---

## 🚀 Deployment

### Frontend Deployment

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Vercel/Netlify
# Set environment variables in deployment dashboard
```

### Environment Variables for Production

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_USE_MOCK=false
```

---

## 🎯 Migration Checklist

- [ ] Supabase project created
- [ ] Migration SQL executed
- [ ] Tables verified in dashboard
- [ ] RLS policies tested
- [ ] Supabase client installed
- [ ] Environment variables configured
- [ ] `realApi.ts` created
- [ ] AuthProvider updated
- [ ] All components tested with real API
- [ ] Error handling added
- [ ] Production deployment configured

---

## 💡 Best Practices

### 1. Keep Mock API for Development

```typescript
// src/utils/api.ts
import * as mockApi from './mockApi'
import * as realApi from './realApi'

const isDev = import.meta.env.DEV
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export const api = (isDev && useMock) ? mockApi : realApi
```

### 2. Type Safety

```typescript
// Share types between mock and real API
export type { Project, MockUser, MockSession } from './types'

// Both APIs implement the same interface
interface IAuthAPI {
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  // ...
}

export const authAPI: IAuthAPI = { /* implementation */ }
```

### 3. Error Handling

```typescript
// Centralized error handling
const handleSupabaseError = (error: any) => {
  if (error.code === 'PGRST116') return 'Permission denied'
  if (error.code === '23505') return 'Duplicate entry'
  if (error.code === '23503') return 'Referenced record not found'
  return error.message || 'An error occurred'
}

// Usage
try {
  await projectAPI.create(data)
} catch (error) {
  toast.error(handleSupabaseError(error))
}
```

---

## 📚 Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

---

## 🎉 You're Ready!

Your backend is set up and ready to connect with your frontend. Start by implementing `realApi.ts` using the examples above, then gradually migrate endpoints one by one.

The beauty of this architecture is you can:
- ✅ Keep using mock API during frontend development
- ✅ Switch to real API when backend is ready
- ✅ Test both modes easily
- ✅ No component changes needed (same interface!)

Happy coding! 🚀

