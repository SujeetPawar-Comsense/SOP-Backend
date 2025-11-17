# RAG System for AI Assistance

## Quick Setup

1. **Install Dependencies**
   ```bash
   cd Backend/src/rag
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   Add to `Backend/.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   RAG_API_URL=http://localhost:8001
   ```

3. **Start RAG Service**
   ```bash
   cd Backend
   python run_rag.py
   # Or use: start-rag.bat (Windows) / start-rag.sh (Linux/Mac)
   ```

## How It Works

The RAG system provides context-aware AI assistance by:
1. Loading your project data (modules, user stories, features, business rules)
2. Creating searchable vector embeddings
3. Answering questions based on your specific project context

## Files

- `src/rag/service.py` - Core RAG logic
- `src/services/rag_api.py` - FastAPI service wrapper
- `src/services/rag.service.ts` - TypeScript integration
- `run_rag.py` - Simple startup script
- `start-rag.bat/sh` - Platform-specific launchers

## Testing

1. Ensure RAG service is running (port 8001)
2. Open app and go to Vibe Engineer → AI Assistance
3. Look for "RAG Active" badge
4. Ask project-specific questions

## Troubleshooting

- **NumPy errors**: Use NumPy 1.26.4, scikit-learn 1.5.2, scipy 1.13.1
- **API key issues**: Verify OPENROUTER_API_KEY in .env
- **Port conflicts**: Ensure port 8001 is available
