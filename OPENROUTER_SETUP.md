# 🔄 OpenRouter Setup Guide

## 🎯 What is OpenRouter?

OpenRouter provides unified access to multiple AI providers (OpenAI, Anthropic, Google, Meta, etc.) through a single API. Benefits:

- ✅ Access multiple AI models
- ✅ Automatic fallback if one provider is down
- ✅ Often cheaper than direct OpenAI
- ✅ Same API interface as OpenAI
- ✅ No code changes needed!

---

## ⚡ Quick Setup

### Step 1: Get OpenRouter API Key

1. Go to https://openrouter.ai/
2. Click **"Sign In"** (or create account)
3. Go to **"Keys"** page: https://openrouter.ai/keys
4. Click **"Create Key"**
5. Copy the key (starts with `sk-or-v1-`)

### Step 2: Configure Backend

Edit `Backend/.env`:

```env
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openai/gpt-4-turbo-preview
APP_URL=http://localhost:3000
```

### Step 3: Restart Backend

```bash
cd Backend
npm run dev
```

Should see:
```
🚀 Server started successfully!
```

### Step 4: Test It

```bash
curl -X GET http://localhost:3000/api/brd/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "success": true,
  "openai": {
    "configured": true,
    "message": "OpenAI is configured and ready"
  }
}
```

✅ **OpenRouter is working!**

---

## 🎨 Available Models

OpenRouter gives you access to many models. Update `OPENROUTER_MODEL` in `.env`:

### **OpenAI Models:**
```env
OPENROUTER_MODEL=openai/gpt-4-turbo-preview     # Best quality
OPENROUTER_MODEL=openai/gpt-4                   # Excellent
OPENROUTER_MODEL=openai/gpt-3.5-turbo           # Fast & cheap
```

### **Anthropic Models:**
```env
OPENROUTER_MODEL=anthropic/claude-3-opus        # Best reasoning
OPENROUTER_MODEL=anthropic/claude-3-sonnet      # Balanced
OPENROUTER_MODEL=anthropic/claude-3-haiku       # Fast & cheap
```

### **Google Models:**
```env
OPENROUTER_MODEL=google/gemini-pro              # Good & free tier
```

### **Meta Models:**
```env
OPENROUTER_MODEL=meta-llama/llama-3-70b         # Open source
```

### **Recommended for BRD Parsing:**

**Best Quality:**
```env
OPENROUTER_MODEL=openai/gpt-4-turbo-preview
# or
OPENROUTER_MODEL=anthropic/claude-3-opus
```

**Best Value:**
```env
OPENROUTER_MODEL=openai/gpt-3.5-turbo
# or
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

**Free Tier:**
```env
OPENROUTER_MODEL=google/gemini-pro
```

---

## 💰 Pricing

OpenRouter often offers better pricing than direct API access:

### **For BRD Parsing (typical):**

**GPT-4 Turbo via OpenRouter:**
- ~$0.05-$0.15 per parse

**Claude 3 Sonnet via OpenRouter:**
- ~$0.03-$0.10 per parse

**GPT-3.5 Turbo via OpenRouter:**
- ~$0.01-$0.03 per parse

**Gemini Pro via OpenRouter:**
- Often FREE tier available!

### **Cost Savings:**

1. Use cheaper models for simple BRDs
2. Use premium models for complex documents
3. Cache results
4. Batch process when possible

---

## 🔧 Configuration Options

### Your `.env` file:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Optional (defaults shown)
OPENROUTER_MODEL=openai/gpt-4-turbo-preview  # Which model to use
APP_URL=http://localhost:3000                # Your app URL (for tracking)

# Alternative: Use OpenAI directly
# OPENAI_API_KEY=sk-proj-xxxxx              # Direct OpenAI key
```

### Model Selection Priority:

The code checks in this order:
1. `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`
2. `OPENAI_API_KEY` (direct OpenAI)
3. Error if neither is set

---

## 🧪 Testing Different Models

### Test BRD Parsing with Different Models:

1. **Set model in .env:**
```env
OPENROUTER_MODEL=google/gemini-pro
```

2. **Restart backend**

3. **Parse a BRD** via Postman/curl

4. **Compare results:**
   - Quality
   - Speed
   - Cost

5. **Choose best model for your needs**

### Quick Model Comparison:

| Model | Quality | Speed | Cost | Best For |
|-------|---------|-------|------|----------|
| GPT-4 Turbo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $$$ | Complex BRDs |
| Claude 3 Opus | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $$$ | Detailed analysis |
| GPT-3.5 Turbo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ | Simple BRDs |
| Claude 3 Haiku | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ | Fast parsing |
| Gemini Pro | ⭐⭐⭐ | ⭐⭐⭐⭐ | FREE | Testing/dev |

---

## 🔍 Debugging

### Check Which Provider is Used:

Add logging to `src/services/openai.service.ts`:

```typescript
console.log('🤖 Using model:', process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo-preview');
console.log('🔑 Using OpenRouter:', !!process.env.OPENROUTER_API_KEY);
```

### View OpenRouter Dashboard:

1. Go to https://openrouter.ai/
2. Click **"Activity"**
3. See all your API calls
4. Monitor costs in real-time

### Test API Key:

```bash
curl https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer YOUR_OPENROUTER_KEY"
```

Should return key info and credit balance.

---

## 📊 OpenRouter vs OpenAI

### **OpenRouter Advantages:**

✅ Multiple AI providers in one API  
✅ Automatic failover  
✅ Often cheaper  
✅ Free tier available (Gemini)  
✅ Easy model switching  
✅ Credits system (pay as you go)  

### **OpenAI Direct Advantages:**

✅ Slightly faster (direct connection)  
✅ Latest models first  
✅ Official support  

### **Recommendation:**

- **Development:** Use OpenRouter with Gemini Pro (free!)
- **Production:** Use OpenRouter with GPT-4 or Claude 3

---

## 🎯 Example Configuration

### For Development (Free):

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=google/gemini-pro
```

### For Production (Best Quality):

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=anthropic/claude-3-opus
```

### For Production (Balanced):

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=openai/gpt-4-turbo-preview
```

---

## 🚨 Troubleshooting

### Issue: "401 Incorrect API key"

**Fix:**
1. Verify key starts with `sk-or-v1-`
2. Check key is copied completely (no spaces)
3. Verify key is active at https://openrouter.ai/keys
4. Restart backend after updating .env

### Issue: "Model not found"

**Fix:**
1. Check model name is correct (e.g., `openai/gpt-4-turbo-preview`)
2. See full list: https://openrouter.ai/docs#models
3. Use format: `provider/model-name`

### Issue: "Insufficient credits"

**Fix:**
1. Go to https://openrouter.ai/credits
2. Add credits to your account
3. Some models have free tiers!

---

## 📚 More Info

- **OpenRouter Docs:** https://openrouter.ai/docs
- **Available Models:** https://openrouter.ai/models
- **Pricing:** https://openrouter.ai/docs#pricing
- **Dashboard:** https://openrouter.ai/activity

---

## ✅ Quick Start Summary

```bash
# 1. Get API key from https://openrouter.ai/keys
# 2. Add to Backend/.env:
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=openai/gpt-4-turbo-preview

# 3. Restart backend
npm run dev

# 4. Test
curl http://localhost:3000/api/brd/check \
  -H "Authorization: Bearer TOKEN"

# Should return: "configured": true
```

**Your AI features are now working with OpenRouter!** 🎉

