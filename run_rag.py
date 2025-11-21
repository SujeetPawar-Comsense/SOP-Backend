"""
Simple RAG service runner
"""
import sys
import os
from pathlib import Path

# Add Backend/src to Python path
backend_src = Path(__file__).parent / "src"
sys.path.insert(0, str(backend_src))

# Now run the FastAPI app
from services.rag_api import app
import uvicorn

if __name__ == "__main__":
    print("Starting RAG Service on http://localhost:8001")
    print("Make sure OPENROUTER_API_KEY is set in Backend/.env")
    uvicorn.run(app, host="0.0.0.0", port=8001)
