#!/bin/bash

# Test Traditional REST Response Format
# This script tests various API endpoints to ensure they follow traditional REST conventions

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source the test configuration
source "$SCRIPT_DIR/test-config.sh"

BASE_URL="$TEST_API_BASE"

echo "🧪 Testing Traditional REST Response Format"
echo "=========================================="

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test response
test_response() {
    local test_name="$1"
    local response="$2"
    local expected_pattern="$3"
    local should_fail="${4:-false}"
    
    echo -n "Testing $test_name... "
    
    if [[ "$should_fail" == "true" ]]; then
        # For error tests, we expect the test to "fail" (return error response)
        if echo "$response" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  Expected pattern: $expected_pattern"
            echo "  Got: $response"
            ((TESTS_FAILED++))
        fi
    else
        if echo "$response" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC}"
            echo "  Expected pattern: $expected_pattern"
            echo "  Got: $response"
            ((TESTS_FAILED++))
        fi
    fi
}

echo -e "\n${YELLOW}1. Testing Health Endpoint (Success Response)${NC}"
echo "------------------------------------------------"
response=$(curl -s "$BASE_URL/health")
test_response "Direct data response" "$response" '"status":"ok"'
# These should NOT be present in traditional REST
if ! echo "$response" | grep -q '"success":true'; then
    echo -e "No success wrapper... ${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "No success wrapper... ${RED}✗ FAILED${NC} (found success wrapper)"
    ((TESTS_FAILED++))
fi
if ! echo "$response" | grep -q '"data":{'; then
    echo -e "No data wrapper... ${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "No data wrapper... ${RED}✗ FAILED${NC} (found data wrapper)"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}2. Testing Authentication Errors${NC}"
echo "----------------------------------"
response=$(curl -s "$BASE_URL/auth/me")
test_response "Error format" "$response" '"error":"AUTH_INVALID_CREDENTIALS"'
test_response "Message field" "$response" '"message":"No token provided"'
test_response "Status code field" "$response" '"statusCode":401'
test_response "NextAction field" "$response" '"nextAction":"Check the token'

echo -e "\n${YELLOW}3. Testing Login Endpoint (Missing Credentials)${NC}"
echo "-------------------------------------------------"
response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{}')
test_response "Error response" "$response" '"error":"MISSING_FIELD"'
test_response "400 status" "$response" '"statusCode":400'

echo -e "\n${YELLOW}4. Testing Invalid Endpoint (404)${NC}"
echo "-----------------------------------"
response=$(curl -s "$BASE_URL/nonexistent")
test_response "404 error" "$response" '"statusCode":404'

echo -e "\n${YELLOW}5. Testing Database Tables List (Requires Auth)${NC}"
echo "-------------------------------------------------"
# First get a token
echo "Creating test user for authenticated tests..."
auth_response=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test-'$(date +%s)'@example.com",
        "password": "TestPass123!",
        "name": "Test User"
    }')

token=$(echo "$auth_response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$token" ]; then
    echo "Got auth token successfully"
    
    # Test authenticated endpoint
    response=$(curl -s "$BASE_URL/database/tables" \
        -H "Authorization: Bearer $token")
    test_response "Direct array response" "$response" '^\['
    
    # Test pagination endpoint
    echo -e "\n${YELLOW}6. Testing Pagination Headers${NC}"
    echo "-------------------------------"
    response=$(curl -s -i "$BASE_URL/logs" \
        -H "Authorization: Bearer $token" | head -20)
    test_response "X-Total-Count header" "$response" 'X-Total-Count:'
    test_response "X-Page header" "$response" 'X-Page:'
    test_response "X-Limit header" "$response" 'X-Limit:'
else
    echo -e "${RED}Failed to get auth token${NC}"
fi

echo -e "\n${YELLOW}7. Testing Create Table (Success Response)${NC}"
echo "--------------------------------------------"
if [ -n "$token" ]; then
    response=$(curl -s -X POST "$BASE_URL/database/tables" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{
            "table_name": "test_table_'$(date +%s)'",
            "columns": [
                {"name": "title", "type": "string", "nullable": false}
            ]
        }')
    test_response "Direct object response" "$response" '"table_name":"test_table_'
    # Should NOT have success wrapper
    if ! echo "$response" | grep -q '"success":true'; then
        echo -e "No success wrapper... ${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "No success wrapper... ${RED}✗ FAILED${NC} (found success wrapper)"
        ((TESTS_FAILED++))
    fi
fi

echo -e "\n${YELLOW}8. Testing Storage Buckets (API Key Required)${NC}"
echo "-----------------------------------------------"
# Storage endpoints require API key, not JWT token
# Let's skip this test for now as it requires a different auth method
echo "Skipping storage tests (requires API key authentication)"

echo -e "\n${YELLOW}Summary${NC}"
echo "========="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed! The API follows traditional REST conventions.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi