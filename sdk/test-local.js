/**
 * Local test script for InsForge SDK
 * Run with: node test-local.js
 */

const { createClient } = require('./dist/index.js');

async function testSDK() {
  console.log('🧪 Testing InsForge SDK v0.0.1\n');
  
  // Initialize client
  const client = createClient({
    url: 'http://localhost:7130'
  });
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpass123';
  
  try {
    // Test 1: Sign Up
    console.log('1️⃣  Testing signUp...');
    const signUpResult = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      name: 'Test User'
    });
    
    if (signUpResult.error) {
      console.error('❌ Sign up failed:', signUpResult.error.message);
    } else {
      console.log('✅ Sign up successful');
      console.log('   User ID:', signUpResult.data.user.id);
      console.log('   Email:', signUpResult.data.user.email);
      console.log('   Token:', signUpResult.data.session.accessToken.substring(0, 20) + '...');
    }
    
    // Test 2: Sign Out
    console.log('\n2️⃣  Testing signOut...');
    await client.auth.signOut();
    console.log('✅ Signed out');
    
    // Test 3: Sign In
    console.log('\n3️⃣  Testing signInWithPassword...');
    const signInResult = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInResult.error) {
      console.error('❌ Sign in failed:', signInResult.error.message);
    } else {
      console.log('✅ Sign in successful');
      console.log('   User ID:', signInResult.data.user.id);
      console.log('   Email:', signInResult.data.user.email);
    }
    
    // Test 4: Get Current User
    console.log('\n4️⃣  Testing getCurrentUser...');
    const currentUserResult = await client.auth.getCurrentUser();
    
    if (currentUserResult.error) {
      console.error('❌ Get current user failed:', currentUserResult.error.message);
    } else if (currentUserResult.data) {
      console.log('✅ Current user retrieved');
      console.log('   User ID:', currentUserResult.data.user.id);
      console.log('   Email:', currentUserResult.data.user.email);
      console.log('   Role:', currentUserResult.data.user.role);
    }
    
    // Test 5: Get Session
    console.log('\n5️⃣  Testing getSession...');
    const sessionResult = await client.auth.getSession();
    
    if (sessionResult.error) {
      console.error('❌ Get session failed:', sessionResult.error.message);
    } else if (sessionResult.data.session) {
      console.log('✅ Session retrieved from storage');
      console.log('   Has token:', !!sessionResult.data.session.accessToken);
      console.log('   User email:', sessionResult.data.session.user.email);
    }
    
    // Test 6: OAuth (will fail if not configured, which is expected)
    console.log('\n6️⃣  Testing OAuth...');
    const oauthResult = await client.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: 'http://localhost:3000/callback',
      skipBrowserRedirect: true
    });
    
    if (oauthResult.error) {
      console.log('⚠️  OAuth not configured (expected):', oauthResult.error.message);
    } else {
      console.log('✅ OAuth URL generated:', oauthResult.data.url);
    }
    
    console.log('\n✨ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run tests
testSDK().catch(console.error);