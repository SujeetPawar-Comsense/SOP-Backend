# 🚀 Backend Setup - START HERE

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd Backend
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp env.example .env
```

Edit `.env` with your Supabase credentials:

```env
PORT=3000
NODE_ENV=development

# Get these from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

CORS_ORIGIN=http://localhost:5173
```

### Step 3: Apply Database Migration

**Go to Supabase Dashboard:**
1. Open https://app.supabase.com
2. Click **SQL Editor** (left sidebar)
3. Click **+ New query**
4. Open `Backend/supabase_migration.sql` in your editor
5. Copy **ALL contents** (Ctrl+A, Ctrl+C)
6. Paste into SQL Editor (Ctrl+V)
7. Click **RUN**
8. Wait for "Success" (~30 seconds)

### Step 4: Fix Permissions

**Still in SQL Editor:**
1. Click **+ New query**
2. Open `Backend/complete_fix.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **RUN**

✅ This fixes permission and duplicate key errors!

### Step 5: Seed Test Data

```bash
npm run db:seed
```

Creates test accounts:
- ✅ `owner@example.com` / `password123` (Project Owner)
- ✅ `engineer@example.com` / `password123` (Vibe Engineer)

### Step 6: Start Server

```bash
npm run dev
```

Should see:
```
🚀 Server started successfully!
📡 API running on: http://localhost:3000
✅ Ready to accept requests!
```

### Step 7: Test It!

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "success": true,
  "message": "API is running"
}
```

✅ **Backend is working!**

---

## 🧪 Test with Postman

1. **Import Collection:**
   - Open Postman
   - Import `AI_Project_SOP_API.postman_collection.json`

2. **Run Complete Workflow:**
   - Right-click **"🔄 Complete Workflow Example"** folder
   - Click **"Run folder"**
   - Watch all 7 requests execute!

3. **Or test manually:**
   - Run: **"3. Signin - Get Token"**
   - Run: **"2. Create Project"**
   - Run: **"Generate AI Prompt"**

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── index.ts              # Main Express app
│   ├── config/
│   │   └── supabase.ts       # Supabase client
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── errorHandler.ts   # Error handling
│   ├── routes/ (11 files)
│   │   ├── auth.routes.ts    # Auth endpoints
│   │   ├── projects.routes.ts # Projects CRUD
│   │   └── ... (9 more)      # All other endpoints
│   └── types/
│       └── index.ts          # TypeScript types
│
├── scripts/
│   ├── seed.js               # Create test data
│   └── fix-missing-profiles.js # Fix user profiles
│
├── supabase_migration.sql    # Main database schema
├── complete_fix.sql          # Fixes all permission errors
│
├── AI_Project_SOP_API.postman_collection.json # Postman tests
├── POSTMAN_GUIDE.md          # How to use Postman
│
├── START_HERE.md             # This file
├── BACKEND_README.md         # Detailed documentation
├── DATABASE_SCHEMA.md        # Database reference
├── API_ENDPOINTS.md          # API specification
├── INTEGRATION_GUIDE.md      # Connect frontend
├── TROUBLESHOOTING.md        # Common issues
└── FIX_INSTRUCTIONS.md       # Error fixes
```

---

## 📊 What You Have

### Database:
- ✅ 14 tables
- ✅ 25+ indexes
- ✅ 30+ RLS policies
- ✅ Auto-update triggers

### API:
- ✅ 28 endpoints
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Input validation
- ✅ Error handling

### Testing:
- ✅ Postman collection (36 requests)
- ✅ Seed script
- ✅ Fix scripts

---

## 🔍 Documentation Guide

| File | Purpose | When to Read |
|------|---------|--------------|
| **START_HERE.md** | Setup guide | **First** - Setup backend |
| **FIX_INSTRUCTIONS.md** | Error fixes | If you get errors |
| **BACKEND_README.md** | Code details | Understanding the code |
| **DATABASE_SCHEMA.md** | Schema reference | Database questions |
| **API_ENDPOINTS.md** | API specs | Building integrations |
| **INTEGRATION_GUIDE.md** | Frontend connection | Connecting frontend |
| **POSTMAN_GUIDE.md** | Testing guide | Using Postman |
| **TROUBLESHOOTING.md** | Common issues | Debugging problems |

---

## 🚨 Common Issues & Quick Fixes

### Issue: "Permission denied"
**Fix:** Run `complete_fix.sql` in Supabase SQL Editor

### Issue: "User profile not found"
**Fix:** 
```bash
npm run db:fix-profiles
```

### Issue: "Duplicate key error"
**Fix:** Already handled in updated code + run `complete_fix.sql`

---

## 🎯 Next Steps

### Right Now:
1. ✅ Follow steps 1-7 above
2. ✅ Test with Postman
3. ✅ Verify in Supabase Dashboard

### Then:
1. Read `INTEGRATION_GUIDE.md`
2. Connect your frontend
3. Deploy!

---

## 📞 Need Help?

- **Setup issues?** → `FIX_INSTRUCTIONS.md`
- **Database questions?** → `DATABASE_SCHEMA.md`
- **API questions?** → `API_ENDPOINTS.md`
- **Other issues?** → `TROUBLESHOOTING.md`

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` configured with Supabase credentials
- [ ] `supabase_migration.sql` run in SQL Editor
- [ ] `complete_fix.sql` run in SQL Editor
- [ ] 14 tables visible in Table Editor
- [ ] Test data seeded (`npm run db:seed`)
- [ ] Server starts (`npm run dev`)
- [ ] Health check passes
- [ ] Postman collection imported
- [ ] Signup/signin works

---

**Your backend is ready! Follow the 7 steps above.** 🚀
