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
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
OPENROUTER_MODEL = "openai/gpt-4o-mini"

# Global variables for caching
_vector_store = None
_rag_chain = None
_embeddings = None
_current_project_id = None

def create_document_chunks(project_data: Dict) -> List[Document]:
    """
    Creates document chunks from project data.
    Similar to the original RAG implementation but works with database structure.
    """
    documents = []
    
    # 1. Project Overview
    project_info = project_data.get("project_information", {})
    if project_info:
        overview_content = (
            f"Project Overview:\n"
            f"Vision: {project_info.get('vision', 'N/A')}\n"
            f"Purpose: {project_info.get('purpose', 'N/A')}\n"
            f"Objectives: {project_info.get('objectives', 'N/A')}\n"
            f"Functional Requirements: {project_info.get('functional_requirements', 'N/A')}\n"
            f"Non-Functional Requirements: {project_info.get('non_functional_requirements', 'N/A')}\n"
            f"Integration Requirements: {project_info.get('integration_requirements', 'N/A')}\n"
            f"Reporting Requirements: {project_info.get('reporting_requirements', 'N/A')}"
        )
        documents.append(Document(
            page_content=overview_content,
            metadata={"source": "Project Overview"}
        ))
    
    # 2. Business Rules
    business_rules = project_data.get("business_rules", {})
    if business_rules and business_rules.get("categories"):
        rules_content = "Business Rules:\n"
        for category in business_rules.get("categories", []):
            if isinstance(category, dict):
                rules_content += f"- {category.get('name', 'Rule')}: {category.get('description', 'N/A')}\n"
        documents.append(Document(
            page_content=rules_content,
            metadata={"source": "Business Rules"}
        ))
    
    # 3. Tech Stack
    tech_stack = project_data.get("tech_stack", {})
    if tech_stack:
        # Extract tech_stack field if it's nested
        actual_stack = tech_stack.get('tech_stack', tech_stack) if isinstance(tech_stack, dict) else tech_stack
        
        tech_content = "Tech Stack:\n"
        if isinstance(actual_stack, dict):
            for category, technologies in actual_stack.items():
                tech_content += f"{category}:\n"
                if isinstance(technologies, list):
                    for tech in technologies:
                        tech_content += f"  - {tech}\n"
                else:
                    tech_content += f"  - {technologies}\n"
        else:
            tech_content += f"{json.dumps(actual_stack, indent=2)}"
        
        documents.append(Document(
            page_content=tech_content,
            metadata={"source": "Tech Stack"}
        ))
    
    # 4. UI/UX Guidelines
    uiux = project_data.get("uiux_guidelines", {})
    if uiux and uiux.get("guidelines"):
        uiux_content = f"UI/UX Guidelines:\n{uiux.get('guidelines', 'N/A')}"
        documents.append(Document(
            page_content=uiux_content,
            metadata={"source": "UI/UX Guidelines"}
        ))
    
    # 5. Project Details
    project = project_data.get("project", {})
    if project:
        project_content = (
            f"Project Details:\n"
            f"Name: {project.get('name', 'N/A')}\n"
            f"Description: {project.get('description', 'N/A')}\n"
            f"Application Type: {project.get('application_type', 'N/A')}\n"
            f"Status: {project.get('status', 'N/A')}\n"
        )
        documents.append(Document(
            page_content=project_content,
            metadata={"source": "Project Details"}
        ))
    
    # 6. Actions and Interactions
    actions = project_data.get("actions_interactions", [])
    if actions:
        actions_content = "Actions and Interactions:\n"
        for action in actions:
            if isinstance(action, dict):
                actions_content += (
                    f"- Component: {action.get('component_name', 'N/A')}\n"
                    f"  Action Type: {action.get('action_type', 'N/A')}\n"
                    f"  Description: {action.get('description', 'N/A')}\n"
                    f"  Trigger: {action.get('trigger_event', 'N/A')}\n"
                    f"  Response: {action.get('response_action', 'N/A')}\n\n"
                )
        if len(actions_content) > 30:  # Only add if there's content
            documents.append(Document(
                page_content=actions_content.strip(),
                metadata={"source": "Actions and Interactions"}
            ))
    
    # 7. Animation Effects
    animations = project_data.get("animation_effects", [])
    if animations:
        animations_content = "Animation Effects:\n"
        for animation in animations:
            if isinstance(animation, dict):
                animations_content += (
                    f"- Element: {animation.get('element_name', 'N/A')}\n"
                    f"  Animation Type: {animation.get('animation_type', 'N/A')}\n"
                    f"  Duration: {animation.get('duration', 'N/A')}\n"
                    f"  Trigger: {animation.get('trigger', 'N/A')}\n\n"
                )
        if len(animations_content) > 20:  # Only add if there's content
            documents.append(Document(
                page_content=animations_content.strip(),
                metadata={"source": "Animation Effects"}
            ))
    
    # 8. Recent AI Prompts (for context on what's been generated)
    prompts = project_data.get("recent_ai_prompts", [])
    if prompts:
        prompts_content = "Recent AI Generated Content:\n"
        for prompt in prompts[:5]:  # Only include recent 5
            if isinstance(prompt, dict):
                prompts_content += (
                    f"- Type: {prompt.get('prompt_type', 'N/A')}\n"
                    f"  Context: {prompt.get('context', 'N/A')[:200]}...\n\n"
                )
        if len(prompts_content) > 30:  # Only add if there's content
            documents.append(Document(
                page_content=prompts_content.strip(),
                metadata={"source": "Recent AI Prompts"}
            ))
    
    # 9. Complete Module List Summary (for overview questions)
    modules = project_data.get("modules", [])
    if modules:
        modules_summary = "Complete List of All Modules in the Project:\n\n"
        
        # Group by priority
        high_priority = [m for m in modules if str(m.get('priority', '')).lower() == 'high']
        medium_priority = [m for m in modules if str(m.get('priority', '')).lower() == 'medium']
        low_priority = [m for m in modules if str(m.get('priority', '')).lower() == 'low']
        other_priority = [m for m in modules if m not in high_priority + medium_priority + low_priority]
        
        if high_priority:
            modules_summary += "HIGH PRIORITY MODULES:\n"
            for module in high_priority:
                modules_summary += f"  • {module.get('module_name', 'Unnamed')} - {module.get('description', 'No description')[:80]}\n"
        
        if medium_priority:
            modules_summary += "\nMEDIUM PRIORITY MODULES:\n"
            for module in medium_priority:
                modules_summary += f"  • {module.get('module_name', 'Unnamed')} - {module.get('description', 'No description')[:80]}\n"
        
        if low_priority:
            modules_summary += "\nLOW PRIORITY MODULES:\n"
            for module in low_priority:
                modules_summary += f"  • {module.get('module_name', 'Unnamed')} - {module.get('description', 'No description')[:80]}\n"
        
        if other_priority:
            modules_summary += "\nOTHER MODULES:\n"
            for module in other_priority:
                modules_summary += f"  • {module.get('module_name', 'Unnamed')} - {module.get('description', 'No description')[:80]}\n"
        
        modules_summary += f"\nTotal Modules in Project: {len(modules)}\n"
        modules_summary += f"Module Names: {', '.join([m.get('module_name', 'Unnamed') for m in modules])}\n"
        
        documents.append(Document(
            page_content=modules_summary,
            metadata={"source": "Modules Summary", "type": "overview", "total_count": len(modules)}
        ))
    
    # 10. Complete User Stories Summary
    user_stories = project_data.get("user_stories", [])
    if user_stories:
        stories_summary = "Complete List of All User Stories in the Project:\n\n"
        for story in user_stories[:30]:  # Limit to prevent too large chunk
            stories_summary += f"- {story.get('title', 'Unnamed')} (Priority: {story.get('priority', 'N/A')}, Status: {story.get('status', 'N/A')})\n"
        if len(user_stories) > 30:
            stories_summary += f"\n... and {len(user_stories) - 30} more user stories\n"
        stories_summary += f"\nTotal User Stories: {len(user_stories)}\n"
        
        documents.append(Document(
            page_content=stories_summary,
            metadata={"source": "User Stories Summary", "type": "overview"}
        ))
    
    # 11. Complete Features Summary
    features = project_data.get("features", [])
    if features:
        features_summary = "Complete List of All Features in the Project:\n\n"
        for feature in features[:30]:  # Limit to prevent too large chunk
            features_summary += f"- {feature.get('title', 'Unnamed')} (Priority: {feature.get('priority', 'N/A')}, Status: {feature.get('status', 'N/A')})\n"
        if len(features) > 30:
            features_summary += f"\n... and {len(features) - 30} more features\n"
        features_summary += f"\nTotal Features: {len(features)}\n"
        
        documents.append(Document(
            page_content=features_summary,
            metadata={"source": "Features Summary", "type": "overview"}
        ))
    
    # 12. Detailed Modules with User Stories and Features
    for module in modules:
        module_name = module.get('module_name', 'Unnamed Module')
        module_content = f"Module: {module_name}\n"
        module_content += f"Description: {module.get('description', 'N/A')}\n"
        module_content += f"Priority: {module.get('priority', 'N/A')}\n"
        module_content += f"Business Impact: {module.get('business_impact', 'N/A')}\n\n"
        
        # Get user stories for this module
        module_id = module.get('id')
        user_stories = [us for us in project_data.get("user_stories", []) 
                       if us.get('module_id') == module_id]
        
        for story in user_stories:
            module_content += (
                f"  User Story: {story.get('title', 'N/A')} (ID: {story.get('id', 'N/A')})\n"
                f"  Role: {story.get('user_role', 'N/A')}\n"
                f"  Description: {story.get('description', 'N/A')}\n"
                f"  Acceptance Criteria: {story.get('acceptance_criteria', 'N/A')}\n"
                f"  Priority: {story.get('priority', 'N/A')}\n"
                f"  Status: {story.get('status', 'N/A')}\n"
            )
            
            # Get features for this user story
            story_id = story.get('id')
            features = [f for f in project_data.get("features", []) 
                        if f.get('user_story_id') == story_id]
            
            for feature in features:
                module_content += (
                    f"    - Feature: {feature.get('title', 'N/A')} (ID: {feature.get('id', 'N/A')})\n"
                    f"      Description: {feature.get('description', 'N/A')}\n"
                    f"      Priority: {feature.get('priority', 'N/A')}\n"
                    f"      Status: {feature.get('status', 'N/A')}\n"
                    f"      Business Rules: {feature.get('business_rules', 'N/A')}\n"
                )
            module_content += "\n"
        
        documents.append(Document(
            page_content=module_content.strip(),
            metadata={"source": "Module", "module_name": module_name, "module_id": module_id}
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
    
    # Check if we need to reinitialize (different project)
    if _current_project_id == project_id and _vector_store is not None:
        return  # Already initialized for this project
    
    _current_project_id = project_id
    
    # 1. Create document chunks
    documents = create_document_chunks(project_data)
    
    if not documents:
        raise ValueError("No documents created from project data")
    
    # 2. Initialize embeddings
    if _embeddings is None:
        model_kwargs = {'device': 'cpu'}
        encode_kwargs = {'normalize_embeddings': True}
        _embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs=model_kwargs,
            encode_kwargs=encode_kwargs
        )
    
    # 3. Create or load vector store (project-specific)
    # Ensure DB_DIR exists
    os.makedirs(DB_DIR, exist_ok=True)
    db_path = os.path.join(DB_DIR, project_id)
    os.makedirs(db_path, exist_ok=True)
    
    if os.path.exists(os.path.join(db_path, "index.faiss")):
        _vector_store = FAISS.load_local(
            folder_path=db_path,
            embeddings=_embeddings,
            allow_dangerous_deserialization=True
        )
    else:
        _vector_store = FAISS.from_documents(
            documents=documents,
            embedding=_embeddings
        )
        _vector_store.save_local(folder_path=db_path)
    
    # 4. Create retriever with higher k value for better coverage
    retriever = _vector_store.as_retriever(search_kwargs={"k": 10})
    
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
- If asked to list ALL items (modules, features, user stories, etc.), provide the COMPLETE list from the context
- If you see a summary section with totals, use that to ensure completeness
- If the context shows "Total Modules: X" or similar counts, make sure your answer includes all items
- Be comprehensive when asked for "all" or "complete list"
- Provide specific details when available

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
    global _rag_chain
    
    if _rag_chain is None:
        raise ValueError("RAG system not initialized. Call initialize_rag() first.")
    
    try:
        answer = _rag_chain.invoke(question)
        return answer
    except Exception as e:
        raise Exception(f"Error querying RAG: {str(e)}")

