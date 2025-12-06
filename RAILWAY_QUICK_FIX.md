# Railway Environment Variables - Quick Fix

## ⚠️ Important: "No .env file found" is NORMAL!

**The message "No .env file found, using system environment variables" is NOT an error!**
- It just means the app is looking for Railway's environment variables (which is correct)
- The REAL problem is: "COUCHBASE_CONNECTION_STRING environment variable is not set"

This means Railway's environment variables aren't being passed to your container.

### Quick Steps (2 minutes):

1. **Go to Railway**: https://railway.app → Your Project → **Go Backend Service**

2. **Click "Variables" tab** (or Settings → Variables)

3. **Add these 5 variables** (click + New Variable for each):

   ```
   Variable: COUCHBASE_CONNECTION_STRING
   Value: couchbases://cb.jlqsadh62vp6qu0.cloud.couchbase.com
   ```

   ```
   Variable: COUCHBASE_USERNAME
   Value: collab-access
   ```

   ```
   Variable: COUCHBASE_PASSWORD
   Value: Password@123
   ```

   ```
   Variable: COUCHBASE_BUCKET_NAME
   Value: collab-editor
   ```

   ```
   Variable: JWT_SECRET
   Value: <generate using: openssl rand -base64 32>
   ```

4. **CRITICAL: Redeploy!**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Wait for it to finish

5. **Check Logs** - You should see:
   - ✅ "Server starting at http://0.0.0.0:8080"
   - ✅ No "environment variable is not set" errors

## Still Not Working?

- Make sure you're in the **Go Backend** service (not YJS Server)
- Verify all 5 variables are listed in the Variables tab
- Check for typos in variable names (must be exact, case-sensitive)
- Try removing and re-adding the variables
- Make sure you clicked **Redeploy** after adding them

