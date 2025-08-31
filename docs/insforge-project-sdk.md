# InsForge Project SDK

## Project Setup

### 1. Install SDK
```bash
npm install @insforge/sdk
```

### 2. Environment Setup
```javascript
// .env
INSFORGE_URL=http://localhost:7130
```

### 3. Create Client
```javascript
// lib/insforge.js
import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL || 'http://localhost:7130'
});
```

## Project Structure

### React/Next.js
```javascript
// app/providers.jsx
import { insforge } from '@/lib/insforge';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data }) => {
      if (data) setUser(data.user);
    });
  }, []);
  
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
```

### Node.js/Express
```javascript
// server.js
import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'http://localhost:7130',
  apiKey: process.env.INSFORGE_API_KEY  // For server-to-server
});

app.get('/api/posts', async (req, res) => {
  const { data, error } = await insforge.database
    .from('posts')
    .select()
    .limit(10);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
```

## Common Patterns

### Protected Routes
```javascript
// middleware/auth.js
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  insforge.setApiKey(token);
  const { data, error } = await insforge.auth.getCurrentUser();
  
  if (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = data.user;
  next();
}
```

### Data Fetching Hook
```javascript
// hooks/useData.js
export function usePosts(userId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    insforge.database
      .from('posts')
      .select('*, user:user_id(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setPosts(data);
        setLoading(false);
      });
  }, [userId]);
  
  return { posts, loading };
}
```

### Form Submission
```javascript
// components/PostForm.jsx
async function handleSubmit(e) {
  e.preventDefault();
  
  const { data: user } = await insforge.auth.getCurrentUser();
  
  const { error } = await insforge.database
    .from('posts')
    .insert({
      title: formData.title,
      content: formData.content,
      user_id: user.user.id
    })
    .select();
  
  if (error) {
    alert('Error: ' + error.message);
  } else {
    router.push('/posts');
  }
}
```

## TypeScript Support

```typescript
// types.ts
import type { Database } from '@insforge/sdk';

type Post = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

// Use with SDK
const { data } = await insforge.database
  .from<Post>('posts')
  .select();
// data is typed as Post[]
```

## Testing

### Unit Tests
```javascript
// __tests__/auth.test.js
import { createClient } from '@insforge/sdk';

const client = createClient({ baseUrl: 'http://localhost:7130' });

test('user can login', async () => {
  const { data, error } = await client.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  });
  
  expect(error).toBeNull();
  expect(data.accessToken).toBeDefined();
  expect(data.user.email).toBe('test@example.com');
});
```

### E2E Tests
```javascript
// e2e/posts.spec.js
test('create and fetch post', async () => {
  // Login
  const { data: auth } = await client.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  });
  
  // Create post
  const { data: post } = await client.database
    .from('posts')
    .insert({ title: 'Test Post', user_id: auth.user.id })
    .select()
    .single();
  
  // Verify
  const { data: posts } = await client.database
    .from('posts')
    .select()
    .eq('id', post.id);
  
  expect(posts).toHaveLength(1);
  expect(posts[0].title).toBe('Test Post');
});
```

## Deployment

### Production Config
```javascript
const client = createClient({
  baseUrl: process.env.INSFORGE_URL,  // Production URL
  apiKey: process.env.INSFORGE_API_KEY,  // Server-side API key
  storage: {
    // Custom storage for SSR
    getItem: (key) => cookies.get(key),
    setItem: (key, value) => cookies.set(key, value),
    removeItem: (key) => cookies.delete(key)
  }
});
```

## Notes
- SDK is isomorphic (works in browser and Node.js)
- Tokens stored in localStorage (browser) or memory (Node.js)
- Use API keys for server-to-server communication
- All methods support TypeScript generics for type safety