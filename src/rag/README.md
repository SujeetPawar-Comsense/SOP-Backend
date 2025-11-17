# RAG Module

This module contains the RAG (Retrieval-Augmented Generation) system for Vibe Engineer AI assistance.

## Files

- `service.py` - Core RAG logic for processing project data and generating context-aware answers
- `requirements.txt` - Python dependencies for the RAG system
- `sample_input.json` - Sample data structure for testing
- `__init__.py` - Makes this directory a Python package

## Usage

The RAG service is accessed through:
- FastAPI service: `Backend/src/services/rag_api.py`
- TypeScript wrapper: `Backend/src/services/rag.service.ts`
- Express routes: `Backend/src/routes/prompts.routes.ts`

## Installation

```bash
cd Backend/src/rag
pip install -r requirements.txt
```

### Note on PyTorch Installation

If you encounter issues installing PyTorch or want the CPU-only version (smaller, faster for CPU-only systems), you can install it separately:

```bash
# For CPU-only version (recommended if you don't have CUDA)
pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu

# Then install the rest
pip install -r requirements.txt
```

The standard `torch==2.8.0` in requirements.txt should work for most systems.

## Configuration

Set `OPENROUTER_API_KEY` in your `.env` file (in Backend directory).

## Vector Store Location

Vector stores are saved to `Backend/rag_db/{project_id}/` directory.

