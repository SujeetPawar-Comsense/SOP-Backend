# How to Run the RAG Service - Step by Step

## Prerequisites Check ✅

Before starting, make sure you have:
1. **Python installed** (version 3.8 or higher)
   - Check: `python --version`
2. **Backend `.env` file configured** with:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   RAG_API_URL=http://localhost:8001
   ```
   - Get your key from: https://openrouter.ai/keys

## Step 1: Install Python Dependencies 📦

Open a **new terminal/PowerShell** window and run:

```powershell
cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend\src\rag"
pip install -r requirements.txt
```

**Note:** If you get a torch installation error, run these instead:
```powershell
pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

## Step 2: Start the RAG Service 🚀

### Option A: Using the simple runner (Recommended)

1. Open a **new terminal/PowerShell** window
2. Navigate to Backend:
   ```powershell
   cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend"
   ```
3. Run the service:
   ```powershell
   python run_rag.py
   ```

### Option B: Direct run

1. Open a **new terminal/PowerShell** window
2. Navigate to Backend:
   ```powershell
   cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend"
   ```
3. Run:
   ```powershell
   python src/services/rag_api.py
   ```

### Option C: Using the batch file (Windows)

1. Open File Explorer
2. Navigate to the Backend folder
3. Double-click `start-rag.bat`

## What You Should See 👀

When the service starts successfully, you'll see:

```
Starting RAG Service on http://localhost:8001
Make sure OPENROUTER_API_KEY is set in Backend/.env
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

**Important:** Keep this terminal window open! The service needs to keep running.

## Step 3: Verify It's Working ✔️

Open another terminal and test:

```powershell
curl http://localhost:8001/health
```

Or open your browser and go to:
http://localhost:8001/health

You should see: `{"status":"healthy"}`

## Step 4: Use AI Assistance in Your App 🤖

1. Make sure your **Backend server** is also running:
   ```powershell
   cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend"
   npm start
   ```

2. Make sure your **Frontend** is running:
   ```powershell
   cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Frontend"
   npm run dev
   ```

3. Open your browser: http://localhost:5173

4. Navigate to: **Vibe Engineer** → **AI Assistance**

5. Look for the **"RAG Active"** badge (should be green)

6. Ask questions about your project!

## Example Questions to Try 💬

- "What modules are in this project?"
- "What are the main features?"
- "Explain the user authentication flow"
- "What business rules are defined?"
- "What is the tech stack?"
- "Show me the user stories for the authentication module"

## Troubleshooting 🔧

### Problem: "Module not found" error

**Solution:** Set the Python path:
```powershell
cd Backend
set PYTHONPATH=%cd%\src
python src/services/rag_api.py
```

### Problem: "Connection refused" or RAG shows "Basic Mode"

**Solution:** Make sure:
1. The RAG service terminal is still running
2. Port 8001 is not blocked by firewall
3. No other service is using port 8001

### Problem: "OPENROUTER_API_KEY not found"

**Solution:** 
1. Check your `Backend/.env` file has the key
2. Make sure it's not `.env.example` but actual `.env`
3. Restart the RAG service after adding the key

### Problem: "Failed to initialize RAG"

**Solution:**
1. Check the RAG service terminal for error messages
2. Verify your OpenRouter API key is valid
3. Make sure your project has data (modules, user stories, features)

## Quick Command Summary 📝

```powershell
# Terminal 1 - RAG Service
cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend"
python run_rag.py

# Terminal 2 - Backend Server
cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Backend"
npm start

# Terminal 3 - Frontend
cd "C:\Users\PranavKonde\Downloads\AI - Project Development SOP Understanding\Frontend"
npm run dev
```

## Need Help? 🆘

If it's still not working:
1. Share the error message from the RAG service terminal
2. Check if http://localhost:8001/health returns healthy
3. Look at the browser console (F12) for any errors
4. Make sure all 3 services are running (RAG, Backend, Frontend)
