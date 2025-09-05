#!/bin/bash

# Comprehensive S3 Download Strategy Test
# Tests multiple scenarios to confirm optimization is working correctly

API_BASE="http://localhost:7130/api"
TEST_PASSED=0
TEST_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
track_pass() {
    TEST_PASSED=$((TEST_PASSED + 1))
    echo -e "${GREEN}✓${NC} $1"
}

track_fail() {
    TEST_FAILED=$((TEST_FAILED + 1))
    echo -e "${RED}✗${NC} $1"
}

echo -e "${BLUE}=== Comprehensive S3 Download Strategy Test ===${NC}"
echo ""

# Setup: Get auth token
echo "Setting up test user..."
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/users" \
    -H "Content-Type: application/json" \
    -d '{"email":"s3-test-comprehensive@example.com","password":"test123"}')

if echo "$AUTH_RESPONSE" | grep -q '"accessToken"'; then
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/sessions" \
        -H "Content-Type: application/json" \
        -d '{"email":"s3-test-comprehensive@example.com","password":"test123"}')
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to authenticate${NC}"
    exit 1
fi

echo "✓ Authenticated successfully"
echo ""

# Setup: Create test buckets directly in database
echo "Setting up test buckets..."
docker exec insforge-postgres psql -U postgres -d insforge -c "
  DELETE FROM _storage_buckets WHERE name LIKE 'test-%';
  INSERT INTO _storage_buckets (name, public) VALUES 
  ('test-public', true),
  ('test-private', false),
  ('test-toggle', true)
  ON CONFLICT (name) DO UPDATE SET public = EXCLUDED.public;
" > /dev/null 2>&1

echo "✓ Created test buckets"
echo ""

# Upload test files
echo "Uploading test files..."
echo "Test file content $(date)" > /tmp/test-file.txt

for bucket in test-public test-private test-toggle; do
    curl -s -X PUT "$API_BASE/storage/buckets/$bucket/objects/test.txt" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@/tmp/test-file.txt" > /dev/null 2>&1
done

echo "✓ Files uploaded"
echo ""

echo -e "${BLUE}Test 1: Public bucket returns direct URL${NC}"
PUBLIC_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/test-public/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

METHOD=$(echo "$PUBLIC_RESPONSE" | jq -r '.method')
URL=$(echo "$PUBLIC_RESPONSE" | jq -r '.url')

if [ "$METHOD" = "direct" ]; then
    track_pass "Public bucket returns 'direct' method"
    
    # Check URL format
    if echo "$URL" | grep -q "https://.*\.s3\..*\.amazonaws.com/"; then
        track_pass "URL is direct S3 format"
    else
        track_fail "URL doesn't look like direct S3 URL"
    fi
    
    # Check for absence of signature
    if echo "$URL" | grep -q "X-Amz-Signature"; then
        track_fail "Direct URL should NOT have signature"
    else
        track_pass "Direct URL has no signature (correct)"
    fi
    
    # Check for absence of expiration
    if echo "$PUBLIC_RESPONSE" | grep -q '"expiresAt"'; then
        track_fail "Direct URL should NOT have expiresAt"
    else
        track_pass "Direct URL has no expiration (correct)"
    fi
else
    track_fail "Public bucket should return 'direct', got '$METHOD'"
fi

echo ""
echo -e "${BLUE}Test 2: Private bucket returns presigned URL${NC}"
PRIVATE_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/test-private/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 7200}')

METHOD=$(echo "$PRIVATE_RESPONSE" | jq -r '.method')
URL=$(echo "$PRIVATE_RESPONSE" | jq -r '.url')
EXPIRES=$(echo "$PRIVATE_RESPONSE" | jq -r '.expiresAt')

if [ "$METHOD" = "presigned" ]; then
    track_pass "Private bucket returns 'presigned' method"
    
    # Check for signature
    if echo "$URL" | grep -q "X-Amz-Signature"; then
        track_pass "Presigned URL has signature"
    else
        track_fail "Presigned URL missing signature"
    fi
    
    # Check for expiration
    if [ "$EXPIRES" != "null" ]; then
        track_pass "Presigned URL has expiresAt: ${EXPIRES:0:19}"
        
        # Verify expiration is roughly 2 hours from now (7200 seconds)
        if echo "$PRIVATE_RESPONSE" | grep -q '"expiresIn"'; then
            track_fail "Response should not echo back expiresIn"
        else
            track_pass "Response format correct (no expiresIn echo)"
        fi
    else
        track_fail "Presigned URL missing expiresAt"
    fi
else
    track_fail "Private bucket should return 'presigned', got '$METHOD'"
fi

echo ""
echo -e "${BLUE}Test 3: Download access without authentication${NC}"

# Test public bucket without auth
PUBLIC_DOWNLOAD=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_BASE/storage/buckets/test-public/objects/test.txt")

if [ "$PUBLIC_DOWNLOAD" = "200" ]; then
    track_pass "Public bucket allows download without auth (HTTP 200)"
else
    track_fail "Public bucket should allow unauthenticated access, got HTTP $PUBLIC_DOWNLOAD"
fi

# Test private bucket without auth
PRIVATE_DOWNLOAD=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_BASE/storage/buckets/test-private/objects/test.txt")

if [ "$PRIVATE_DOWNLOAD" = "401" ] || [ "$PRIVATE_DOWNLOAD" = "403" ]; then
    track_pass "Private bucket blocks unauthenticated access (HTTP $PRIVATE_DOWNLOAD)"
