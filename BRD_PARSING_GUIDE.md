# 🤖 BRD Parsing with AI - Complete Guide

## 📋 Overview

The backend now includes AI-powered BRD (Business Requirements Document) parsing using OpenAI. This allows Project Owners to:

1. ✅ Upload or paste BRD content
2. ✅ Automatically extract project structure
3. ✅ Create projects with modules, user stories, and features
4. ✅ Enhance specific sections dynamically

---

## 🚀 Quick Start

### Step 1: Install OpenAI Package

```bash
cd Backend
npm install
```

This installs the `openai` package.

### Step 2: Configure OpenAI API Key

Edit `Backend/.env`:

```env
# Add your OpenAI API key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**Get your API key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key
4. Paste in `.env`

### Step 3: Restart Backend

```bash
npm run dev
```

Should see:
```
🚀 Server started successfully!
📡 API running on: http://localhost:3000
```

### Step 4: Test BRD Parsing

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/brd/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "success": true,
  "openai": {
    "configured": true,
    "message": "OpenAI is configured and ready"
  }
}
```

✅ Ready to parse BRDs!

---

## 📡 API Endpoints

### 1. Parse BRD Document

**POST** `/api/brd/parse`

Parses a BRD and optionally creates a complete project.

**Request:**
```json
{
  "brdContent": "Your entire BRD document content here...",
  "projectName": "Optional - override project name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "BRD parsed and project created successfully",
  "parsedBRD": {
    "projectOverview": {
      "projectName": "E-commerce Platform",
      "projectDescription": "...",
      "businessIntent": { ... },
      "requirements": { ... }
    },
    "modules": [
      {
        "moduleName": "User Management",
        "moduleDescription": "...",
        "userStories": [
          {
            "userStory": "As a customer, I want to...",
            "title": "User Registration",
            "priority": "High",
            "acceptanceCriteria": [ ... ],
            "features": [
              {
                "featureName": "Registration Form UI",
                "taskDescription": "...",
                "priority": "High",
                "acceptanceCriteria": [ ... ]
              }
            ]
          }
        ]
      }
    ],
    "businessRules": [ ... ]
  },
  "project": {
    "id": "project-uuid",
    "name": "E-commerce Platform",
    "description": "..."
  }
}
```

**What it does:**
1. ✅ Sends BRD to OpenAI with parser prompt
2. ✅ Extracts structured data
3. ✅ Creates project in database
4. ✅ Creates modules, user stories, features
5. ✅ Saves business rules
6. ✅ Returns complete structure

---

### 2. Enhance Project Section

**POST** `/api/brd/enhance`

Enhances a specific part of an existing project.

**Request:**
```json
{
  "projectId": "project-uuid",
  "enhancementRequest": "Add a new user story to the User Management module for password reset functionality",
  "targetType": "module",
  "targetId": "module-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Section enhanced successfully",
  "enhancement": {
    "updatedObject": {
      "moduleName": "User Management",
      "moduleDescription": "...",
      "userStories": [
        // ... existing stories ...
        {
          "userStory": "As a user, I want to reset my password",
          "title": "Password Reset",
          "priority": "High",
          "acceptanceCriteria": [ ... ],
          "features": [ ... ]
        }
      ]
    },
    "targetType": "module",
    "message": "Enhancement applied successfully"
  }
}
```

**What it does:**
1. ✅ Fetches existing project structure
2. ✅ Sends to OpenAI with enhancement request
3. ✅ AI identifies target and applies changes
4. ✅ Returns updated section
5. ✅ You can save it back to database

---

### 3. Check OpenAI Configuration

**GET** `/api/brd/check`

Check if OpenAI is configured and ready.

**Response:**
```json
{
  "success": true,
  "openai": {
    "configured": true,
    "message": "OpenAI is configured and ready"
  }
}
```

---

## 🎯 Usage Examples

### Example 1: Parse Complete BRD

```typescript
// Upload BRD content
const brdContent = `
Business Requirements Document
Project: E-commerce Platform

1. Project Overview
The platform will allow users to browse products, add to cart, and checkout.

2. Modules

2.1 User Management
- User registration
- User login
- Password reset

2.2 Product Catalog
- Browse products
- Search products
- Filter by category

... (rest of BRD)
`;

// Call API
const response = await fetch('http://localhost:3000/api/brd/parse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    brdContent,
    projectName: 'My E-commerce Project'
  })
});

const result = await response.json();

// Result includes:
// - Parsed structure
// - Created project ID
// - All modules, stories, features saved to database
```

---

### Example 2: Enhance Module

```typescript
// Add a new user story to existing module
const response = await fetch('http://localhost:3000/api/brd/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    projectId: 'your-project-id',
    enhancementRequest: 'Add a user story for social media login (Google, Facebook) to the User Management module',
    targetType: 'module'
  })
});

const result = await response.json();

// Result includes:
// - Updated module with new user story
// - New features for the story
// - Acceptance criteria
```

---

