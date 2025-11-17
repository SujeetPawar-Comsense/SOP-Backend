# Global Business Rules Update

## Changes Made

### 1. Renamed to "Global Business Rules"
- Changed from "Business Rules" to "Global Business Rules"
- Clear distinction from feature-specific business rules
- Indicates these are project-level rules

### 2. Added Module Applicability
Business rules now show which modules they apply to:
- If `applicableTo` field exists: Shows specific modules
- If no `applicableTo` field: Shows "All modules"

## New Chunk Structure

### Before:
```
Business Rules:

• Data Validation: All inputs must be validated
• Security: Authentication required for all endpoints
```

### After:
```
GLOBAL BUSINESS RULES (Project-level Rules):

Note: These are project-wide business rules that apply across modules, distinct from feature-specific business rules.

Data Validation:
  • Input Validation
    Description: All user inputs must be validated
    Example: Email format validation
    Applicable to Modules: Authentication, Profile, Settings
  
  • Data Sanitization
    Description: Remove harmful content from inputs
    Example: Strip HTML tags from text inputs
    Applicable to: All modules

Security:
  • Authentication Required
    Description: All endpoints require valid authentication
    Example: JWT token validation
    Applicable to Modules: Dashboard, Reports, Admin
  
  • Role-Based Access
    Description: Check user permissions for actions
    Example: Only admins can delete users
    Applicable to Modules: Admin, Settings

Note: Individual features may have their own specific business rules. Check feature details for feature-level rules.
```

## Benefits

1. **Clear Hierarchy**: 
   - Global Business Rules = Project-wide
   - Feature Business Rules = Feature-specific

2. **Module Context**: 
   - Shows exactly which modules each rule applies to
   - Helps developers know when to apply rules

3. **Better Organization**:
   - Categories → Subcategories → Module applicability
   - Complete rule information in one place

## Testing

1. **Restart RAG** to apply changes:
   ```bash
   cd Backend
   python run_rag.py
   ```

2. **Test Queries**:
   - "What are the global business rules?"
   - "Which business rules apply to the Authentication module?"
   - "Show me data validation rules"

3. **Expected Output**:
   - Should show "Global Business Rules" title
   - Should list which modules each rule applies to
   - Should distinguish from feature-specific rules

## Data Structure Expected

The business rules data should have this structure:
```json
{
  "config": {
    "categories": [
      {
        "name": "Data Validation",
        "subcategories": [
          {
            "name": "Input Validation",
            "description": "Validate all user inputs",
            "example": "Email format validation",
            "applicableTo": ["Authentication", "Profile", "Settings"]
          }
        ]
      }
    ]
  }
}
```

## Important Notes

- **Global Business Rules**: Apply across the project or to specific modules
- **Feature Business Rules**: Stored with individual features (in features table)
- **Module Applicability**: Clearly shows scope of each rule
- **Distinction**: Helps avoid confusion between project and feature rules
