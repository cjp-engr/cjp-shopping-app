# Troubleshooting: No Products Showing Up

## Issue Fixed

The issue was in the `productService.ts` file where it was trying to convert `specifications` using `Object.fromEntries()` when the backend already returns it as a plain object.

## Steps to Fix

### 1. Verify Backend is Running

```bash
# Check if backend is running
curl http://localhost:5000/health

# Should return:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

If backend is NOT running:
```bash
cd backend
npm run dev
```

### 2. Verify Products Exist in Database

```bash
# Test products endpoint
curl http://localhost:5000/api/products

# Should return JSON with products
```

If you get an empty array or error:
```bash
cd backend
npm run seed  # This will populate the database
```

### 3. **IMPORTANT: Restart Frontend Dev Server**

The `.env` file was created after the dev server started. **You MUST restart it** for Vite to load the environment variables.

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it:
npm run dev
```

### 4. Clear Browser Cache

Sometimes the browser caches old API responses:

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### 5. Check Browser Console for Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Common errors:
   - **CORS error**: Backend not running or CORS not configured
   - **Failed to fetch**: Wrong API URL or backend not accessible
   - **404 errors**: API endpoints not found

### 6. Test API Directly

Open the test file in your browser:
```bash
# Open this file in your browser:
file:///path/to/shopping-app-automation/test-api.html
```

Or use the live server:
```bash
npx serve . -p 8080
# Then open: http://localhost:8080/test-api.html
```

### 7. Verify Environment Variables

Create a temporary test in your browser console:
```javascript
// In browser console on http://localhost:5173
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
// Should log: http://localhost:5000/api
```

If it shows `undefined`, the `.env` file is not being loaded. Make sure:
- File is named exactly `.env` (not `.env.local` or `.env.txt`)
- File is in the root directory (same level as `package.json`)
- **You restarted the dev server after creating the .env file**

## Complete Restart Procedure

If products still don't show up, do a complete restart:

### Terminal 1 - Backend
```bash
cd backend

# 1. Seed the database
npm run seed

# 2. Start backend
npm run dev

# Wait for: "MongoDB Connected: localhost"
```

### Terminal 2 - Frontend
```bash
# 1. Stop current server (Ctrl+C if running)

# 2. Clear build cache (optional)
rm -rf node_modules/.vite

# 3. Start dev server
npm run dev

# Wait for: "Local: http://localhost:5173"
```

### Browser
1. Open http://localhost:5173
2. Open DevTools (F12)
3. Go to Network tab
4. Refresh page (F5)
5. Look for XHR/Fetch requests to `http://localhost:5000/api/products`

## Expected Network Requests

When the home page loads, you should see these requests in DevTools Network tab:

1. **Request:** `GET http://localhost:5000/api/products?sort=rating`
2. **Status:** 200 OK
3. **Response:** JSON with products array

## Common Issues & Solutions

### Issue: "Failed to fetch" error
**Cause:** Backend not running
**Solution:** Start backend with `cd backend && npm run dev`

### Issue: CORS error
**Cause:** CORS not configured correctly
**Solution:** Check `backend/.env` has `CORS_ORIGIN=http://localhost:5173`

### Issue: Empty products array
**Cause:** Database not seeded
**Solution:** Run `cd backend && npm run seed`

### Issue: 404 Not Found
**Cause:** Wrong API URL
**Solution:**
1. Check `.env` file: `VITE_API_BASE_URL=http://localhost:5000/api`
2. Restart dev server
3. Verify in console: `import.meta.env.VITE_API_BASE_URL`

### Issue: Products show on API test but not in app
**Cause:** Frontend not calling API correctly
**Solution:**
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify `.env` file exists and dev server was restarted

## Verification Checklist

- [ ] Backend running on http://localhost:5000
- [ ] `curl http://localhost:5000/api/products` returns products
- [ ] `.env` file exists in root directory
- [ ] `.env` contains `VITE_API_BASE_URL=http://localhost:5000/api`
- [ ] Frontend dev server restarted after creating `.env`
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows successful API calls
- [ ] MongoDB is running
- [ ] Database has been seeded

## Still Not Working?

1. **Check all three services are running:**
   ```bash
   # MongoDB
   docker ps | grep mongo
   # OR
   mongosh --eval "db.version()"

   # Backend
   curl http://localhost:5000/health

   # Frontend
   curl http://localhost:5173
   ```

2. **Check logs:**
   - Backend terminal: Look for MongoDB connection and API request logs
   - Frontend terminal: Look for compilation errors
   - Browser console: Look for JavaScript errors

3. **Nuclear option - Complete reset:**
   ```bash
   # Stop all servers

   # Frontend
   rm -rf node_modules/.vite
   rm -rf dist
   npm run dev

   # Backend
   cd backend
   npm run seed
   npm run dev
   ```

## Debug Information to Collect

If you need help, collect this information:

1. **Backend health check:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Products endpoint:**
   ```bash
   curl http://localhost:5000/api/products | head -50
   ```

3. **Frontend .env file:**
   ```bash
   cat .env
   ```

4. **Browser console errors** (screenshot)

5. **Network tab showing API requests** (screenshot)
