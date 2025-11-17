# LLM Input Debug - Complete Visibility

## What's Now Shown

The debug output now shows **EXACTLY** what's being sent to the LLM:

1. **System Prompt** - The instructions to the LLM
2. **Formatted Context** - The 3 retrieved chunks joined together
3. **User Question** - The actual question asked
4. **Model Information** - Which model and settings are used

## Example Debug Output

```
================================================================================
🤖 COMPLETE INPUT TO LLM:
================================================================================
Model: openai/gpt-4o-mini (via OpenRouter)
Temperature: 0.7
----------------------------------------

--- SYSTEM PROMPT + FORMATTED CONTEXT + QUESTION ---

You are an expert project assistant for a software development team. 
Answer the user's question based on the following project context.

IMPORTANT INSTRUCTIONS:
- If asked to list ALL modules or module names, look for the "MODULE LIST OVERVIEW" or "ALL MODULES IN THIS PROJECT" section
- When you see "Total Modules: X", ensure your answer includes exactly X modules
- For listing questions, use the dedicated list chunks that contain complete lists
- If asked for details about a specific module, use the individual module chunks
- Always provide the COMPLETE list when asked for "all" items
- If the context contains a "Quick List of Module Names" section, use it for module name questions

<context>
ALL MODULES IN THIS PROJECT - COMPLETE LIST OF MODULE NAMES:

This is the complete list of all modules in the project.
Total number of modules: 9

MODULE NAMES AND DESCRIPTIONS:

Quick List of Module Names:
• Authentication, Dashboard, Reports, Settings, Notifications, Search, Help, Profile, Admin

Detailed Module List:

1. MODULE NAME: Authentication
   Description: User login and registration system
   Priority: High

2. MODULE NAME: Dashboard
   Description: Main user interface
   Priority: High

[... rest of chunk 1 ...]

---

[CHUNK 2 CONTENT]

---

[CHUNK 3 CONTENT]
</context>

Question: Give me the list of all module names in this project

Answer:

--- END OF LLM INPUT ---

Total LLM input length: 2847 characters
Estimated tokens for LLM input: ~711
================================================================================
```

## What Goes to the LLM

**ONLY these components are sent:**

1. **System Prompt** (Fixed template with instructions)
2. **Context** (The 3 retrieved chunks, separated by `---`)
3. **Question** (User's exact question)

**Nothing else!** No JSON, no metadata, no embeddings - just the text above.

## The Flow

```
User Question
    ↓
Vector Search (finds 3 most relevant chunks)
    ↓
Format: System Prompt + Context (3 chunks) + Question
    ↓
Send to LLM (OpenRouter/GPT-4)
    ↓
Get Answer
```

## Key Points

- **Only 3 chunks** are sent (not all chunks)
- **Plain text format** (not JSON)
- **System prompt** guides the LLM behavior
- **Context markers** (`<context>` tags) separate context from question
- **Total tokens** shown for cost estimation

## Debugging Benefits

With this visibility, you can:
1. **Verify the right chunks** are being sent
2. **Check the system prompt** is appropriate
3. **Monitor token usage** (should be 500-1500 tokens)
4. **Understand why certain answers** are generated
5. **Optimize prompts** if needed

## To Test

1. Restart RAG service:
   ```bash
   cd Backend
   python run_rag.py
   ```

2. Ask a question in AI Assistance

3. Check the RAG terminal for:
   - Retrieved chunks
   - **Complete LLM input** (new!)
   - Answer output

You now have 100% visibility into what the LLM receives!
