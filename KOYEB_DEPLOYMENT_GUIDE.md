# Koyeb Deployment Guide

This guide will walk you through deploying your collaborative editor application on Koyeb, which consists of:
1. **GO Backend Server** - Main API server with WebSocket support
2. **YJS Node.js Server** - Dedicated Yjs WebSocket server for real-time collaboration

## Prerequisites

- [Koyeb Account](https://app.koyeb.com/) (Sign up for free)
- GitHub repository with your code
- Couchbase Capella database (already configured)

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   (Deployed     │
│   separately)   │
└────────┬────────┘
         │
         ├──────────────────┬─────────────────────┐
         │                  │                     │
         ▼                  ▼                     ▼
┌────────────────┐  ┌──────────────┐   ┌─────────────────┐
│  GO Backend    │  │ YJS Node.js  │   │   Couchbase     │
│  Server        │  │ Server       │   │   Capella       │
│  (Koyeb)       │  │ (Koyeb)      │   │   (Cloud)       │
│  Port: 8080    │  │ Port: 8081   │   │                 │
└────────────────┘  └──────────────┘   └─────────────────┘
```

---

## Part 1: Deploy GO Backend Server

### Step 1: Prepare Your Repository

1. **Ensure your repository is pushed to GitHub**
   ```bash
   # Add the new Dockerfiles
   git add Dockerfile .dockerignore
   git add yjs-server/Dockerfile yjs-server/.dockerignore
   
   # Commit and push
   git commit -m "Add Dockerfiles for Koyeb deployment"
   git push origin main
   ```

2. **Verify your GO server structure**
   - Entry point: `cmd/server/main.go`
   - Go version: `1.24.0` (specified in `go.mod`)
   - Default port: `8080` (configurable via `PORT` env variable)

### Step 2: Create GO Backend Service on Koyeb

1. **Log in to Koyeb**
   - Go to [https://app.koyeb.com/](https://app.koyeb.com/)
   - Sign in or create an account

2. **Create a New Service**
   - Click **"Create Service"** button
   - Select **"GitHub"** as the deployment method

3. **Connect GitHub Repository**
   - Click **"Connect GitHub"** (if not already connected)
   - Authorize Koyeb to access your repositories
   - Select your `collaborative-editor` repository
   - Choose the branch (e.g., `main`)

4. **Configure Build Settings**
   
   **Option A: Using Docker (Recommended)**
   - **Builder**: Select **"Docker"**
   - **Dockerfile path**: `Dockerfile`
   - **Docker target**: Leave empty
   - **Build context**: `.`
   
   > ✅ **Recommended**: Docker provides consistent builds and avoids architecture-related errors.

   **Option B: Using Buildpack (Alternative)**
   - **Builder**: Select **"Buildpack"**
   - **Build command**: `go build -o server ./cmd/server`
   - **Run command**: `./server`
   
   > ⚠️ **Note**: If you get "Exec format error", switch to Docker method above.

5. **Configure Instance Settings**
   - **Service name**: `collaborative-editor-backend`
   - **Region**: Choose closest to your users (e.g., `fra` for Europe, `was` for US East)
   - **Instance type**: 
     - Start with **"Nano"** (512MB RAM, 0.1 vCPU) for testing
     - Upgrade to **"Small"** or **"Medium"** for production

6. **Configure Environment Variables**
   
   Click **"Add Environment Variable"** and add the following:

   | Name | Value | Secret |
   |------|-------|--------|
   | `PORT` | `8080` | No |
   | `COUCHBASE_CONNECTION_STRING` | `couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com` | No |
   | `COUCHBASE_USERNAME` | `collab-access` | No |
   | `COUCHBASE_PASSWORD` | `Password@123` | **Yes** ✓ |
   | `COUCHBASE_BUCKET_NAME` | `collab-editor` | No |
   | `JWT_SECRET` | `1DRwZkX7cSGVkcSxTGeFU2h93CVqMC3xAyN3L+RiEc4=` | **Yes** ✓ |

   > **Important**: Mark sensitive values (passwords, secrets) as "Secret"

7. **Configure Ports**
   - **Public Port**: `8080`
   - **Protocol**: `HTTP`
   - **Path**: `/` (default)

8. **Health Checks** (Optional but recommended)
   - **HTTP Path**: `/health` (if you have a health endpoint)
   - **Port**: `8080`
   - **Initial delay**: `30` seconds
   - **Timeout**: `5` seconds

9. **Deploy**
   - Review all settings
   - Click **"Deploy"**
   - Wait for deployment to complete (usually 2-5 minutes)

### Step 3: Verify GO Backend Deployment

1. **Check Deployment Status**
   - Go to your service dashboard
   - Wait for status to show **"Healthy"** (green)

2. **Get Your Service URL**
   - Copy the public URL (e.g., `https://collaborative-editor-backend-yourapp.koyeb.app`)

3. **Test the API**
   ```bash
   # Test health endpoint (if available)
   curl https://collaborative-editor-backend-yourapp.koyeb.app/health
   
   # Or test a public endpoint
   curl https://collaborative-editor-backend-yourapp.koyeb.app/api/v1/health
   ```

---

## Part 2: Deploy YJS Node.js Server

### Step 1: Prepare YJS Server

1. **Verify YJS server structure**
   - Entry point: `yjs-server/server.js`
   - Default port: `8081` (configurable via `PORT` env variable)
   - Dependencies: `yjs`, `ws`, `y-protocols`, `lib0`

### Step 2: Create YJS Service on Koyeb

1. **Create Another New Service**
   - Go back to Koyeb dashboard
   - Click **"Create Service"** again

2. **Connect Same GitHub Repository**
   - Select **"GitHub"** as deployment method
   - Choose the same `collaborative-editor` repository
   - Select the branch (e.g., `main`)

3. **Configure Build Settings**
   
   **Option A: Using Docker (Recommended)**
   - **Builder**: Select **"Docker"**
   - **Dockerfile path**: `yjs-server/Dockerfile`
   - **Docker target**: Leave empty
   - **Build context**: `yjs-server`
   
   > ✅ **Recommended**: Docker ensures consistent Node.js environment.

   **Option B: Using Buildpack (Alternative)**
   - **Builder**: Select **"Buildpack"** (will auto-detect Node.js)
   - **Working directory**: `yjs-server`
   - **Build command**: `npm install`
   - **Run command**: `npm start`

4. **Configure Instance Settings**
   - **Service name**: `collaborative-editor-yjs`
   - **Region**: **Same region as GO backend** (important for low latency)
   - **Instance type**: 
     - Start with **"Nano"** (512MB RAM) for testing
     - Upgrade to **"Small"** for production

5. **Configure Environment Variables**
   
   Click **"Add Environment Variable"** and add:

   | Name | Value | Secret |
   |------|-------|--------|
   | `PORT` | `8081` | No |
   | `HOST` | `0.0.0.0` | No |
   | `NODE_ENV` | `production` | No |

6. **Configure Ports**
   - **Public Port**: `8081`
   - **Protocol**: `HTTP` (WebSocket will upgrade from HTTP)
   - **Path**: `/`

7. **Deploy**
   - Review all settings
   - Click **"Deploy"**
   - Wait for deployment to complete

### Step 3: Verify YJS Server Deployment

1. **Check Deployment Status**
   - Wait for status to show **"Healthy"**

2. **Get Your YJS Service URL**
   - Copy the public URL (e.g., `https://collaborative-editor-yjs-yourapp.koyeb.app`)

3. **Test WebSocket Connection**
   ```bash
   # Test HTTP endpoint
   curl https://collaborative-editor-yjs-yourapp.koyeb.app
   # Should return: "Yjs WebSocket Server"
   ```

4. **Test WebSocket (using wscat)**
   ```bash
   # Install wscat if you don't have it
   npm install -g wscat
   
   # Test WebSocket connection
   wscat -c wss://collaborative-editor-yjs-yourapp.koyeb.app/test-doc
   # Should connect successfully
   ```

---

## Part 3: Update Frontend Configuration

### Step 1: Update API Endpoints

Update your frontend environment variables to point to Koyeb services:

**For Vite/React (`.env.production`):**
```env
VITE_API_URL=https://collaborative-editor-backend-yourapp.koyeb.app
VITE_WS_URL=wss://collaborative-editor-backend-yourapp.koyeb.app
VITE_YJS_WS_URL=wss://collaborative-editor-yjs-yourapp.koyeb.app
```

**For Next.js (`.env.production`):**
```env
NEXT_PUBLIC_API_URL=https://collaborative-editor-backend-yourapp.koyeb.app
NEXT_PUBLIC_WS_URL=wss://collaborative-editor-backend-yourapp.koyeb.app
NEXT_PUBLIC_YJS_WS_URL=wss://collaborative-editor-yjs-yourapp.koyeb.app
```

### Step 2: Update CORS Settings (if needed)

If your GO backend has CORS restrictions, update the allowed origins to include your frontend domain.

---

## Part 4: Monitoring & Troubleshooting

### Monitoring

1. **View Logs**
   - Go to your service in Koyeb dashboard
   - Click **"Logs"** tab
   - Monitor real-time logs

2. **Check Metrics**
   - Click **"Metrics"** tab
   - Monitor CPU, Memory, Network usage

3. **Set Up Alerts** (Optional)
   - Configure alerts for downtime or high resource usage

### Common Issues & Solutions

#### Issue 1: "Exec format error" when running GO server

**Symptom**: `bash: ./server: cannot execute binary file: Exec format error`

**Solution**:
- ✅ **Use Docker deployment method** (see Step 4 in Part 1)
- Docker ensures the binary is built for the correct architecture (linux/amd64)
- If using Buildpack, make sure build command includes: `CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server`

#### Issue 2: Build Fails for GO Server

**Symptom**: Build fails with "cannot find package"

**Solution**:
- Ensure `go.mod` and `go.sum` are committed
- Check that all dependencies are properly listed
- Verify Go version compatibility
- Make sure `Dockerfile` is in the repository root

#### Issue 3: YJS Server Not Starting

**Symptom**: Service shows "Unhealthy" status

**Solution**:
- Check logs for errors
- Verify `package.json` has correct `start` script
- Ensure `PORT` environment variable is set
- Verify working directory is set to `yjs-server`

#### Issue 4: WebSocket Connection Fails

**Symptom**: Frontend can't connect to WebSocket

**Solution**:
- Ensure you're using `wss://` (not `ws://`) for production
- Check that ports are correctly exposed
- Verify CORS settings allow WebSocket upgrades
- Check browser console for connection errors

#### Issue 5: Database Connection Fails

**Symptom**: GO server logs show Couchbase connection errors

**Solution**:
- Verify all Couchbase environment variables are set correctly
- Check Couchbase Capella firewall allows Koyeb IPs
- Test connection string and credentials
- Ensure bucket name is correct

#### Issue 6: High Memory Usage

**Symptom**: Service restarts frequently due to OOM

**Solution**:
- Upgrade to larger instance type
- Implement document cleanup in YJS server
- Add memory limits and garbage collection tuning

---

## Part 5: Production Best Practices

### 1. Use Custom Domains

Instead of Koyeb subdomains, use your own domain:

1. Go to service settings
2. Click **"Domains"**
3. Add custom domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed
5. SSL certificates are automatically provisioned

### 2. Enable Auto-Scaling (if needed)

For production workloads:
1. Go to service settings
2. Enable **"Auto-scaling"**
3. Set min/max instances
4. Configure scaling triggers

### 3. Set Up Health Checks

Add health check endpoints to your servers:

**GO Server** (`internal/handlers/health.go`):
```go
func HealthCheck(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
        "service": "collaborative-editor-backend",
    })
}
```

**YJS Server** (already has basic HTTP response):
```javascript
// Already implemented in server.js
server.on('request', (request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Yjs WebSocket Server');
});
```

### 4. Implement Logging

Use structured logging for better debugging:
- GO: Use `zap` or `logrus`
- Node.js: Use `winston` or `pino`

### 5. Monitor Performance

- Set up application performance monitoring (APM)
- Track WebSocket connection metrics
- Monitor database query performance

### 6. Backup Strategy

- Regular Couchbase backups
- Document version history
- Disaster recovery plan

---

## Part 6: Cost Optimization

### Koyeb Pricing Tiers

- **Free Tier**: 
  - 1 Nano instance (512MB RAM)
  - Good for testing

- **Paid Tiers**:
  - Nano: ~$5/month
  - Small: ~$15/month
  - Medium: ~$30/month

### Tips to Reduce Costs

1. **Start Small**: Use Nano instances for both services initially
2. **Monitor Usage**: Scale up only when needed
3. **Optimize Code**: Reduce memory footprint
4. **Use Caching**: Implement Redis for frequently accessed data
5. **Auto-scaling**: Only scale when traffic increases

---

## Quick Reference

### Service URLs (Replace with your actual URLs)

| Service | URL |
|---------|-----|
| GO Backend | `https://collaborative-editor-backend-yourapp.koyeb.app` |
| YJS Server | `https://collaborative-editor-yjs-yourapp.koyeb.app` |

### Environment Variables Checklist

**GO Backend:**
- ✓ PORT
- ✓ COUCHBASE_CONNECTION_STRING
- ✓ COUCHBASE_USERNAME
- ✓ COUCHBASE_PASSWORD (secret)
- ✓ COUCHBASE_BUCKET_NAME
- ✓ JWT_SECRET (secret)

**YJS Server:**
- ✓ PORT
- ✓ HOST
- ✓ NODE_ENV

### Deployment Commands

```bash
# Push changes to trigger redeployment
git add .
git commit -m "Update configuration"
git push origin main

# Koyeb will automatically redeploy both services
```

---

## Next Steps

1. ✅ Deploy GO Backend Server
2. ✅ Deploy YJS Node.js Server
3. ⬜ Update Frontend Configuration
4. ⬜ Test End-to-End Functionality
5. ⬜ Set Up Custom Domains
6. ⬜ Configure Monitoring & Alerts
7. ⬜ Implement Production Health Checks

---

## Support & Resources

- **Koyeb Documentation**: https://www.koyeb.com/docs
- **Koyeb Support**: https://www.koyeb.com/support
- **Community**: https://community.koyeb.com/

---

## Troubleshooting Checklist

Before asking for help, verify:

- [ ] All environment variables are set correctly
- [ ] Services show "Healthy" status in Koyeb dashboard
- [ ] Logs don't show critical errors
- [ ] Ports are correctly configured
- [ ] Database connection is working
- [ ] Frontend is pointing to correct URLs
- [ ] CORS is properly configured
- [ ] WebSocket connections can upgrade from HTTP

---

**Good luck with your deployment! 🚀**
