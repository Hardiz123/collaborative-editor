# Quick Deployment Guide

## 🚀 Fast Track Deployment

### 1. Deploy Go Backend to Railway

1. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. **Root Directory**: Leave empty (root)
4. **Environment Variables**:
   ```
   PORT=8080
   COUCHBASE_CONNECTION_STRING=your-connection-string
   COUCHBASE_USERNAME=your-username
   COUCHBASE_PASSWORD=your-password
   COUCHBASE_BUCKET_NAME=your-bucket
   JWT_SECRET=generate-a-random-secret-key
   ```
5. Copy the generated URL (e.g., `https://your-app.up.railway.app`)

### 2. Deploy YJS Server to Railway

1. In the same Railway project → **New Service** → GitHub Repo
2. **Root Directory**: `yjs-server`
3. **Start Command**: `node server.js`
4. Copy the generated URL and convert to WebSocket: `wss://your-yjs.up.railway.app`

### 3. Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create a project
2. Connect GitHub repo
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build` (`.npmrc` with `legacy-peer-deps=true` is included)
5. **Output Directory**: `dist`
6. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   VITE_YJS_WS_URL=wss://your-yjs.up.railway.app
   ```
7. Deploy!

**If you get dependency errors**, use this build command instead:
   ```
   npm install --legacy-peer-deps && npm run build
   ```

**Alternative: Vercel**
- Go to [Vercel](https://vercel.com) → Add New Project
- Root Directory: `frontend`, Framework: Vite
- Add the same environment variables

## ✅ That's it!

Your app should now be live. Visit your Cloudflare Pages URL to test it.

## 🔧 Troubleshooting

- **CORS errors?** CORS is already configured to allow all origins
- **WebSocket not connecting?** Make sure you're using `wss://` (not `ws://`) for production
- **Backend not starting?** Check Railway logs and verify all environment variables are set

## 📝 Notes

- Railway gives $5 free credit/month
- Services may sleep after inactivity (wake up on first request)
- Cloudflare Pages has unlimited bandwidth (free tier)
- For production, consider Railway's "Always On" feature

