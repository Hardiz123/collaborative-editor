# How to Verify Railway Environment Variables Are Set

## Understanding the Log Messages

**"No .env file found, using system environment variables"** 
- ✅ This is NORMAL and EXPECTED
- It means the app is looking for Railway's environment variables (which is correct)
- This is NOT an error

**"COUCHBASE_CONNECTION_STRING environment variable is not set"**
- ❌ This IS the problem
- It means Railway's environment variables aren't being passed to your container

## How to Verify Variables Are Actually Set

### Method 1: Check Railway Dashboard

1. Go to your Railway project
2. Click on your **Go Backend service**
3. Go to **Variables** tab
4. You should see a list like this:
   ```
   COUCHBASE_CONNECTION_STRING    [hidden]
   COUCHBASE_USERNAME             [hidden]
   COUCHBASE_PASSWORD              [hidden]
   COUCHBASE_BUCKET_NAME          [hidden]
   JWT_SECRET                     [hidden]
   ```
5. If you see "No variables" or an empty list → Variables aren't added

### Method 2: Check Service Settings

1. Go to your Go Backend service
2. Click **Settings**
3. Scroll to **Environment Variables** section
4. Verify all variables are listed there

### Method 3: Add a Test Variable

1. Add a test variable: `TEST_VAR=hello123`
2. Redeploy
3. Check logs - you should be able to verify it's being read

## Common Issues

### Issue 1: Variables Added to Project, Not Service

**Solution:**
- Railway has two levels: Project variables and Service variables
- Make sure you're adding them to the **Service** (Go Backend), not the Project
- Or ensure "Use project variables" is enabled in service settings

### Issue 2: Variables Added But Not Redeployed

**Solution:**
- Variables only take effect after redeploy
- Go to **Deployments** → Click **Redeploy**

### Issue 3: Typo in Variable Name

**Solution:**
- Variable names are case-sensitive
- Must be exactly: `COUCHBASE_CONNECTION_STRING` (all caps, with underscores)
- Check for spaces: `COUCHBASE_CONNECTION_STRING` not `COUCHBASE_CONNECTION_STRING ` (trailing space)

### Issue 4: Variables Added to Wrong Service

**Solution:**
- Make sure you're in the **Go Backend** service
- Not the YJS Server service
- Check the service name at the top of the page

## Step-by-Step Verification

1. **Open Railway** → Your Project → **Go Backend Service**

2. **Check Variables Tab:**
   - Do you see 5-6 variables listed?
   - Are the names exactly correct (case-sensitive)?

3. **If variables are there but still not working:**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Wait for it to complete

4. **Check Logs after redeploy:**
   - Should see: "Server starting at http://0.0.0.0:8080"
   - Should NOT see: "COUCHBASE_CONNECTION_STRING environment variable is not set"

5. **If still not working:**
   - Try removing all variables
   - Add them again one by one
   - Redeploy

## Quick Test

Add this temporary variable to test:
```
TEST_ENV_VAR=hello_world
```

Then in your code, you could add:
```go
log.Println("TEST_ENV_VAR:", os.Getenv("TEST_ENV_VAR"))
```

After redeploy, check logs - you should see "TEST_ENV_VAR: hello_world"

If you don't see it, the variables aren't being passed to the container.

