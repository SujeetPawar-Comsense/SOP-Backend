# RAG Debug Mode Guide

## Overview
The RAG system now includes comprehensive debugging output to help you see exactly what chunks are being retrieved and sent to the LLM.

## Enabling Debug Mode

Debug mode is **ON by default**. To control it:

### Keep Debug ON (default):
```bash
# No action needed, or explicitly set:
set RAG_DEBUG=true     # Windows
export RAG_DEBUG=true  # Mac/Linux
```

### Turn Debug OFF:
```bash
set RAG_DEBUG=false     # Windows
export RAG_DEBUG=false  # Mac/Linux
```

## What Debug Mode Shows

### 1. During Initialization
When the RAG system initializes, you'll see:

```
================================================================================
📦 INITIALIZING RAG - CHUNKS CREATED:
================================================================================
Total chunks created: 15
----------------------------------------

Chunk 1:
  Source: Module List
  Type: module_overview
  Size: 450 characters
  Preview: Complete Module List:

1. Authentication
   Description: User login and registration...

Chunk 2:
  Source: Module Detail
  Module: Authentication
  Size: 1250 characters
  Preview: Module: Authentication
Description: User authentication and authorization...

[... more chunks ...]

================================================================================
✅ RAG initialized with 15 chunks
================================================================================
```

### 2. During Query
When you ask a question, you'll see:

```
================================================================================
🔍 QUERY: Give me all modules in the project
================================================================================

📚 RETRIEVED 3 CHUNKS:
--------------------------------------------------------------------------------

🔖 CHUNK 1:
   Source: Module List
   Type: module_overview
   
   Content Preview (first 300 chars):
   Complete Module List:

1. Authentication
   Description: User login and registration
   Priority: High

2. Dashboard
   Description: Main user interface...
   
   Full Length: 850 characters
----------------------------------------

🔖 CHUNK 2:
   Source: Module Detail
   Module: Authentication
   
   Content Preview (first 300 chars):
   Module: Authentication
   Description: User authentication and authorization
   Priority: High
   Business Impact: Critical for security...
   
   Full Length: 1250 characters
----------------------------------------

🔖 CHUNK 3:
   Source: Project Overview
   Type: overview
   
   Content Preview (first 300 chars):
   Project Overview:

   Project Name: MyApp
   Application Type: Web Application...
   
   Full Length: 650 characters
----------------------------------------

📊 TOTAL CHARACTERS: 2750
📊 ESTIMATED TOKENS: ~687
================================================================================

✅ ANSWER PREVIEW (first 200 chars):
   Based on the project context, here are all 9 modules in your project:

1. Authentication - User login and registration (High Priority)
2. Dashboard - Main user interface (High Priority)
3. Reports...
================================================================================
```

## Understanding the Output

### Chunk Metadata
- **Source**: Where the chunk comes from (Module List, Module Detail, Tech Stack, etc.)
- **Module**: If it's a module-specific chunk, shows which module
- **Type**: Category of chunk (module_overview, overview, technology, etc.)

### Size Metrics
- **Full Length**: Total characters in the chunk
- **Total Characters**: Sum of all retrieved chunks
- **Estimated Tokens**: Rough estimate (1 token ≈ 4 characters)

## Benefits of Debug Mode

1. **See exactly what context the LLM receives**
2. **Verify the right chunks are being retrieved**
3. **Monitor token usage** to optimize costs
4. **Debug why certain answers might be incomplete**
5. **Understand the chunking strategy**

## Troubleshooting with Debug Mode

### Problem: Missing information in answer
**Check**: Are the right chunks being retrieved? Look at the CHUNK sources.

### Problem: High token usage
**Check**: Look at TOTAL CHARACTERS and ESTIMATED TOKENS. Are chunks too large?

### Problem: Wrong answer
**Check**: Is the relevant chunk in the top 3? The content preview shows what's being used.

### Problem: Slow responses
**Check**: Total characters being processed. Large chunks = slower processing.

## Performance Tips

- If tokens are consistently > 1000, consider further chunk optimization
- If wrong chunks retrieved, improve chunk metadata or content
- Monitor which chunks are most frequently retrieved

## Disabling for Production

For production deployment, turn off debug mode to reduce console noise:

```bash
# In your production environment:
export RAG_DEBUG=false
```

Or set in your `.env` file:
```
RAG_DEBUG=false
```

The debug output is invaluable for development and troubleshooting!
