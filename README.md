# Backend - AI Project Development SOP Platform

## 📋 Quick Overview

Complete Express.js + TypeScript + Supabase backend with:
- ✅ 28 API endpoints
- ✅ 14 database tables  
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Row Level Security (RLS)
- ✅ Complete Postman collection

---

## 🚀 Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

### 3. Apply Database Schema
- Open Supabase Dashboard → SQL Editor
- Copy & run `supabase_migration.sql`
- Copy & run `complete_fix.sql`

### 4. Seed Data
```bash
npm run db:seed
```

### 5. Start Server
```bash
npm run dev
```

### 6. Test
```bash
curl http://localhost:3000/api/health
```

✅ Done! See **START_HERE.md** for detailed instructions.

---

## 📁 File Structure

```
Backend/
├── src/                    # Source code
│   ├── routes/            # API endpoints (11 files)
│   ├── middleware/        # Auth & error handling
│   ├── config/            # Supabase client
│   └── types/             # TypeScript types
│
├── scripts/               # Utility scripts
│   ├── seed.js           # Create test data
│   └── fix-missing-profiles.js
│
├── supabase_migration.sql # Database schema ⭐
├── complete_fix.sql       # Permission fixes ⭐
│
└── Documentation/
    ├── START_HERE.md            # Setup guide ⭐
    ├── BACKEND_README.md        # Code documentation
    ├── DATABASE_SCHEMA.md       # Schema reference
    ├── API_ENDPOINTS.md         # API specs
    ├── INTEGRATION_GUIDE.md     # Frontend connection
    ├── POSTMAN_GUIDE.md         # Testing guide
    ├── TROUBLESHOOTING.md       # Issue fixes
    └── FIX_INSTRUCTIONS.md      # Error solutions
```

---

## 🎯 Documentation

### Essential Docs:
1. **START_HERE.md** - Read this first!
2. **FIX_INSTRUCTIONS.md** - If you get errors
3. **POSTMAN_GUIDE.md** - Test with Postman

### Reference Docs:
- **DATABASE_SCHEMA.md** - Complete schema details
- **API_ENDPOINTS.md** - All endpoint specifications
- **INTEGRATION_GUIDE.md** - Connect to frontend
- **TROUBLESHOOTING.md** - Common problems & solutions
- **BACKEND_README.md** - Code structure explained

---

## 🧪 Testing

### Postman Collection:
```
File: AI_Project_SOP_API.postman_collection.json
Requests: 36 (organized in folders)
Auto-saves: Tokens, Project IDs
```

**Import and run "Complete Workflow Example" folder!**

### Test Accounts (after seeding):
```
Project Owner: owner@example.com / password123
Vibe Engineer: engineer@example.com / password123
```

---

## 🗃️ Database

**Tables:** 14 tables with full relationships
**Schema:** See `supabase_migration.sql` (602 lines)
**Docs:** See `DATABASE_SCHEMA.md`

### Quick Reference:
- `users` - User profiles
- `projects` - Project metadata
- `user_stories` - Agile stories
- `modules` - Project modules
- `features` - Feature tasks
- `business_rules` - Business logic (JSONB)
- `ai_prompts` - Generated prompts
- ... and 7 more tables

---

## 📡 API Endpoints

**Base URL:** `http://localhost:3000/api`

### Core Endpoints:
```
POST   /auth/signup          # Create account
POST   /auth/signin          # Login
GET    /auth/me              # Current user

GET    /projects             # List projects
POST   /projects             # Create project
GET    /projects/:id         # Get project
PUT    /projects/:id         # Update project
DELETE /projects/:id         # Delete project

GET/POST /projects/:id/user-stories
GET/POST /projects/:id/modules
GET/POST /projects/:id/features
GET/POST /projects/:id/business-rules
GET/POST /projects/:id/actions
GET/POST /projects/:id/uiux
GET/POST /projects/:id/tech-stack
GET/POST /projects/:id/documents

GET    /projects/:id/prompts
POST   /prompts/generate     # Generate AI prompt
```

**Total:** 28 endpoints - See `API_ENDPOINTS.md` for details

---

## 🔒 Security

- ✅ JWT authentication (Supabase Auth)
- ✅ Role-based access control (RBAC)
- ✅ Row Level Security (RLS) in database
- ✅ Input validation on all endpoints
- ✅ CORS protection
- ✅ Security headers (Helmet)

---

## 🛠️ Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:seed      # Create test data
npm run db:fix-profiles # Fix missing user profiles
```

---

## 🚨 Troubleshooting

### Error: "Permission denied"
**Fix:** Run `complete_fix.sql` in Supabase SQL Editor

### Error: "User profile not found"  
**Fix:** `npm run db:fix-profiles`

### Error: "Duplicate key"
**Fix:** Run `complete_fix.sql` (removes trigger conflict)

See **TROUBLESHOOTING.md** for more solutions.

---

## 📞 Get Help

| Problem | Read This |
|---------|-----------|
| Setup errors | `FIX_INSTRUCTIONS.md` |
| Database questions | `DATABASE_SCHEMA.md` |
| API questions | `API_ENDPOINTS.md` |
| Testing help | `POSTMAN_GUIDE.md` |
| Frontend connection | `INTEGRATION_GUIDE.md` |
| Any other issue | `TROUBLESHOOTING.md` |

---

## ✅ Verification

After setup, verify:
- [ ] Server running on port 3000
- [ ] Health check returns success
- [ ] 14 tables in Supabase Table Editor
- [ ] Test users created (run seed script)
- [ ] Signup works (use Postman)
- [ ] Signin returns access_token
- [ ] Can create project

---

## 🎉 You're Ready!

Follow the 7 steps above and your backend will be live in 5 minutes!

**Next:** Import Postman collection and test all endpoints! 🚀

