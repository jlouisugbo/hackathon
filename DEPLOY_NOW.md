# Quick Deploy Instructions

## Your Railway Project is Ready!

**Project URL:** https://railway.com/project/c52b2bdb-2ada-4db7-8d1d-31baeebeff88

## Option 1: Use Railway Dashboard (Recommended)

1. **Open Railway Dashboard**: https://railway.com/project/c52b2bdb-2ada-4db7-8d1d-31baeebeff88

2. **Click on your service** (hackathon-prizepicks)

3. **Go to "Settings" tab**

4. **Under "Source Repo"** → Click "Disconnect"

5. **Click "Connect Repo"** → Select your GitHub repo → Select `backend` as the root directory

6. **Go to "Variables" tab** and add these:
   ```
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=*
   JWT_SECRET=hackathon-demo-secret-2025
   SUPABASE_URL=https://qdpifbozghjgugcmzxwh.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcGlmYm96Z2hqZ3VnY216eHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjI4NTIsImV4cCI6MjA3NDUzODg1Mn0.EmyP_M6gMe3x3NrQ6sQdwpXpDTp8SaEcx-g4Bwpbggk
   DEMO_MODE=true
   ```

7. **Railway will auto-deploy!**

8. **Get your URL**: Go to "Settings" → "Domains" → "Generate Domain"

## Option 2: Use Railway CLI

```bash
cd backend

# Make sure you're in the right project
railway link c52b2bdb-2ada-4db7-8d1d-31baeebeff88

# Deploy
railway up
```

## After Deployment

Once you get your Railway URL (like `https://hackathon-prizepicks-production.up.railway.app`), tell Claude and he'll update your frontend to use it!

## Current Status

✅ Backend built successfully
✅ Package.json fixed (removed workspace dependency)
✅ Railway project created
⏳ Waiting for deployment...

## sportsdataio

020f2e02adf44ad1ae7f7fb9264588e9