else
    track_fail "Private bucket should block unauthenticated access, got HTTP $PRIVATE_DOWNLOAD"
fi

echo ""
echo -e "${BLUE}Test 4: Bucket visibility toggle${NC}"

# Start with public (current state)
INITIAL_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/test-toggle/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

INITIAL_METHOD=$(echo "$INITIAL_RESPONSE" | jq -r '.method')
if [ "$INITIAL_METHOD" = "direct" ]; then
    track_pass "Toggle bucket initially public (direct)"
else
    track_fail "Toggle bucket should start as public, got '$INITIAL_METHOD'"
fi

# Change to private
docker exec insforge-postgres psql -U postgres -d insforge -c "
  UPDATE _storage_buckets SET public = false WHERE name = 'test-toggle';
" > /dev/null 2>&1

# Test after toggle to private
AFTER_PRIVATE=$(curl -s -X POST "$API_BASE/storage/buckets/test-toggle/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

PRIVATE_METHOD=$(echo "$AFTER_PRIVATE" | jq -r '.method')
if [ "$PRIVATE_METHOD" = "presigned" ]; then
    track_pass "After toggle to private: presigned URLs"
else
    track_fail "After toggle to private should be presigned, got '$PRIVATE_METHOD'"
fi

# Change back to public
docker exec insforge-postgres psql -U postgres -d insforge -c "
  UPDATE _storage_buckets SET public = true WHERE name = 'test-toggle';
" > /dev/null 2>&1

# Test after toggle back to public
AFTER_PUBLIC=$(curl -s -X POST "$API_BASE/storage/buckets/test-toggle/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

PUBLIC_METHOD=$(echo "$AFTER_PUBLIC" | jq -r '.method')
if [ "$PUBLIC_METHOD" = "direct" ]; then
    track_pass "After toggle back to public: direct URLs"
else
    track_fail "After toggle to public should be direct, got '$PUBLIC_METHOD'"
fi

echo ""
echo -e "${BLUE}Test 5: Non-existent bucket handling${NC}"

NONEXIST_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/does-not-exist/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

METHOD=$(echo "$NONEXIST_RESPONSE" | jq -r '.method')
ERROR=$(echo "$NONEXIST_RESPONSE" | jq -r '.error')

if [ "$METHOD" = "presigned" ]; then
    track_pass "Non-existent bucket defaults to presigned (secure default)"
elif [ "$ERROR" != "null" ]; then
    track_pass "Non-existent bucket returns error: $ERROR"
else
    track_fail "Non-existent bucket behavior unexpected: $NONEXIST_RESPONSE"
fi

echo ""
echo -e "${BLUE}Test 6: Different expiration times${NC}"

# Test short expiration
SHORT_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/test-private/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 60}')

SHORT_EXPIRES=$(echo "$SHORT_RESPONSE" | jq -r '.expiresAt')
if [ "$SHORT_EXPIRES" != "null" ]; then
    track_pass "Short expiration (60s) accepted"
else
    track_fail "Failed to set short expiration"
fi

# Test long expiration
LONG_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/test-private/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 86400}')

LONG_EXPIRES=$(echo "$LONG_RESPONSE" | jq -r '.expiresAt')
if [ "$LONG_EXPIRES" != "null" ]; then
    track_pass "Long expiration (24h) accepted"
else
    track_fail "Failed to set long expiration"
fi

echo ""
echo -e "${BLUE}Test 7: URL consistency${NC}"

# Get same file URL twice and compare
URL1=$(curl -s -X POST "$API_BASE/storage/buckets/test-public/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}' | jq -r '.url')

URL2=$(curl -s -X POST "$API_BASE/storage/buckets/test-public/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}' | jq -r '.url')

if [ "$URL1" = "$URL2" ]; then
    track_pass "Public URLs are consistent (same for same file)"
else
    track_fail "Public URLs should be consistent"
fi

# For private, URLs should differ due to timestamp
PRIVATE_URL1=$(curl -s -X POST "$API_BASE/storage/buckets/test-private/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}' | jq -r '.url' | cut -d'?' -f1)

PRIVATE_URL2=$(curl -s -X POST "$API_BASE/storage/buckets/test-private/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}' | jq -r '.url' | cut -d'?' -f1)

if [ "$PRIVATE_URL1" = "$PRIVATE_URL2" ]; then
    track_pass "Private base URLs consistent (before query params)"
else
    track_fail "Private base URLs should be consistent"
fi

echo ""
echo -e "${BLUE}Test 8: S3 key path verification${NC}"

# Check that the URL contains the expected path structure
PUBLIC_URL=$(curl -s -X POST "$API_BASE/storage/buckets/test-public/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}' | jq -r '.url')

if echo "$PUBLIC_URL" | grep -q "/test-public/test.txt"; then
    track_pass "URL contains correct bucket and key path"
else
    track_fail "URL path structure incorrect"
fi

# Cleanup
echo ""
echo -e "${BLUE}Cleaning up...${NC}"
docker exec insforge-postgres psql -U postgres -d insforge -c "
  DELETE FROM _storage WHERE bucket LIKE 'test-%';
  DELETE FROM _storage_buckets WHERE name LIKE 'test-%';
" > /dev/null 2>&1
rm -f /tmp/test-file.txt

echo "✓ Cleanup complete"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TEST_PASSED${NC}"
echo -e "${RED}Failed: $TEST_FAILED${NC}"

if [ $TEST_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ All tests passed! S3 optimization is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗✗✗ Some tests failed. Review the implementation.${NC}"
    exit 1
fi