### Example 3: Enhance User Story

```typescript
// Add features to existing user story
const response = await fetch('http://localhost:3000/api/brd/enhance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    projectId: 'your-project-id',
    enhancementRequest: 'Add email verification feature to the User Registration story',
    targetType: 'userStory'
  })
});

// Returns updated user story with new features
```

---

## 🔧 Implementation Details

### Files Created:

1. **`src/config/prompts.ts`** - AI prompts
   - `BRD_PARSER_SYSTEM_PROMPT` - Parsing instructions
   - `DYNAMIC_PROMPT` - Enhancement instructions

2. **`src/types/brd.types.ts`** - TypeScript types
   - `ParsedBRD` - Complete structure
   - `Module`, `UserStory`, `Feature` types
   - `EnhancementRequest` types

3. **`src/services/openai.service.ts`** - OpenAI integration
   - `parseBRDDocument()` - Parse BRD
   - `enhanceProjectSection()` - Enhance sections
   - `generateContextualPrompt()` - Generate prompts

4. **`src/routes/brd.routes.ts`** - API endpoints
   - `POST /api/brd/parse` - Parse BRD
   - `POST /api/brd/enhance` - Enhance section
   - `GET /api/brd/check` - Check config

---

## 📊 Data Flow

### Parsing BRD:

```
User uploads BRD
    ↓
POST /api/brd/parse
    ↓
OpenAI Service
    ├─→ Add BRD_PARSER_SYSTEM_PROMPT
    ├─→ Add user's BRD content
    ├─→ Call OpenAI API
    └─→ Receive structured JSON
    ↓
Backend processes JSON
    ├─→ Create project
    ├─→ Create modules
    ├─→ Create user stories
    ├─→ Create features
    └─→ Save business rules
    ↓
Return to frontend
    └─→ Show parsed structure
```

### Enhancing Section:

```
User requests enhancement
    ↓
POST /api/brd/enhance
    ↓
Fetch existing project data
    ↓
OpenAI Service
    ├─→ Add DYNAMIC_PROMPT
    ├─→ Add existing project JSON
    ├─→ Add enhancement request
    ├─→ Call OpenAI API
    └─→ Receive updated section
    ↓
Return updated section
    └─→ User can save to database
```

---

## 💰 Cost Considerations

### OpenAI API Pricing (as of 2024):

**GPT-4 Turbo:**
- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens

**Typical BRD parsing:**
- Input: ~2,000-5,000 tokens (BRD + prompt)
- Output: ~1,000-3,000 tokens (structured JSON)
- **Cost per parse: $0.05 - $0.20**

**Enhancement:**
- Input: ~1,000-2,000 tokens
- Output: ~500-1,000 tokens
- **Cost per enhancement: $0.02 - $0.10**

### Cost Optimization:

1. Use `gpt-3.5-turbo` for simple documents (10x cheaper)
2. Cache parsed results
3. Implement rate limiting
4. Add user quotas

---

## 🎨 Frontend Integration

### Create BRD Upload Component

```typescript
// In your frontend
const handleBRDUpload = async (brdContent: string) => {
  const response = await fetch('http://localhost:3000/api/brd/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      brdContent,
      projectName: 'My New Project'
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Project created:', result.project.id);
    console.log('📊 Modules:', result.parsedBRD.modules.length);
    // Redirect to project or show success
  }
};
```

---

## 🧪 Testing

### Test BRD Parsing:

**Using Postman:**

1. **Add new request** to collection
2. **Method:** POST
3. **URL:** `{{base_url}}/brd/parse`
4. **Headers:** 
   - `Authorization: Bearer {{access_token}}`
   - `Content-Type: application/json`
5. **Body:**
```json
{
  "brdContent": "Business Requirements Document\n\nProject: Test Platform\n\n1. User Management\n- User registration\n- User login\n\n2. Dashboard\n- View statistics\n- Export reports",
  "projectName": "Test Project"
}
```
6. **Send**

Should create complete project structure!

---

## 🔒 Security

### API Key Protection:
- ✅ API key stored in `.env` (not committed to git)
- ✅ Only accessible by backend
- ✅ Never exposed to frontend

### Access Control:
- ✅ Only Project Owners can parse BRDs
- ✅ Requires authentication
- ✅ Rate limiting recommended (add express-rate-limit)

---

## ⚙️ Configuration

### Environment Variables:

```env
# Required for BRD parsing
OPENAI_API_KEY=sk-proj-xxxxx

# Optional: Change model
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo for cheaper
```

### Model Selection:

Edit `src/services/openai.service.ts`:

```typescript
const response = await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  // ... rest of config
});
```

**Models:**
- `gpt-4-turbo-preview` - Best quality, slower, expensive
- `gpt-4` - Great quality, expensive
- `gpt-3.5-turbo` - Good quality, fast, cheap

---

## 📚 Example BRD Format

