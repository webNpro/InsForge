# InsForge Instructions SDK

## When to Use SDK vs MCP Tools

### Use SDK for:
- Authentication (register, login, logout)
- Database CRUD operations (select, insert, update, delete)
- User profile management
- Application logic

### Use MCP Tools for:
- Table creation/modification
- Schema management
- Backend metadata
- Storage bucket creation

## SDK Setup
```javascript
import { createClient } from '@insforge/sdk';
const client = createClient({ baseUrl: 'http://localhost:7130' });
```

## Common Patterns

### User Registration + Profile
```javascript
// 1. Register user
const { data: auth } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// 2. Update profile
await client.database
  .from('users')
  .update({ nickname: 'John', avatar_url: '...' })
  .eq('id', auth.user.id)
  .select();
```

### Authenticated Requests
```javascript
// After login, token is automatic
await client.auth.signInWithPassword({ email, password });

// All subsequent requests include token
const { data } = await client.database.from('posts').select();
```

### User-Owned Data
```javascript
// Always include user_id for user data
const { data: auth } = await client.auth.getCurrentUser();

await client.database.from('posts').insert({
  title: 'My Post',
  user_id: auth.user.id  // Required!
}).select();
```

### Foreign Key Queries
```javascript
// Get posts with user info
const { data } = await client.database
  .from('posts')
  .select('*, user:user_id(name, email)')
  .order('created_at', { ascending: false });
```

## Testing SDK Code

### Quick Test
```javascript
// test.js
const client = createClient({ baseUrl: 'http://localhost:7130' });

// Test auth
const { error: authError } = await client.auth.getCurrentUser();
console.log(authError ? '❌ Not authenticated' : '✅ Authenticated');

// Test database
const { data, error } = await client.database.from('posts').select().limit(1);
console.log(error ? `❌ ${error.message}` : `✅ Found ${data.length} posts`);
```

### Error Handling
```javascript
const { data, error } = await client.database.from('posts').insert({ title: 'Test' }).select();

if (error) {
  if (error.code === 'PGRST301') {
    console.error('Authentication required');
  } else if (error.statusCode === 404) {
    console.error('Table not found');
  } else {
    console.error(error.message);
  }
}
```

## SDK vs API Endpoints

| SDK Method | API Endpoint |
|------------|--------------|
| `client.auth.signUp()` | `POST /api/auth/users` |
| `client.auth.signInWithPassword()` | `POST /api/auth/sessions` |
| `client.auth.getCurrentUser()` | `GET /api/auth/sessions/current` |
| `client.database.from('table').select()` | `GET /api/database/records/table` |
| `client.database.from('table').insert()` | `POST /api/database/records/table` |
| `client.database.from('table').update()` | `PATCH /api/database/records/table` |
| `client.database.from('table').delete()` | `DELETE /api/database/records/table` |

## Important
- SDK handles token storage/headers automatically
- Database operations require authentication (except GET)
- Use MCP tools for schema changes, SDK for data operations