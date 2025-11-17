@echo off
echo Starting RAG Service...
echo.
echo Make sure you have:
echo 1. Installed Python dependencies (pip install -r src/rag/requirements.txt)
echo 2. Set OPENROUTER_API_KEY in Backend/.env file
echo.
cd /d "%~dp0"
python src/services/rag_api.py
pause
