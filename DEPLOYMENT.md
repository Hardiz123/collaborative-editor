# Deployment Guide

This guide will help you deploy the collaborative editor application to free hosting services.

## Architecture Overview

The application consists of three components:
1. **Go Backend** (API Server) - Port 8080
2. **YJS Server** (WebSocket for collaborative editing) - Port 8081
3. **React Frontend** - Static files

## Deployment Strategy

We'll use:
- **Railway** (free tier) for backend services (Go API + YJS WebSocket server)
- **Cloudflare Pages** (free tier) for frontend (or Vercel as alternative)

## Prerequisites

1. GitHub account
2. Railway account (sign up at https://railway.app)
3. Cloudflare account (sign up at https://dash.cloudflare.com - free)
4. Couchbase account (or use your existing Couchbase instance)

## Step 1: Deploy Go Backend to Railway

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create a new Railway project**:
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure the service**:
   - Railway should auto-detect it's a Go project (or you can set builder to "Dockerfile" if you prefer)
   - **Important**: If you get Nixpacks errors, go to Settings → Build → Builder and select "Dockerfile"
   - Add the following environment variables in Railway dashboard:
     ```
     PORT=8080
     COUCHBASE_CONNECTION_STRING=your-couchbase-connection-string
     COUCHBASE_USERNAME=collab-access
     COUCHBASE_PASSWORD=Password@123
     COUCHBASE_BUCKET_NAME=collab-editor
     JWT_SECRET=secret-secure
     ```

4. **Deploy**:
   - Railway will automatically build and deploy
   - Note the generated URL (e.g., `https://your-app.up.railway.app`)
   - This will be your API URL

## Step 2: Deploy YJS Server to Railway

1. **Create a second service in the same Railway project**:
   - In your Railway project, click "New Service"
   - Select "GitHub Repo" again (same repo)
   - Set the **Root Directory** to `yjs-server`
   - Set the **Start Command** to `node server.js`

2. **Configure environment variables**:
   - Add: `PORT=8081` (Railway will override this with their port, but set it for reference)

3. **Deploy**:
   - Railway will deploy the YJS server
   - Note the generated URL (e.g., `https://yjs-server.up.railway.app`)
   - Convert to WebSocket URL: `wss://yjs-server.up.railway.app` (note the `wss://`)

## Step 3: Deploy Frontend to Cloudflare Pages

1. **Go to Cloudflare Pages**:
   - Visit https://dash.cloudflare.com
   - Navigate to **Pages** in the sidebar
   - Click **Create a project**
   - Select **Connect to Git** and authorize Cloudflare to access your GitHub

2. **Configure the project**:
   - Select your repository
   - **Project name**: Choose a name (e.g., `collaborative-editor`)
   - **Production branch**: `main` (or your default branch)
   - **Framework preset**: Vite (or None if not listed)
   - **Build command**: `npm run build` (or `npm install --legacy-peer-deps && npm run build` if you encounter dependency conflicts)
   - **Build output directory**: `dist`
   - **Root directory**: `frontend` (click "Set up build configuration" and set this)
   
   **Note**: The project includes a `.npmrc` file with `legacy-peer-deps=true` to handle TipTap dependency conflicts. If you still encounter issues, use the alternative build command above.

3. **Add Environment Variables**:
   - Click **Add environment variable**
   - Add `VITE_API_URL`: Your Railway Go backend URL (e.g., `https://your-app.up.railway.app`)
   - Add `VITE_YJS_WS_URL`: Your Railway YJS server WebSocket URL (e.g., `wss://yjs-server.up.railway.app`)

4. **Deploy**:
   - Click **Save and Deploy**
   - Cloudflare will build and deploy your frontend
   - You'll get a URL like `https://your-project.pages.dev`
   - You can also add a custom domain if you have one

### Alternative: Deploy Frontend to Vercel

If you prefer Vercel:

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository

2. **Configure the project**:
   - **Root Directory**: Set to `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Add Environment Variables**:
   - `VITE_API_URL`: Your Railway Go backend URL
   - `VITE_YJS_WS_URL`: Your Railway YJS server WebSocket URL

4. **Deploy**:
   - Click "Deploy"
   - You'll get a URL like `https://your-app.vercel.app`

## Step 4: Update CORS Settings (if needed)

If you encounter CORS errors, you may need to update your Go backend to allow requests from your Cloudflare Pages domain.

Check `internal/routes/routes.go` and ensure CORS is properly configured for your frontend domain. The current CORS middleware allows all origins, so this should work out of the box.

## Step 5: Test the Deployment

1. Visit your Cloudflare Pages frontend URL
2. Try signing up/logging in
3. Create a document and test collaborative editing
4. Open the same document in multiple browser tabs to test real-time collaboration

## Alternative: Deploy Everything to Railway

If you prefer to keep everything on Railway:

1. **Deploy Go Backend** (as above)
2. **Deploy YJS Server** (as above)
3. **Deploy Frontend**:
   - Create a third service in Railway
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve -s dist -l 3000`
   - Add environment variables for API URLs

## Environment Variables Summary

### Go Backend (Railway)
```
PORT=8080
COUCHBASE_CONNECTION_STRING=your-connection-string
COUCHBASE_USERNAME=your-username
COUCHBASE_PASSWORD=your-password
COUCHBASE_BUCKET_NAME=your-bucket
JWT_SECRET=your-secret-key
```

### YJS Server (Railway)
```
PORT=8081
```

### Frontend (Cloudflare Pages or Vercel)
```
VITE_API_URL=https://your-backend.up.railway.app
VITE_YJS_WS_URL=wss://your-yjs-server.up.railway.app
```

## Troubleshooting

### CORS Errors
- Ensure your Go backend allows requests from your frontend domain
- Check CORS middleware configuration

### WebSocket Connection Issues
- Ensure you're using `wss://` (secure WebSocket) for production
- Check that Railway WebSocket support is enabled
- Verify the YJS server URL is correct

### Database Connection Issues
- Verify Couchbase connection string is correct
- Check that your Couchbase instance allows connections from Railway's IPs
- Ensure credentials are correct

### Build Failures

**Railway Go Backend:**
- **Nixpacks errors**: If you see "nix-collect-garbage" errors, switch to Dockerfile builder:
  1. Go to Railway project → Settings → Build
  2. Change Builder from "Nixpacks" to "Dockerfile"
  3. Redeploy
- Ensure all dependencies are in go.mod
- Check that Go version in Dockerfile matches your go.mod (currently 1.23)
- Verify environment variables are set correctly

**Cloudflare Pages:**
- Check build logs
- Ensure all dependencies are in package.json
- Verify Node.js version is compatible
- Check that the root directory is set to `frontend`
- **TipTap dependency conflicts**: The project includes `.npmrc` with `legacy-peer-deps=true`. If issues persist, try build command: `npm install --legacy-peer-deps && npm run build`

## Free Tier Limits

### Railway
- $5 free credit per month
- Services may sleep after inactivity
- Good for development and small projects

### Cloudflare Pages
- Unlimited deployments
- Unlimited bandwidth (free tier)
- Global CDN for fast performance
- Custom domains supported
- Perfect for frontend hosting

### Vercel (Alternative)
- Unlimited deployments
- 100GB bandwidth per month
- Also great for frontend hosting

## Notes

- Railway services may take a moment to wake up if they've been idle
- Consider using Railway's "Always On" feature (paid) for production
- Monitor your usage to stay within free tier limits
- Use environment variables for all sensitive data (never commit secrets)

