# InsForge SDK Reference

## Install
```bash
npm install @insforge/sdk
```

## Initialize
```javascript
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  url: 'http://localhost:7130',
  apiKey: 'ik_xxx'  // optional
});
```

## Auth Methods

### `signUp()`
```javascript
await insforge.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'  // optional
})
// Response: { data: { user, session }, error }
// user: { id, email, name, emailVerified, createdAt, updatedAt }
// session: { accessToken, user }
```

### `signInWithPassword()`
```javascript
await insforge.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
// Response: { data: { user, session }, error }
// user: { id, email, name, emailVerified, createdAt, updatedAt }
// session: { accessToken, user }
```

### `signInWithOAuth()`
```javascript
await insforge.auth.signInWithOAuth({
  provider: 'google',  // or 'github'
  redirectTo: 'http://localhost:3000/dashboard',
  skipBrowserRedirect: true  // optional, returns URL instead of redirecting
})
// Response: { data: { url, provider }, error }
// Auto-redirects in browser unless skipBrowserRedirect: true
```

### `signOut()`
```javascript
await insforge.auth.signOut()
// Response: { error }
// Clears stored tokens
```

### `getCurrentUser()`
```javascript
await insforge.auth.getCurrentUser()
// Response: { data: { user }, error }
// user: { id, email, role }  // Partial user data from API
// Returns null if not authenticated
```

### `getSession()`
```javascript
await insforge.auth.getSession()
// Response: { data: { session }, error }
// session: { accessToken, user }
// Gets from local storage, no API call
```

## Error Response
```javascript
{
  error: {
    statusCode: 401,
    error: 'INVALID_CREDENTIALS',
    message: 'Invalid login credentials',
    nextActions: 'Check email and password'
  }
}
```

## Storage
- **Browser**: localStorage
- **Node.js**: In-memory Map
- **Custom**: Provide via `storage` option in config

## Types (from @insforge/shared-schemas)
```typescript
import type {
  UserSchema,
  CreateUserRequest,
  CreateSessionRequest,
  GetCurrentSessionResponse
} from '@insforge/shared-schemas';
```