# Combined Deployment Guide for Koyeb (Free Tier)

This guide shows how to deploy **both** the GO backend and YJS Node.js server in a **single Koyeb instance** (perfect for the free tier).

## 🎯 What You'll Deploy

A single Docker container running:
- ✅ **GO Backend** on port `8080` (REST API + WebSocket)
- ✅ **YJS Server** on port `8081` (Collaborative editing WebSocket)
- ✅ **Supervisord** managing both processes

---

## 📋 Prerequisites

- ✅ Koyeb account (free tier works!)
- ✅ GitHub repository with your code
- ✅ Couchbase Capella database configured
- ✅ Files already created:
  - `Dockerfile` (combined build)
  - `supervisord.conf` (process manager)
  - `start.sh` (backup script)

---

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd /Users/hardiknandwani/Documents/Practice/collaborative-editor

# Add all new files
git add Dockerfile supervisord.conf start.sh .dockerignore

# Commit
git commit -m "Add combined deployment for GO + YJS servers"

# Push
git push origin main
```

### Step 2: Create Service on Koyeb

1. **Go to Koyeb Dashboard**
   - Visit [https://app.koyeb.com/](https://app.koyeb.com/)
   - Click **"Create Service"**

2. **Connect GitHub**
   - Select **"GitHub"** as deployment method
   - Choose your `collaborative-editor` repository
   - Select branch: `main`

3. **Configure Build Settings**
   - **Builder**: Select **"Docker"** ⚠️ Important!
   - **Dockerfile path**: `Dockerfile`
   - **Build context**: `.` (root directory)
   - **Docker target**: Leave empty

4. **Configure Service**
   - **Service name**: `collaborative-editor`
   - **Region**: Choose closest to you (e.g., `fra`, `was`)
   - **Instance type**: **Nano** (512MB RAM) - Free tier!

### Step 3: Configure Ports

> [!IMPORTANT]
> You need to expose **both ports** from the same service.

In Koyeb, you can only set one public port, but both services will be accessible:

- **Public Port**: `8080`
- **Protocol**: `HTTP`
- **Path**: `/`

> **Note**: Port 8081 will be accessible at the same domain by changing the port in your URL.

### Step 4: Set Environment Variables

Click **"Add Environment Variable"** and add these:

| Variable Name | Value | Secret |
|--------------|-------|--------|
| `PORT` | `8080` | No |
| `COUCHBASE_CONNECTION_STRING` | `couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com` | No |
| `COUCHBASE_USERNAME` | `collab-access` | No |
| `COUCHBASE_PASSWORD` | `Password@123` | ✅ Yes |
| `COUCHBASE_BUCKET_NAME` | `collab-editor` | No |
| `JWT_SECRET` | `1DRwZkX7cSGVkcSxTGeFU2h93CVqMC3xAyN3L+RiEc4=` | ✅ Yes |

### Step 5: Deploy!

1. Review all settings
2. Click **"Deploy"**
3. Wait 3-5 minutes for build and deployment

---

## ✅ Verify Deployment

### 1. Check Service Status

- Go to your service in Koyeb dashboard
- Wait for status: **"Healthy"** (green indicator)

### 2. Check Logs

Click **"Logs"** tab and verify you see:

```
[go-backend] Server starting at http://0.0.0.0:8080
[yjs-server] Yjs WebSocket server running on ws://0.0.0.0:8081
```

### 3. Test GO Backend

```bash
# Replace with your actual Koyeb URL
curl https://collaborative-editor-yourapp.koyeb.app/api/v1/health
```

**Expected**: JSON response with health status

### 4. Test YJS Server

```bash
# Test on port 8081
curl https://collaborative-editor-yourapp.koyeb.app:8081
```

**Expected**: Response "Yjs WebSocket Server"

> [!NOTE]
> If port 8081 is not accessible externally, you may need to configure Koyeb to expose multiple ports. Check Koyeb's documentation or contact support.

---

## 🔧 Update Frontend Configuration

Update your frontend to use the Koyeb URLs:

**`.env.production`:**
```env
# GO Backend API
VITE_API_URL=https://collaborative-editor-yourapp.koyeb.app

# GO WebSocket (if using GO's WebSocket)
VITE_WS_URL=wss://collaborative-editor-yourapp.koyeb.app

# YJS WebSocket Server
VITE_YJS_WS_URL=wss://collaborative-editor-yourapp.koyeb.app:8081
```

---

## 🐛 Troubleshooting

### Issue: Build Fails

**Check:**
- Dockerfile is in repository root
- supervisord.conf is committed
- yjs-server directory is NOT in .dockerignore

**Solution:**
```bash
git add Dockerfile supervisord.conf
git add yjs-server/
git commit -m "Fix deployment files"
git push
```

### Issue: Only One Service Running

**Check logs** to see which service failed.

**Common causes:**
- Missing environment variables
- Port conflicts
- Dependency installation failed

**Solution:**
- Review logs in Koyeb dashboard
- Verify all environment variables are set
- Check supervisord.conf configuration

### Issue: Can't Access Port 8081

**Koyeb Limitation**: Free tier may only expose one port publicly.

**Workaround Options:**

1. **Use a reverse proxy in your GO server** to forward YJS requests
2. **Upgrade Koyeb plan** to expose multiple ports
3. **Use subdomains** (if available in your plan)

**Alternative**: Modify your GO server to proxy YJS WebSocket connections:
```go
// In your GO server, add a reverse proxy for /yjs/*
http.HandleFunc("/yjs/", func(w http.ResponseWriter, r *http.Request) {
    // Proxy to localhost:8081
})
```

### Issue: Services Keep Restarting

**Check:**
- Memory usage (Nano instance has 512MB)
- CPU usage
- Application errors in logs

**Solution:**
- Optimize memory usage
- Add resource limits in supervisord.conf
- Consider upgrading instance size

---

## 📊 Monitoring

### View Logs
```bash
# In Koyeb dashboard
Service → Logs tab
```

You'll see logs from both services tagged:
- `[go-backend]` - GO server logs
- `[yjs-server]` - YJS server logs

### Check Resource Usage
```bash
# In Koyeb dashboard
Service → Metrics tab
```

Monitor:
- CPU usage
- Memory usage
- Network traffic

---

## 🔄 Redeployment

To redeploy after code changes:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main

# Koyeb will automatically redeploy
```

Or manually trigger:
1. Go to Koyeb dashboard
2. Click **"Redeploy"** button

---

## 💰 Cost

**Free Tier:**
- ✅ 1 Nano instance (512MB RAM)
- ✅ Perfect for development/testing
- ✅ $0/month

**If you need more resources:**
- Small: ~$15/month (1GB RAM)
- Medium: ~$30/month (2GB RAM)

---

## 🎉 Success Checklist

- [ ] Service shows "Healthy" status
- [ ] GO backend responds on port 8080
- [ ] YJS server responds on port 8081
- [ ] Frontend can connect to both services
- [ ] WebSocket connections work
- [ ] Documents save and sync correctly

---

## 📚 Additional Resources

- [Koyeb Documentation](https://www.koyeb.com/docs)
- [Supervisord Documentation](http://supervisord.org/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Need help?** Check the main deployment guide: `KOYEB_DEPLOYMENT_GUIDE.md`