```markdown
# Business Requirements Document

## Project Overview
**Project Name:** E-commerce Platform
**Description:** A modern online shopping platform

**Vision:** Become the leading e-commerce platform for small businesses

**Purpose:** Enable small businesses to sell online easily

**Objectives:**
- Launch MVP in 3 months
- Support 1000 concurrent users
- Process payments securely

**In Scope:**
- User registration and authentication
- Product catalog and search
- Shopping cart
- Checkout and payment

**Out of Scope:**
- Mobile apps (Phase 2)
- International shipping (Phase 2)

## Modules

### 1. User Management

**Description:** Handles all user-related functionality

**User Stories:**

**US-001: User Registration**
- As a new user, I want to create an account so that I can shop online
- Priority: High
- Acceptance Criteria:
  - User can register with email and password
  - Email must be validated
  - Password must meet complexity requirements

**Features:**
- Registration Form UI
- Email Validation API
- Password Hashing
- Welcome Email

**US-002: User Login**
- As a registered user, I want to login
- Priority: High
...

### 2. Product Catalog

**US-003: Browse Products**
...

## Business Rules

**BR-001: Password Policy**
- All passwords must be 10+ characters
- Must include uppercase, number, special character

**BR-002: Email Uniqueness**
- Each email can only register once
...
```

---

## 🎯 Advanced Features

### Custom Parsing Logic

Edit `src/services/openai.service.ts` to add custom logic:

```typescript
// After parsing, add custom processing
const parsedBRD = await parseBRDDocument(brdContent);

// Add custom validation
if (!parsedBRD.modules || parsedBRD.modules.length === 0) {
  throw new Error('No modules found in BRD');
}

// Add custom transformations
parsedBRD.modules = parsedBRD.modules.map(module => ({
  ...module,
  moduleDescription: module.moduleDescription || 'No description provided'
}));
```

### Streaming Responses

For large BRDs, implement streaming:

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [...],
  stream: true
});

for await (const chunk of stream) {
  // Send chunk to frontend
  res.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## 🐛 Troubleshooting

### Issue: "OpenAI API is not configured"

**Fix:** Set `OPENAI_API_KEY` in `.env`

### Issue: "Invalid API key"

**Fix:** 
1. Verify key starts with `sk-proj-` or `sk-`
2. Check key is active at https://platform.openai.com
3. Restart backend after updating `.env`

### Issue: "Rate limit exceeded"

**Fix:**
1. Add delays between requests
2. Implement caching
3. Upgrade OpenAI tier
4. Switch to gpt-3.5-turbo

### Issue: "Parsing fails or returns invalid JSON"

**Fix:**
1. Check BRD content is well-formatted
2. Try with simpler/shorter BRD
3. Adjust temperature (lower = more consistent)
4. Add retry logic

---

## 📊 Postman Testing

Add these requests to your Postman collection:

### Request 1: Check OpenAI Config

```
GET {{base_url}}/brd/check
Authorization: Bearer {{access_token}}
```

### Request 2: Parse BRD

```
POST {{base_url}}/brd/parse
Authorization: Bearer {{access_token}}
Content-Type: application/json

Body:
{
  "brdContent": "... paste your BRD here ...",
  "projectName": "Test Project from BRD"
}
```

### Request 3: Enhance Section

```
POST {{base_url}}/brd/enhance
Authorization: Bearer {{access_token}}
Content-Type: application/json

Body:
{
  "projectId": "{{project_id}}",
  "enhancementRequest": "Add social login feature"
}
```

---

## 🎊 Summary

You now have:

✅ **AI-Powered BRD Parsing** - OpenAI extracts structure  
✅ **Automatic Project Creation** - Modules, stories, features  
✅ **Dynamic Enhancement** - AI updates specific sections  
✅ **Context-Aware Prompts** - For Vibe Engineers  
✅ **Type-Safe** - Full TypeScript support  
✅ **Production-Ready** - Error handling, validation  

### Files Created:
- ✅ `src/config/prompts.ts` - AI prompts
- ✅ `src/types/brd.types.ts` - Type definitions
- ✅ `src/services/openai.service.ts` - OpenAI integration
- ✅ `src/routes/brd.routes.ts` - API endpoints
- ✅ Updated `src/routes/index.ts` - Router registration
- ✅ Updated `src/routes/prompts.routes.ts` - Real AI generation
- ✅ Updated `package.json` - OpenAI dependency
- ✅ Updated `env.example` - OpenAI key template

### API Endpoints Added:
- ✅ `POST /api/brd/parse` - Parse BRD
- ✅ `POST /api/brd/enhance` - Enhance section
- ✅ `GET /api/brd/check` - Check config
- ✅ `POST /api/prompts/generate` - Now uses real AI

**Total:** 3 new endpoints + 1 enhanced endpoint

---

## 🚀 Next Steps

1. Add OpenAI API key to `.env`
2. Restart backend
3. Test with Postman
4. Create frontend BRD upload component
5. Test end-to-end!

**Your AI-powered BRD parsing is ready!** 🤖✨

