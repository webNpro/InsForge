# InsForge SDK Documentation

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

## Setup
```javascript
import { createClient } from '@insforge/sdk';
const client = createClient({ baseUrl: 'http://localhost:7130' });
```

## Authentication

```javascript
// Sign Up
const { data, error } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
// Returns: { user: {...}, accessToken: 'jwt...' }
// Backend auto-creates user profile in 'users' table

// Sign In
const { data, error } = await client.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
// Token stored automatically for all requests

// Get Current User (with profile)
const { data, error } = await client.auth.getCurrentUser();
// Returns: { 
//   user: {id, email, role},      // Auth data
//   profile: {id, nickname, ...}  // Users table data (object, not array!)
// }

// Update Profile
const { data, error } = await client.auth.setProfile({
  nickname: 'John',
  bio: 'Developer',
  avatar_url: 'https://...'
});
// Returns: {id, nickname, bio, ...}  // Single object, not array!

// Get Any User's Profile
const { data, error } = await client.auth.getProfile(userId);
// Returns: {id, nickname, bio, ...}  // Single object, not array!

// Get Session (local storage only, no API call)
const { data } = await client.auth.getCurrentSession();
// Returns: { session: { accessToken: 'jwt...', user: {...} } }

// Sign Out
await client.auth.signOut();
```

## Database Operations

```javascript
// Select with filters
const { data, error } = await client.database
  .from('posts')
  .select('*, users!inner(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

// Insert (array required, but use .single() for one record)
const { data, error } = await client.database
  .from('posts')
  .insert([{ 
    title: 'My Post', 
    user_id: userId,
    image_url: 'https://...'
  }])
  .select()
  .single();  // Returns single object!

// Update (returns single object with .single())
const { data, error } = await client.database
  .from('users')
  .update({ nickname: 'John', bio: 'Developer' })
  .eq('id', userId)
  .select()
  .single();  // Returns single object!

// Delete
const { data, error } = await client.database
  .from('posts')
  .delete()
  .eq('id', postId);
```

## Storage Operations

```javascript
// Upload file
const formData = new FormData();
formData.append('file', fileObject);

// Get session for token
const { data: sessionData } = await client.auth.getCurrentSession();

const response = await fetch(`http://localhost:7130/api/storage/buckets/images/objects`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionData.session.accessToken}`
  },
  body: formData
});

// Response includes full URL
const { url } = await response.json();
// url = "http://localhost:7130/api/storage/buckets/images/objects/file.jpg"
```

## Complete Example

```javascript
import { createClient } from '@insforge/sdk';

const client = createClient({ baseUrl: 'http://localhost:7130' });

// 1. Sign up new user
const { data: auth, error } = await client.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// 2. Update profile (returns object, not array!)
const { data: profile } = await client.auth.setProfile({
  nickname: 'JohnDoe',
  bio: 'Full-stack developer'
});
console.log(profile.nickname); // 'JohnDoe' - direct access!

// 3. Get current user with profile
const { data: userData } = await client.auth.getCurrentUser();
console.log(userData.user.email);        // 'user@example.com'
console.log(userData.profile.nickname);  // 'JohnDoe'

// 4. Create a post
const { data: post } = await client.database
  .from('posts')
  .insert([{
    user_id: userData.user.id,
    caption: 'Hello World',
    image_url: 'https://example.com/image.jpg'
  }])
  .select()
  .single();  // Returns single object!

// 5. Get another user's profile (returns object!)
const { data: otherUser } = await client.auth.getProfile('other-user-id');
console.log(otherUser.nickname); // Direct access to properties
```

## Key Points

### Profile Management
- **Auto-creation**: When users sign up/sign in, backend automatically creates a record in `users` table
- **Profile methods return objects**: `setProfile()` and `getProfile()` return single objects, not arrays!
- **Two data sources**: 
  - `user` = auth data (id, email, role)
  - `profile` = users table data (id, nickname, avatar_url, bio, etc.)

### SDK Behavior
- Tokens stored and managed automatically after login
- All operations return `{data, error}` structure
- Database insert requires array format: `[{...}]` even for single records
- Use `.single()` to get object instead of array from queries

### When to Use What
- **SDK**: Authentication, database CRUD, profile management
- **MCP Tools**: Table creation/modification, schema management