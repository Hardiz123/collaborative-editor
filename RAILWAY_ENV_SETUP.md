# Railway Environment Variables Setup

## Quick Setup Guide

### Step 1: Open Your Railway Project
1. Go to https://railway.app
2. Select your project
3. **IMPORTANT**: Click on your **Go Backend service** (the one that's failing, not the YJS server)

### Step 2: Add Environment Variables
1. In your Go Backend service, look for the **Variables** tab (it might be in the top menu or sidebar)
2. **Alternative**: Go to **Settings** → Scroll down to **Variables** section
3. Click **+ New Variable** or **+ Add Variable** button
4. **CRITICAL**: Make sure you're adding variables to the **SERVICE**, not the project level (unless you want them shared)

### Step 2.5: Verify You're in the Right Place
- You should see the service name at the top (e.g., "Go Backend" or similar)
- If you see "Project Variables" instead, you're at the project level - that's okay, but make sure the service can access them
- If you see "Service Variables" or just "Variables" with your service name, you're in the right place

### Step 3: Add These Variables

Add the following environment variables one by one:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `PORT` | `8080` | Server port (Railway may override this) |
| `COUCHBASE_CONNECTION_STRING` | `couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com` | Your Couchbase connection string |
| `COUCHBASE_USERNAME` | `collab-access` | Couchbase username |
| `COUCHBASE_PASSWORD` | `Password@123` | Couchbase password |
| `COUCHBASE_BUCKET_NAME` | `collab-editor` | Couchbase bucket name (or `default`) |
| `JWT_SECRET` | `your-secure-random-secret-key` | **Generate a secure random string for production!** |

### Step 4: Generate a Secure JWT Secret

**Important**: Don't use "secret-secure" in production! Generate a secure random string:

**Option 1: Using OpenSSL (Terminal)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online Generator**
- Visit https://generate-secret.vercel.app/32
- Copy the generated secret

### Step 5: Verify Variables Are Added

Before redeploying, verify:
1. You should see all 5-6 variables listed in the Variables tab:
   - `COUCHBASE_CONNECTION_STRING`
   - `COUCHBASE_USERNAME`
   - `COUCHBASE_PASSWORD`
   - `COUCHBASE_BUCKET_NAME`
   - `JWT_SECRET`
   - `PORT` (optional, Railway sets this automatically)

2. Check for typos:
   - Variable names are **case-sensitive**
   - `COUCHBASE_CONNECTION_STRING` (all caps, with underscores)
   - No spaces before or after the variable name

### Step 6: Redeploy (REQUIRED!)

**IMPORTANT**: After adding variables, you MUST redeploy for them to take effect:

1. Go to the **Deployments** tab (in your Go Backend service)
2. Find the latest deployment
3. Click the **three dots (⋯)** or **menu** button
4. Click **Redeploy**
5. Wait for the deployment to complete
6. Check the **Logs** tab to verify the variables are being read

### Verification

Check the logs to verify:
- ✅ No "JWT_SECRET not set" warnings
- ✅ No "COUCHBASE_CONNECTION_STRING environment variable is not set" errors
- ✅ Should see "Server starting at http://0.0.0.0:8080"

## Troubleshooting

### Variables Still Not Working After Adding Them

**Most Common Issues:**

1. **Didn't Redeploy**: 
   - Variables only take effect after a redeploy
   - Go to Deployments → Click Redeploy on the latest deployment

2. **Added to Wrong Service**:
   - Make sure you're in the **Go Backend** service, not YJS Server
   - Check the service name at the top of the page

3. **Added at Project Level Instead of Service Level**:
   - Project-level variables should work, but if not, add them directly to the service
   - Go to your Go Backend service → Variables tab

4. **Typo in Variable Name**:
   - Variable names are case-sensitive
   - Must be exactly: `COUCHBASE_CONNECTION_STRING` (all caps)
   - Check for extra spaces or typos

5. **Variables Not Saved**:
   - Make sure you clicked "Save" or "Add" after entering each variable
   - Refresh the page and verify they're still there

### How to Verify Variables Are Set

1. Go to your Go Backend service → **Variables** tab
2. You should see all variables listed with their values (values are hidden for security)
3. If you see "No variables" or an empty list, they weren't added correctly

### Still Getting Errors?

1. **Double-check the Variables tab** - Are all 5-6 variables listed?
2. **Redeploy** - Did you click Redeploy after adding them?
3. **Check Logs** - After redeploy, check if the errors are gone
4. **Try removing and re-adding** - Sometimes Railway needs a fresh add

### Still Getting Connection Errors
- Verify your Couchbase credentials are correct
- Check that your Couchbase instance allows connections from Railway's IPs
- Ensure the connection string format is correct (should start with `couchbases://`)

### JWT Secret Warning
- Make sure `JWT_SECRET` is set (not just in your local .env file)
- The value should be a long, random string (at least 32 characters)

