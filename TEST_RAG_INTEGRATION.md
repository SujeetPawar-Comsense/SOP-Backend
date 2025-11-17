# Testing RAG Integration - Complete Guide

## Current Status
- ✅ RAG service is running on port 8001
- ⚠️ Getting 500 error on initialization (fixing now)
- 📝 Added detailed logging to track issues

## What We Fixed

1. **Environment Variable Loading**: 
   - RAG now loads `.env` from the correct Backend directory
   - Added path resolution for OPENROUTER_API_KEY

2. **Added Detailed Logging**:
   - Frontend logs when RAG initializes
   - Frontend logs each query attempt
   - Backend logs project data received
   - RAG service logs initialization details

3. **Error Handling**:
   - Better error messages for debugging
   - Traceback printing for 500 errors

## Testing Steps

### 1. Restart the RAG Service

Stop the current service (Ctrl+C) and restart:

```powershell
cd Backend
python run_rag.py
```

You should now see more detailed logs when errors occur.

### 2. Check Your .env File

Make sure `Backend/.env` contains:
```
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
RAG_API_URL=http://localhost:8001
```

### 3. Open Browser Developer Console

1. Press F12 in your browser
2. Go to the Console tab
3. Clear the console
4. Navigate to Vibe Engineer → AI Assistance

### 4. Watch for These Logs

You should see in browser console:
```
Starting RAG initialization for project: [uuid]
RAG system initialized successfully
```

When you send a message:
```
Generating AI response. RAG initialized: true, Project ID: [uuid]
Querying RAG with question: [your question]
RAG response received: [answer]
```

### 5. Check RAG Service Terminal

In the terminal running RAG service, you should see:
```
Initializing RAG for project: [uuid]
Project data keys: dict_keys(['project_information', 'modules', 'user_stories', 'features', 'business_rules', 'tech_stack', 'uiux_guidelines'])
```

## If You Still Get Errors

### Error: "OPENROUTER_API_KEY not found"

**Fix:**
1. Make sure the key is in `Backend/.env` (not `.env.example`)
2. Restart the RAG service after adding the key

### Error: "500 Internal Server Error" on Initialize

**Check the RAG terminal** for the actual error. Common causes:
- Missing OPENROUTER_API_KEY
- Invalid API key
- Network issues reaching OpenRouter

### Error: "RAG not initialized, using fallback responses"

This means initialization failed. Check:
1. Is the RAG service running? (port 8001)
2. Is the Backend server running? (port 3000)
3. Check browser console for initialization errors

### No API Calls When Sending Messages

If you see "RAG not initialized, using fallback responses" in console:
1. The initialization failed earlier
2. Refresh the page to retry initialization
3. Check the RAG status badge (should be green for "RAG Active")

## What the Integration Does

When working correctly:

1. **On Page Load**: 
   - Fetches ALL project data (modules, user stories, features, business rules, tech stack, UI/UX guidelines)
   - Sends to RAG service to create vector embeddings
   - Creates a searchable knowledge base

2. **On Each Question**:
   - Searches the knowledge base for relevant context
   - Uses OpenRouter LLM to generate an answer based on YOUR project data
   - Returns project-specific answers

3. **Example Questions That Work**:
   - "What modules are in this project?"
   - "List all user stories for authentication"
   - "What are the business rules?"
   - "Explain the tech stack"
   - "What features are planned for the dashboard module?"

## Quick Verification

Run this in a new terminal to check if RAG is healthy:

```powershell
curl http://localhost:8001/health
```

Should return: `{"status":"healthy"}`

## Next Steps

After fixing the current issues:
1. The RAG will receive complete project data
2. Questions will be answered based on your actual project context
3. No more static/fallback responses

The system is designed to provide context-aware assistance based on your specific project's modules, user stories, features, and configurations.
