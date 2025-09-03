# InsForge Auth SDK

## Setup
```javascript
import { createClient } from '@insforge/sdk';
const client = createClient({ baseUrl: 'http://localhost:7130' });
```

## Methods

### signUp
```javascript
await client.auth.signUp({ email, password, name? })
// Returns: { data: { accessToken, user }, error }
// user: { id, email, name, emailVerified, createdAt, updatedAt }
// Token auto-stored
```

### signInWithPassword
```javascript
await client.auth.signInWithPassword({ email, password })
// Returns: { data: { accessToken, user }, error }
// Token auto-stored
```

### signInWithOAuth
```javascript
await client.auth.signInWithOAuth({ provider: 'google'|'github', redirectTo })
// Returns: { data: { url, provider }, error }
// Redirect: window.location.href = data.url
```

### getCurrentUser
```javascript
await client.auth.getCurrentUser()
// Returns: { data: { user: { id, email, role }, profile: {...} }, error }
// Makes API call to validate token and fetch profile
```

### getCurrentSession
```javascript
await client.auth.getCurrentSession()
// Returns: { data: { session: { accessToken, user } }, error }
// From localStorage, no API call
```

### getProfile
```javascript
await client.auth.getProfile(userId)
// Returns: { data: { id, nickname, bio, ... }, error }
// Returns single object, not array!
```

### setProfile
```javascript
await client.auth.setProfile({ nickname, bio, avatar_url })
// Returns: { data: { id, nickname, bio, ... }, error }
// Returns single object, not array!
```

### signOut
```javascript
await client.auth.signOut()
// Returns: { error }
// Clears token from storage
```

## Error Codes
- `INVALID_EMAIL`
- `WEAK_PASSWORD` 
- `USER_ALREADY_EXISTS`
- `INVALID_CREDENTIALS`
- `INVALID_TOKEN`

## Notes
- Tokens stored in localStorage (browser) or memory (Node.js)
- All requests after login automatically include token
- User profile data in `users` table, not auth