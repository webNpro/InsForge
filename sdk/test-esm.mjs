/**
 * ESM test script for InsForge SDK
 * Run with: node test-esm.mjs
 */

import { createClient } from './dist/index.mjs';

console.log('🧪 Testing InsForge SDK (ESM) v0.0.1\n');

const client = createClient({
  url: 'http://localhost:7130'
});

const testEmail = `esm-test-${Date.now()}@example.com`;

// Quick test
const { data, error } = await client.auth.signUp({
  email: testEmail,
  password: 'testpass123',
  name: 'ESM Test User'
});

if (error) {
  console.error('❌ ESM test failed:', error.message);
} else {
  console.log('✅ ESM import works!');
  console.log('   User created:', data.user.email);
  console.log('   Has token:', !!data.session.accessToken);
}

console.log('\n✨ ESM test completed!');