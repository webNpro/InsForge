#!/bin/bash

# Test function secrets API endpoints
# Tests CRUD operations for function secrets and edge function integration

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/../test-config.sh"

# API base URL
API_BASE="${TEST_API_BASE:-http://localhost:7130/api}"
DENO_BASE="${DENO_BASE:-http://localhost:7133}"

print_blue "🔐 Testing Function Secrets API..."

# 1. Test authentication requirement
print_info "1. Testing authentication requirement for function secrets"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/function-secrets")
if [ "$response" = "401" ]; then
    print_success "Unauthorized without auth"
else
    print_fail "Expected 401, got $response"
    track_test_failure
fi

# Get admin token
print_info "2. Logging in as admin"
ADMIN_TOKEN=$(get_admin_token)
if [ -z "$ADMIN_TOKEN" ]; then
    print_fail "Failed to get admin token"
    exit 1
fi
print_success "Admin logged in"

# 3. List initial secrets (should include reserved ones)
print_info "3. Listing initial function secrets"
response=$(curl -s "$API_BASE/function-secrets" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | jq -e '.secrets | map(select(.isReserved == true)) | length == 1' >/dev/null 2>&1; then
    print_success "Reserved secret exists"
    reserved_key=$(echo "$response" | jq -r '.secrets | map(select(.isReserved == true))[0].key')
    if [ "$reserved_key" = "INSFORGE_API_URL" ]; then
        print_success "Found reserved secret: INSFORGE_API_URL"
    else
        print_fail "Expected INSFORGE_API_URL, found: $reserved_key"
        track_test_failure
    fi
else
    print_fail "Expected exactly 1 reserved secret"
    reserved_count=$(echo "$response" | jq '.secrets | map(select(.isReserved == true)) | length')
    echo "Found $reserved_count reserved secrets"
    echo "Response: $response"
    track_test_failure
fi

# 4. Create a test secret
print_info "4. Creating a test secret"
TEST_KEY="TEST_SECRET_$(date +%s)"
TEST_VALUE="test_value_12345"

response=$(curl -s "$API_BASE/function-secrets" \
    -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"$TEST_KEY\", \"value\": \"$TEST_VALUE\"}")

if echo "$response" | grep -q "success.*true"; then
    print_success "Secret created successfully"
else
    print_fail "Failed to create secret"
    echo "Response: $response"
    track_test_failure
fi

# 5. Update the secret
print_info "5. Updating the test secret"
UPDATE_VALUE="updated_value_67890"

response=$(curl -s "$API_BASE/function-secrets" \
    -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"$TEST_KEY\", \"value\": \"$UPDATE_VALUE\"}")

if echo "$response" | grep -q "success.*true"; then
    print_success "Secret updated successfully"
else
    print_fail "Failed to update secret"
    echo "Response: $response"
    track_test_failure
fi

# 6. List secrets and verify our test secret exists
print_info "6. Verifying secret exists in list"
response=$(curl -s "$API_BASE/function-secrets" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | jq -e ".secrets[] | select(.key == \"$TEST_KEY\")" >/dev/null 2>&1; then
    print_success "Test secret found in list"
else
    print_fail "Test secret not found in list"
    echo "Response: $response"
    track_test_failure
fi

# 7. Test edge function with secret
print_info "7. Creating edge function to test secret access"

# Create a simple function that returns the secret
cat > /tmp/test-secrets-function.js << EOF
module.exports = async function(request) {
  const testSecret = Deno.env.get('$TEST_KEY');
  const systemSecret = Deno.env.get('INSFORGE_API_URL');
  
  return new Response(JSON.stringify({
    testSecretFound: !!testSecret,
    testSecretValue: testSecret === '$UPDATE_VALUE',
    systemSecretFound: !!systemSecret,
    denoEnvWorks: typeof Deno.env.get === 'function'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
EOF

# Use MCP tool or API to create the function
FUNCTION_SLUG="test-secrets-fn-$(date +%s)"
response=$(curl -s -X POST "$API_BASE/functions" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"slug\": \"$FUNCTION_SLUG\",
        \"name\": \"Test Secrets Function\",
        \"code\": $(jq -Rs . < /tmp/test-secrets-function.js),
        \"status\": \"active\"
    }")

if echo "$response" | grep -q "id"; then
    print_success "Edge function created"
    
    # Wait for function to be ready
    sleep 2
    
    # Test the function
    print_info "8. Testing edge function secret access"
    response=$(curl -s "$DENO_BASE/$FUNCTION_SLUG")
    
    if echo "$response" | jq -e '.testSecretValue == true and .systemSecretFound == true' >/dev/null 2>&1; then
        print_success "Edge function can access secrets"
    else
        print_fail "Edge function cannot access secrets properly"
        echo "Response: $response"
        track_test_failure
    fi
    
    # Clean up function
    curl -s -X DELETE "$API_BASE/functions/$FUNCTION_SLUG" \
        -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null 2>&1
else
    print_fail "Failed to create edge function"
    echo "Response: $response"
    track_test_failure
fi

# 9. Try to modify reserved secret (should fail)
print_info "9. Testing reserved secret protection (INSFORGE_API_URL)"
response=$(curl -s "$API_BASE/function-secrets" \
    -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"key": "INSFORGE_API_URL", "value": "should_not_work"}')

if echo "$response" | grep -q -i "reserved\|forbidden\|cannot"; then
    print_success "Reserved secrets are protected"
else
    print_fail "Reserved secret protection failed"
    echo "Response: $response"
    track_test_failure
fi

# 10. Delete test secret
print_info "10. Deleting test secret"
response=$(curl -s -X DELETE "$API_BASE/function-secrets/$TEST_KEY" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | grep -q "success.*true\|deleted"; then
    print_success "Secret deleted successfully"
else
    print_fail "Failed to delete secret"
    echo "Response: $response"
    track_test_failure
fi

# 11. Verify secret is deleted
print_info "11. Verifying secret deletion"
response=$(curl -s "$API_BASE/function-secrets" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | jq -e ".secrets[] | select(.key == \"$TEST_KEY\")" >/dev/null 2>&1; then
    print_fail "Secret still exists after deletion"
    track_test_failure
else
    print_success "Secret successfully removed"
fi

# 12. Try to delete reserved secret (should fail)
print_info "12. Testing reserved secret deletion protection"
response=$(curl -s -X DELETE "$API_BASE/function-secrets/INSFORGE_API_URL" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | grep -q -i "reserved\|forbidden\|cannot"; then
    print_success "Cannot delete reserved secrets"
else
    print_fail "Reserved secret deletion protection failed"
    echo "Response: $response"
    track_test_failure
fi

# Clean up
rm -f /tmp/test-secrets-function.js

# Summary
echo ""
print_blue "=========================================="
print_blue "Function Secrets Test Complete"
print_blue "=========================================="

exit $TEST_FAILED