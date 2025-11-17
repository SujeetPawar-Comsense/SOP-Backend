# RAG Quick Start Guide

## Prerequisites Checklist

- [ ] Python 3.8+ installed
- [ ] Node.js installed
- [ ] Backend server running (`npm start` in Backend folder)
- [ ] Frontend running (`npm run dev` in Frontend folder)

## Step 1: Set up Environment Variables

1. Copy `Backend/env.example` to `Backend/.env` if not already done
2. Add your OpenRouter API key to `Backend/.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   RAG_API_URL=http://localhost:8001
   ```
   Get your key from: https://openrouter.ai/keys

## Step 2: Install Python Dependencies

Open terminal in Backend folder:

```bash
cd Backend/src/rag
pip install -r requirements.txt
```

If you get torch installation errors, try:
```bash
pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

## Step 3: Start the RAG Service

### Windows:
```bash
cd Backend
start-rag.bat
```

### Mac/Linux:
```bash
cd Backend
chmod +x start-rag.sh
./start-rag.sh
```

### Or manually:
```bash
cd Backend
python src/services/rag_api.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

## Step 4: Test the RAG Integration

1. **Open your browser** and go to: http://localhost:5173
2. **Log in** to your account
3. **Select a project** (make sure it has modules, user stories, and features)
4. **Navigate to "Vibe Engineer"** dashboard
5. **Click on "AI Assistance"** tab
6. **Wait for RAG initialization** - you should see "RAG Active" badge turn green

## Step 5: Ask Questions

Try these example questions:

- "What modules are in this project?"
- "What are the user stories for [module name]?"
- "What features are planned?"
- "What is the tech stack?"
- "What are the business rules?"
- "Explain the authentication module"
- "What are the acceptance criteria for user registration?"

## Troubleshooting

### RAG Service Won't Start

1. **Check Python version**: `python --version` (should be 3.8+)
2. **Check dependencies**: Make sure all packages installed successfully
3. **Check ports**: Make sure port 8001 is not in use

### RAG Shows "Basic Mode" Instead of "RAG Active"

1. **Check RAG service is running**: Should see the Uvicorn server on port 8001
2. **Check Backend logs**: Look for any errors in the terminal running `npm start`
3. **Check environment variables**: Make sure `RAG_API_URL=http://localhost:8001` is set
4. **Check OPENROUTER_API_KEY**: Make sure it's valid

### No Response from AI

1. **Check OpenRouter API key**: Make sure it's set in Backend/.env
2. **Check project data**: Make sure your project has modules, user stories, and features
3. **Check browser console**: Press F12 and look for any errors

### "Failed to initialize RAG" Error

1. **Check the RAG service console**: Look for error messages
2. **Check OPENROUTER_API_KEY**: Make sure it's set and valid
3. **Try restarting both services**: Stop and restart both Backend and RAG service

## Verification Steps

To verify everything is working:

1. **Check RAG service health**:
   ```bash
   curl http://localhost:8001/health
   ```
   Should return: `{"status":"healthy"}`

2. **Check Backend connection**:
   - Look at Backend console when you open AI Assistance
   - Should see: "Initializing RAG for project: [project-id]"

3. **Check Frontend status**:
   - The badge should show "RAG Active" (green)
   - Questions should get context-aware answers

## Process Flow

```
Frontend (AI Assistance Tab)
    ↓
Backend Express Server (port 3000)
    ↓
RAG TypeScript Service
    ↓
Python FastAPI RAG Service (port 8001)
    ↓
Vector Store (FAISS) + LLM (OpenRouter)
    ↓
Context-aware answer
```

## Tips

- First initialization may take 10-30 seconds as it processes all project data
- Subsequent queries should be faster (2-5 seconds)
- The vector store is cached per project for better performance
- If you update project data significantly, the RAG will reinitialize automatically

## Need Help?

If you're still having issues:

1. Share the error messages from:
   - Browser console (F12)
   - Backend terminal
   - RAG service terminal

2. Check that all services are running:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - RAG Service: http://localhost:8001
