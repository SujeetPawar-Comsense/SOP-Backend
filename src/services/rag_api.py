"""
FastAPI service for RAG functionality
This can be run as a separate microservice or called from the main backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import uvicorn
# Import RAG service from Backend/src/rag
import sys
import os
from pathlib import Path

# Add Backend/src to path to import rag.service
backend_src = Path(__file__).parent.parent
sys.path.insert(0, str(backend_src))

try:
    from rag.service import initialize_rag, query_rag
except ImportError as e:
    print(f"Warning: Could not import RAG service: {e}")
    print("Make sure you're running from the Backend directory")
    raise

app = FastAPI(title="RAG Service API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectDataRequest(BaseModel):
    project_id: str
    project_data: Dict

class QueryRequest(BaseModel):
    project_id: str
    question: str

@app.post("/initialize")
async def initialize(request: ProjectDataRequest):
    """Initialize RAG system with project data"""
    try:
        print(f"Initializing RAG for project: {request.project_id}")
        print(f"Project data keys: {request.project_data.keys()}")
        initialize_rag(request.project_id, request.project_data)
        return {"success": True, "message": "RAG system initialized"}
    except Exception as e:
        print(f"Error initializing RAG: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query(request: QueryRequest):
    """Query the RAG system"""
    try:
        answer = query_rag(request.question)
        return {"success": True, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

