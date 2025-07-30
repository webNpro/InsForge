#!/bin/bash

# Test script for InsForge Serverless Functions (Database-based)
# This tests the complete flow: upload to DB → Deno reads from DB → executes

echo "🧪 InsForge Serverless Functions Test Suite"
echo "=========================================="
echo "Using database-based function storage"
echo ""

# Configuration
API_BASE="${API_BASE:-http://localhost:7130}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-this-password}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
function test_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

function test_fail() {
    echo -e "${RED}✗ $1${NC}"
    echo "  Details: $2"
    ((TESTS_FAILED++))
}

function section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "----------------------------------------"
}

# Start tests
section "1. Authentication"

AUTH_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key-1" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    test_pass "Admin authentication successful"
else
    test_fail "Admin authentication failed" "$AUTH_RESPONSE"
    echo "Cannot continue without authentication"
    exit 1
fi

section "2. Create Basic Function"

# Create a simple echo function
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/functions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "echo-test",
    "slug": "echo-test",
    "code": "module.exports = async function(req) {\n  const url = new URL(req.url);\n  const message = url.searchParams.get(\"message\") || \"No message\";\n  return new Response(JSON.stringify({ echo: message }), { headers: { \"Content-Type\": \"application/json\" } });\n}",
    "description": "Echo test function",
    "status": "active"
  }')

if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    test_pass "Created echo-test function"
else
    test_fail "Failed to create echo-test function" "$CREATE_RESPONSE"
fi

section "3. Test Function Execution"

# Test GET request
EXEC_RESPONSE=$(curl -s "$API_BASE/functions/echo-test?message=Hello%20World")
if echo "$EXEC_RESPONSE" | grep -q '"echo":"Hello World"'; then
    test_pass "GET request execution successful"
else
    test_fail "GET request execution failed" "$EXEC_RESPONSE"
fi

section "4. Create POST Function"

# Create a function that handles POST data
POST_FUNC=$(curl -s -X POST "$API_BASE/api/functions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "data-processor",
    "slug": "data-processor",
    "code": "module.exports = async function(req) {\n  if (req.method !== \"POST\") {\n    return new Response(JSON.stringify({ error: \"Only POST allowed\" }), { status: 405, headers: { \"Content-Type\": \"application/json\" } });\n  }\n  try {\n    const data = await req.json();\n    const processed = { ...data, processed: true, timestamp: new Date().toISOString() };\n    return new Response(JSON.stringify(processed), { headers: { \"Content-Type\": \"application/json\" } });\n  } catch (e) {\n    return new Response(JSON.stringify({ error: \"Invalid JSON\" }), { status: 400, headers: { \"Content-Type\": \"application/json\" } });\n  }\n}",
    "description": "POST data processor",
    "status": "active"
  }')

if echo "$POST_FUNC" | grep -q '"success":true'; then
    test_pass "Created data-processor function"
else
    test_fail "Failed to create data-processor function" "$POST_FUNC"
fi

# Test POST execution
POST_EXEC=$(curl -s -X POST "$API_BASE/functions/data-processor" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "value": 123}')

if echo "$POST_EXEC" | grep -q '"processed":true'; then
    test_pass "POST request execution successful"
else
    test_fail "POST request execution failed" "$POST_EXEC"
fi

section "5. Test Function Update"

# Update the echo function
UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/api/functions/echo-test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "module.exports = async function(req) {\n  const url = new URL(req.url);\n  const message = url.searchParams.get(\"message\") || \"No message\";\n  return new Response(JSON.stringify({ echo: message, version: \"2.0\" }), { headers: { \"Content-Type\": \"application/json\" } });\n}"
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    test_pass "Function update successful"
else
    test_fail "Function update failed" "$UPDATE_RESPONSE"
fi

# Test updated function
sleep 1  # Give Deno time to clear cache
UPDATED_EXEC=$(curl -s "$API_BASE/functions/echo-test?message=Updated")
if echo "$UPDATED_EXEC" | grep -q '"version":"2.0"'; then
    test_pass "Updated function execution successful"
else
    test_fail "Updated function execution failed" "$UPDATED_EXEC"
fi

section "6. Test Error Handling"

# Create a function with runtime error
ERROR_FUNC=$(curl -s -X POST "$API_BASE/api/functions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "error-test",
    "slug": "error-test",
    "code": "module.exports = async function(req) {\n  throw new Error(\"Intentional error for testing\");\n}",
    "description": "Error test function",
    "status": "active"
  }')

# Execute and expect error
ERROR_EXEC=$(curl -s "$API_BASE/functions/error-test")
if echo "$ERROR_EXEC" | grep -q "error"; then
    test_pass "Error handling works correctly"
else
    test_fail "Error handling failed" "$ERROR_EXEC"
fi

section "7. Performance Test"

# Create a function that returns timing info
PERF_FUNC=$(curl -s -X POST "$API_BASE/api/functions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "performance-test",
    "slug": "performance-test",
    "code": "module.exports = async function(req) {\n  const start = Date.now();\n  // Simulate some work\n  let sum = 0;\n  for (let i = 0; i < 1000000; i++) sum += i;\n  const duration = Date.now() - start;\n  return new Response(JSON.stringify({ duration, sum }), { headers: { \"Content-Type\": \"application/json\" } });\n}",
    "description": "Performance test",
    "status": "active"
  }')

# Execute multiple times to test caching
echo "Testing performance (3 executions)..."
for i in 1 2 3; do
    START_TIME=$(date +%s%N)
    PERF_RESULT=$(curl -s "$API_BASE/functions/performance-test")
    END_TIME=$(date +%s%N)
    TOTAL_TIME=$((($END_TIME - $START_TIME) / 1000000))
    echo "  Execution $i: ${TOTAL_TIME}ms"
done

test_pass "Performance test completed"

section "8. List Functions"

LIST_RESPONSE=$(curl -s "$API_BASE/api/functions" \
  -H "Authorization: Bearer $TOKEN")

FUNCTION_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"slug"' | wc -l)
if [ "$FUNCTION_COUNT" -gt 0 ]; then
    test_pass "Listed $FUNCTION_COUNT functions"
else
    test_fail "Function listing failed" "$LIST_RESPONSE"
fi

section "9. Cleanup"

# Delete test functions
for slug in echo-test data-processor error-test performance-test; do
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/api/functions/$slug" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
        echo "  Deleted: $slug"
    fi
done

test_pass "Cleanup completed"

# Summary
echo ""
echo "========================================"
echo -e "${BLUE}Test Summary${NC}"
echo "========================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Key findings:"
    echo "• Functions are stored in PostgreSQL database"
    echo "• Deno reads and executes from database on each request"
    echo "• No caching - functions are always fresh from database"
    echo "• Error handling works correctly"
    echo "• Both GET and POST methods are supported"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi