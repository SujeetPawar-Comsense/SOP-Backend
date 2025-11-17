"""
RAG Service for Vibe Engineer AI Assistance
This service provides RAG functionality for answering questions about project context
"""
import os
import json
import sys
from typing import Dict, List, Optional
from dotenv import load_dotenv

# LangChain components
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

# Configuration
# DB_DIR is relative to Backend root
# __file__ is Backend/src/rag/service.py, so we go up 2 levels to get Backend/
_backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(_backend_root, "rag_db")
EMBEDDING_MODEL = "nomic-ai/nomic-embed-text-v1.5"
OPENROUTER_MODEL = "google/gemini-2.5-flash"

# Debug mode - set to True to see retrieved chunks
DEBUG_MODE = os.getenv("RAG_DEBUG", "true").lower() == "true"

# Global variables for caching
_vector_store = None
_rag_chain = None
_embeddings = None
_current_project_id = None

def create_document_chunks(project_data: Dict) -> List[Document]:
    """
    Creates optimized document chunks from project data.
    Strategy: 
    - One chunk for module names list
    - One chunk per module with its user stories and features
    - Separate chunks for project overview, tech stack, UI/UX, business rules
    """
    documents = []
    
    # 1. Module Names List (Quick Reference Chunk - Names and Descriptions ONLY)
    modules = project_data.get("modules", [])
    if modules:
        # Create a focused chunk that will match "list all modules" queries
        module_list = "ALL MODULES IN THIS PROJECT - COMPLETE LIST OF MODULE NAMES:\n\n"
        module_list += "This is the complete list of all modules in the project.\n"
        module_list += f"Total number of modules: {len(modules)}\n\n"
        module_list += "MODULE NAMES AND DESCRIPTIONS:\n"
        
        # List all module names first for quick reference
        module_list += "\nQuick List of Module Names:\n"
        module_names = [m.get('module_name', 'Unnamed') for m in modules]
        module_list += f"• {', '.join(module_names)}\n\n"
        
        # Then detailed list with descriptions
        module_list += "Detailed Module List:\n"
        for i, module in enumerate(modules, 1):
            module_list += f"\n{i}. MODULE NAME: {module.get('module_name', 'Unnamed')}\n"
            module_list += f"   Description: {module.get('description', 'No description available')}\n"
            module_list += f"   Priority: {module.get('priority', 'Not specified')}\n"
        
        module_list += f"\n===== END OF MODULE LIST =====\n"
        module_list += f"Total Modules in Project: {len(modules)}\n"
        module_list += "Note: For detailed information about any module including user stories and features, refer to individual module chunks."
        
        documents.append(Document(
            page_content=module_list,
            metadata={
                "source": "Module List Overview", 
                "type": "module_list",
                "keywords": "all modules, module list, complete list, module names, list of modules",
                "priority": "high"
            }
        ))
    
    # 2. User Stories List (Names Only - Quick Reference)
    user_stories = project_data.get("user_stories", [])
    if user_stories:
        stories_list = "ALL USER STORIES IN THIS PROJECT - COMPLETE LIST:\n\n"
        stories_list += f"Total number of user stories: {len(user_stories)}\n\n"
        stories_list += "USER STORY TITLES:\n"
        for i, story in enumerate(user_stories, 1):
            stories_list += f"{i}. {story.get('title', 'Unnamed Story')} (Priority: {story.get('priority', 'N/A')}, Status: {story.get('status', 'N/A')})\n"
        stories_list += f"\n===== END OF USER STORIES LIST =====\n"
        stories_list += f"Total User Stories: {len(user_stories)}\n"
        
        documents.append(Document(
            page_content=stories_list,
            metadata={
                "source": "User Stories List",
                "type": "stories_list",
                "keywords": "all user stories, user story list, complete list",
                "priority": "high"
            }
        ))
    
    # 3. Features List (Names Only - Quick Reference)
    features = project_data.get("features", [])
    if features:
        features_list = "ALL FEATURES IN THIS PROJECT - COMPLETE LIST:\n\n"
        features_list += f"Total number of features: {len(features)}\n\n"
        features_list += "FEATURE TITLES:\n"
        for i, feature in enumerate(features, 1):
            features_list += f"{i}. {feature.get('title', 'Unnamed Feature')} (Priority: {feature.get('priority', 'N/A')}, Status: {feature.get('status', 'N/A')})\n"
        features_list += f"\n===== END OF FEATURES LIST =====\n"
        features_list += f"Total Features: {len(features)}\n"
        
        documents.append(Document(
            page_content=features_list,
            metadata={
                "source": "Features List",
                "type": "features_list", 
                "keywords": "all features, feature list, complete list",
                "priority": "high"
            }
        ))
    
    # 4. Individual Module Chunks (Each module with its user stories and features)
    
    for module in modules:
        module_id = module.get('id')
        module_name = module.get('module_name', 'Unnamed Module')
        
        # Build module chunk with nested data
        chunk_content = f"Module: {module_name}\n"
        chunk_content += f"Description: {module.get('description', 'N/A')}\n"
        chunk_content += f"Priority: {module.get('priority', 'N/A')}\n"
        chunk_content += f"Business Impact: {module.get('business_impact', 'N/A')}\n\n"
        
        # Get user stories for this module
        module_stories = [us for us in user_stories if us.get('module_id') == module_id]
        
        if module_stories:
            chunk_content += f"User Stories ({len(module_stories)} total):\n"
            for story in module_stories:
                story_id = story.get('id')
                chunk_content += f"\n  • {story.get('title', 'N/A')}\n"
                chunk_content += f"    Role: {story.get('user_role', 'N/A')}\n"
                chunk_content += f"    Description: {story.get('description', 'N/A')}\n"
                chunk_content += f"    Priority: {story.get('priority', 'N/A')}, Status: {story.get('status', 'N/A')}\n"
                
                # Get features for this user story
                story_features = [f for f in features if f.get('user_story_id') == story_id]
                if story_features:
                    chunk_content += f"    Features:\n"
                    for feature in story_features:
                        chunk_content += f"      - {feature.get('title', 'N/A')} (Priority: {feature.get('priority', 'N/A')}, Status: {feature.get('status', 'N/A')})\n"
        else:
            chunk_content += "User Stories: None defined yet\n"
        
        # Create chunk for this module
        documents.append(Document(
            page_content=chunk_content,
            metadata={"source": "Module Detail", "module_name": module_name, "module_id": module_id}
        ))
    
    # 5. Project Overview (Single Chunk)
    project_info = project_data.get("project_information", {})
    project = project_data.get("project", {})
    if project_info or project:
        overview_content = "Project Overview:\n\n"
        if project:
            overview_content += f"Project Name: {project.get('name', 'N/A')}\n"
            overview_content += f"Application Type: {project.get('application_type', 'N/A')}\n\n"
        if project_info:
            overview_content += f"Vision: {project_info.get('vision', 'N/A')}\n"
            overview_content += f"Purpose: {project_info.get('purpose', 'N/A')}\n"
            overview_content += f"Objectives: {project_info.get('objectives', 'N/A')}\n"
            overview_content += f"Functional Requirements: {project_info.get('functional_requirements', 'N/A')}\n"
            overview_content += f"Non-Functional Requirements: {project_info.get('non_functional_requirements', 'N/A')}\n"
        
        documents.append(Document(
            page_content=overview_content,
            metadata={"source": "Project Overview", "type": "overview"}
        ))
    
    # 6. Global Business Rules (Project-level rules, distinct from feature-specific rules)
    business_rules = project_data.get("business_rules", {})
    if business_rules:
        rules_content = "GLOBAL BUSINESS RULES (Project-level Rules):\n\n"
        rules_content += "Note: These are project-wide business rules that apply across modules, distinct from feature-specific business rules.\n\n"
        
        # Debug: Print the structure to understand the data
        if DEBUG_MODE:
            print("DEBUG - Business Rules Structure:")
            print(json.dumps(business_rules, indent=2)[:500])
        
        # Check for the actual structure with categories at the root level or in config
        categories = []
        
        # First check if categories is directly in business_rules
        if "categories" in business_rules:
            categories = business_rules.get("categories", [])
        # Then check if it's in config
        elif "config" in business_rules:
            config = business_rules.get("config", {})
            categories = config.get("categories", [])
        
        # Process categories if found
        if categories:
            for category in categories:
                if isinstance(category, dict):
                    rule_id = category.get('id', '')
                    rule_name = category.get('name', 'Rule')
                    rule_desc = category.get('description', '')
                    applicable_modules = category.get('applicableTo', [])
                    
                    rules_content += f"• {rule_name}:\n"
                    if rule_desc:
                        rules_content += f"  {rule_desc}\n"
                    
                    if applicable_modules and len(applicable_modules) > 0:
                        rules_content += f"  📍 Applicable to: {', '.join(applicable_modules)}\n"
                    else:
                        rules_content += f"  📍 Applicable to: All modules\n"
                    rules_content += "\n"
        
        # Add a summary at the end if we have rules
        if categories and len(categories) > 0:
            rules_content += f"\nTotal Global Business Rules: {len(categories)}\n"
        
        rules_content += "\nNote: Individual features may have their own specific business rules. Check feature details for feature-level rules.\n"
        
        documents.append(Document(
            page_content=rules_content,
            metadata={"source": "Global Business Rules", "type": "global_rules", "keywords": "business rules, global rules, project rules"}
        ))
    
    # 7. Tech Stack (Single Chunk)
    tech_stack = project_data.get("tech_stack", {})
    if tech_stack:
        actual_stack = tech_stack.get('tech_stack', tech_stack) if isinstance(tech_stack, dict) else tech_stack
        tech_content = "Technology Stack:\n\n"
        
        if isinstance(actual_stack, dict):
            for category, technologies in actual_stack.items():
                tech_content += f"{category}:\n"
                if isinstance(technologies, list):
                    for tech in technologies:
                        tech_content += f"  • {tech}\n"
                else:
                    tech_content += f"  • {technologies}\n"
                tech_content += "\n"
        
        documents.append(Document(
            page_content=tech_content,
            metadata={"source": "Tech Stack", "type": "technology"}
        ))
    
    # 8. UI/UX Guidelines (Single Chunk)
    uiux = project_data.get("uiux_guidelines", {})
    if uiux:
        uiux_content = "UI/UX Guidelines:\n\n"
        guidelines = uiux.get('guidelines', 'No guidelines defined yet')
        uiux_content += guidelines
        
        documents.append(Document(
            page_content=uiux_content,
            metadata={"source": "UI/UX Guidelines", "type": "design"}
        ))
    
    
    return documents

def initialize_rag(project_id: str, project_data: Dict) -> None:
    """
    Initialize RAG system with project data.
    Creates or loads vector store and RAG chain.
    """
    global _vector_store, _rag_chain, _embeddings, _current_project_id
    
    # Load .env from Backend directory
    env_path = os.path.join(_backend_root, '.env')
    load_dotenv(env_path)
    
    if not os.getenv("OPENROUTER_API_KEY"):
        raise ValueError("OPENROUTER_API_KEY not found in environment")
    
    # Check if we need to reinitialize (different project or embeddings changed)
    if _current_project_id == project_id and _vector_store is not None and _embeddings is not None:
        # Check if we're using a different embedding model
        if not hasattr(_embeddings, '_model_changed'):
            return  # Already initialized for this project
    
    _current_project_id = project_id
    
    # 1. Create document chunks
    documents = create_document_chunks(project_data)
    
    if not documents:
        raise ValueError("No documents created from project data")
    
    # Debug: Print created chunks
    if DEBUG_MODE:
        print("\n" + "="*80)
        print("📦 INITIALIZING RAG - CHUNKS CREATED:")
        print("="*80)
        print(f"Total chunks created: {len(documents)}")
        print("-"*40)
        
        for i, doc in enumerate(documents, 1):
            print(f"\nChunk {i}:")
            print(f"  Source: {doc.metadata.get('source', 'Unknown')}")
            if 'module_name' in doc.metadata:
                print(f"  Module: {doc.metadata['module_name']}")
            if 'type' in doc.metadata:
                print(f"  Type: {doc.metadata['type']}")
            print(f"  Size: {len(doc.page_content)} characters")
            # Show first 200 chars for initialization (full content would be too much for all chunks)
            preview = doc.page_content[:200] + ("..." if len(doc.page_content) > 200 else "")
            print(f"  Preview: {preview}")
        
        print("\n" + "="*80)
        print(f"✅ RAG initialized with {len(documents)} chunks")
        print("="*80 + "\n")
    else:
        print(f"✅ RAG initialized with {len(documents)} chunks")
    
    # 2. Initialize embeddings
    if _embeddings is None:
        # Nomic embeddings require trust_remote_code
        model_kwargs = {
            'device': 'cpu',
            'trust_remote_code': True  # Required for nomic-embed
        }
        encode_kwargs = {'normalize_embeddings': True}
        
        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        print("Note: First time loading may take a few minutes to download the model...")
        
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )
        
        print("✅ Embedding model loaded successfully")
    
    # 3. Create or load vector store (project-specific)
    # Ensure DB_DIR exists
    os.makedirs(DB_DIR, exist_ok=True)
    db_path = os.path.join(DB_DIR, project_id)
    os.makedirs(db_path, exist_ok=True)
    
    # Force rebuild if embedding model changed or if specified
    force_rebuild = os.getenv("RAG_FORCE_REBUILD", "false").lower() == "true"
    
    if os.path.exists(os.path.join(db_path, "index.faiss")) and not force_rebuild:
        try:
            print("Loading existing vector store...")
            _vector_store = FAISS.load_local(
                folder_path=db_path,
                embeddings=_embeddings,
                allow_dangerous_deserialization=True
            )
            print("✅ Vector store loaded from cache")
        except Exception as e:
            print(f"⚠️ Failed to load vector store: {e}")
            print("Rebuilding vector store with new embeddings...")
            _vector_store = FAISS.from_documents(
                documents=documents,
                embedding=_embeddings
            )
            _vector_store.save_local(folder_path=db_path)
            print("✅ Vector store rebuilt and saved")
    else:
        print("Building new vector store...")
        _vector_store = FAISS.from_documents(
            documents=documents,
            embedding=_embeddings
        )
        _vector_store.save_local(folder_path=db_path)
        print("✅ Vector store created and saved")
    
    # 4. Create retriever with optimized k value (3 most relevant chunks)
    retriever = _vector_store.as_retriever(search_kwargs={"k": 3})
    
    # 5. Initialize LLM
    llm = ChatOpenAI(
        model_name=OPENROUTER_MODEL,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Vibe Engineer RAG"
        },
        temperature=0.7
    )
    
    # 6. Create RAG chain
    template = """You are an expert project assistant for a software development team. 
Answer the user's question based on the following project context.

IMPORTANT INSTRUCTIONS:
- If asked to list ALL modules or module names, look for the "MODULE LIST OVERVIEW" or "ALL MODULES IN THIS PROJECT" section
- When you see "Total Modules: X", ensure your answer includes exactly X modules
- For listing questions, use the dedicated list chunks that contain complete lists
- If asked for details about a specific module, use the individual module chunks
- Always provide the COMPLETE list when asked for "all" items
- If the context contains a "Quick List of Module Names" section, use it for module name questions
- Distinguish between "Global Business Rules" (project-level) and feature-specific business rules
- When discussing business rules, mention which modules they apply to if specified

<context>
{context}
</context>

Question: {question}

Answer:"""
    
    prompt = ChatPromptTemplate.from_template(template)
    
    def format_docs(docs):
        return "\n\n---\n\n".join([d.page_content for d in docs])
    
    _rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

def query_rag(question: str) -> str:
    """
    Query the RAG system with a question.
    """
    global _rag_chain, _vector_store
    
    if _rag_chain is None:
        raise ValueError("RAG system not initialized. Call initialize_rag() first.")
    
    try:
        if DEBUG_MODE:
            # Debug: Retrieve and print chunks
            print("\n" + "="*80)
            print(f"🔍 QUERY: {question}")
            print("="*80)
            
            # Get the retriever and fetch documents
            retriever = _vector_store.as_retriever(search_kwargs={"k": 3})
            
            # Try different method names for compatibility
            try:
                retrieved_docs = retriever.invoke(question)
            except AttributeError:
                try:
                    retrieved_docs = retriever.get_relevant_documents(question)
                except AttributeError:
                    # Fallback: use similarity search directly
                    retrieved_docs = _vector_store.similarity_search(question, k=3)
            
            # Print retrieved chunks for debugging
            print(f"\n📚 RETRIEVED {len(retrieved_docs)} CHUNKS:")
            print("-"*80)
            
            for i, doc in enumerate(retrieved_docs, 1):
                print(f"\n🔖 CHUNK {i}:")
                print(f"   Source: {doc.metadata.get('source', 'Unknown')}")
                if 'module_name' in doc.metadata:
                    print(f"   Module: {doc.metadata['module_name']}")
                if 'type' in doc.metadata:
                    print(f"   Type: {doc.metadata['type']}")
                print(f"   Length: {len(doc.page_content)} characters")
                print(f"\n   === COMPLETE CHUNK CONTENT ===")
                print("   " + doc.page_content.replace('\n', '\n   '))
                print(f"   === END OF CHUNK ===")
                print("-"*40)
            
            # Calculate total tokens (rough estimate: 1 token ≈ 4 characters)
            total_chars = sum(len(doc.page_content) for doc in retrieved_docs)
            estimated_tokens = total_chars // 4
            print(f"\n📊 TOTAL CHARACTERS: {total_chars}")
            print(f"📊 ESTIMATED TOKENS: ~{estimated_tokens}")
            print("="*80 + "\n")
        
        # Format the context that will be sent to LLM
        if DEBUG_MODE:
            # Get the formatted context
            retriever = _vector_store.as_retriever(search_kwargs={"k": 3})
            try:
                docs = retriever.invoke(question)
            except AttributeError:
                try:
                    docs = retriever.get_relevant_documents(question)
                except AttributeError:
                    docs = _vector_store.similarity_search(question, k=3)
            
            # Format documents the same way the chain does
            formatted_context = "\n\n---\n\n".join([d.page_content for d in docs])
            
            # Build the complete prompt that goes to LLM
            complete_prompt = f"""You are an expert project assistant for a software development team. 
Answer the user's question based on the following project context.

IMPORTANT INSTRUCTIONS:
- If asked to list ALL modules or module names, look for the "MODULE LIST OVERVIEW" or "ALL MODULES IN THIS PROJECT" section
- When you see "Total Modules: X", ensure your answer includes exactly X modules
- For listing questions, use the dedicated list chunks that contain complete lists
- If asked for details about a specific module, use the individual module chunks
- Always provide the COMPLETE list when asked for "all" items
- If the context contains a "Quick List of Module Names" section, use it for module name questions
- Distinguish between "Global Business Rules" (project-level) and feature-specific business rules
- When discussing business rules, mention which modules they apply to if specified

<context>
{formatted_context}
</context>

Question: {question}

Answer:"""
            
            print("\n" + "="*80)
            print("🤖 COMPLETE INPUT TO LLM:")
            print("="*80)
            print(f"Model: {OPENROUTER_MODEL} (via OpenRouter)")
            print(f"Temperature: 0.7")
            print("-"*40)
            print("\n--- SYSTEM PROMPT + FORMATTED CONTEXT + QUESTION ---\n")
            print(complete_prompt)
            print("\n--- END OF LLM INPUT ---")
            print(f"\nTotal LLM input length: {len(complete_prompt)} characters")
            print(f"Estimated tokens for LLM input: ~{len(complete_prompt) // 4}")
            print("="*80 + "\n")
        
        # Now invoke the chain with the question
        answer = _rag_chain.invoke(question)
        
        if DEBUG_MODE:
            # Print complete answer
            print(f"✅ COMPLETE ANSWER:")
            print("-"*40)
            print(answer)
            print("-"*40)
            print(f"Answer length: {len(answer)} characters")
            print("="*80 + "\n")
        
        return answer
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        raise Exception(f"Error querying RAG: {str(e)}")

