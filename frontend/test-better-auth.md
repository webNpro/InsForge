# Testing Better Auth in Frontend

## Setup

1. **Backend**: Ensure Docker is running with Better Auth enabled:
   ```bash
   cd backend
   ENABLE_BETTER_AUTH=true docker compose up
   ```

2. **Environment**: Ensure Better Auth is enabled in the root `.env` file:
   ```bash
   # In the root directory
   echo "ENABLE_BETTER_AUTH=true" >> .env
   ```

3. **Run Frontend**:
   ```bash
   npm run dev
   ```

## Test Steps

### 1. Admin Login
- Navigate to http://localhost:7131
- Login with admin credentials:
  - Email: admin@example.com
  - Password: change-this-password
- Should successfully login and redirect to dashboard

### 2. Verify Admin Token
- Open browser DevTools > Application > Local Storage
- Check for:
  - `insforge_token` - Should contain JWT token
  - `insforge_admin_token` - Should contain same JWT token
  - `insforge_admin_user` - Should contain admin user info

### 3. User Management
- Navigate to Authentication page
- Should see list of users (excluding admin)
- Pagination should work
- User creation should work

### 4. Logout
- Click logout
- Should clear all tokens and redirect to login

## Verification

The implementation is working correctly if:
- ✅ Admin can login with Better Auth
- ✅ JWT token is stored and used for API calls
- ✅ User management works with admin token
- ✅ Logout clears all auth data

## Rollback

To disable Better Auth and use legacy auth:
1. Set `ENABLE_BETTER_AUTH=false` in the root `.env` file
2. Restart both backend and frontend services