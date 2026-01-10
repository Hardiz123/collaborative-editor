# Quick Fix: Koyeb "Exec Format Error"

## Problem
```
bash: line 1: ./server: cannot execute binary file: Exec format error
```

## Solution: Use Docker Instead of Buildpack

### Step 1: Add Dockerfiles (Already Done ✅)

I've created the following files for you:
- ✅ `Dockerfile` - For GO backend
- ✅ `.dockerignore` - Excludes unnecessary files from GO build
- ✅ `yjs-server/Dockerfile` - For YJS Node.js server
- ✅ `yjs-server/.dockerignore` - Excludes unnecessary files from YJS build

### Step 2: Commit and Push

```bash
cd /Users/hardiknandwani/Documents/Practice/collaborative-editor

# Add the new files
git add Dockerfile .dockerignore
git add yjs-server/Dockerfile yjs-server/.dockerignore

# Commit
git commit -m "Add Dockerfiles for Koyeb deployment"

# Push to GitHub
git push origin main
```

### Step 3: Update Koyeb Service Configuration

#### For GO Backend Service:

1. Go to your GO backend service in Koyeb dashboard
2. Click **"Settings"** → **"Build"**
3. Change the following:
   - **Builder**: Change from "Buildpack" to **"Docker"**
   - **Dockerfile path**: `Dockerfile`
   - **Build context**: `.` (root directory)
4. Click **"Save"**
5. Click **"Redeploy"** to trigger a new deployment

#### For YJS Server (Optional - if you want to use Docker):

1. Go to your YJS service in Koyeb dashboard
2. Click **"Settings"** → **"Build"**
3. Change the following:
   - **Builder**: Change to **"Docker"**
   - **Dockerfile path**: `yjs-server/Dockerfile`
   - **Build context**: `yjs-server`
4. Click **"Save"**
5. Click **"Redeploy"**

---

## Why This Fixes the Error

The "Exec format error" occurs when:
- The binary is compiled for the wrong architecture (e.g., ARM vs x86_64)
- Koyeb's buildpack auto-detection doesn't set the correct build flags

**Docker solves this by:**
- ✅ Explicitly setting `GOOS=linux GOARCH=amd64` during build
- ✅ Using multi-stage builds for smaller, optimized images
- ✅ Ensuring consistent builds across all environments
- ✅ Including only necessary runtime dependencies

---

## Verify the Fix

After redeploying with Docker:

1. **Check Build Logs**
   - Go to your service → "Logs" tab
   - Look for successful Docker build messages
   - Should see: "Successfully built" and "Successfully tagged"

2. **Check Runtime Logs**
   - Should see: `Server starting at http://0.0.0.0:8080`
   - No more "Exec format error"

3. **Test the API**
   ```bash
   curl https://your-service-url.koyeb.app/health
   ```

---

## Next Steps

1. ✅ Commit Dockerfiles to Git
2. ✅ Push to GitHub
3. ⬜ Update Koyeb service to use Docker
4. ⬜ Redeploy the service
5. ⬜ Verify deployment is successful
6. ⬜ Test API endpoints

---

**Need help?** Check the full guide: `KOYEB_DEPLOYMENT_GUIDE.md`
