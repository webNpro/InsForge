#!/bin/bash

# Comprehensive S3 Storage Test
# Tests all storage operations with S3 backend

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source test configuration
source "$SCRIPT_DIR/../test-config.sh"

API_KEY="${INSFORGE_API_KEY:-your-api-key-here}"
BASE_URL="http://localhost:7130/api"

echo "=== Comprehensive S3 Storage Test ==="
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to check test result
check_result() {
    local test_name=$1
    local result=$2
    local expected=$3
    
    if [[ "$result" == *"$expected"* ]]; then
        echo "✅ $test_name: PASSED"
        ((TESTS_PASSED++))
    else
        echo "❌ $test_name: FAILED"
        echo "   Expected: $expected"
        echo "   Got: $result"
        ((TESTS_FAILED++))
    fi
}

# 1. Create multiple buckets
echo "=== 1. Creating Multiple Buckets ==="
BUCKET1_RESPONSE=$(curl -s -X POST "$BASE_URL/storage/buckets" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"bucket": "test-public-bucket", "public": true}')
check_result "Create public bucket" "$BUCKET1_RESPONSE" "Bucket created successfully"

BUCKET2_RESPONSE=$(curl -s -X POST "$BASE_URL/storage/buckets" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"bucket": "test-private-bucket", "public": false}')
check_result "Create private bucket" "$BUCKET2_RESPONSE" "Bucket created successfully"

# Try to create duplicate bucket (should fail)
DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/storage/buckets" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"bucket": "test-public-bucket", "public": true}')
check_result "Duplicate bucket fails" "$DUPLICATE_RESPONSE" "already exists"

echo ""

# 2. List buckets
echo "=== 2. Listing Buckets ==="
BUCKETS_LIST=$(curl -s "$BASE_URL/storage/buckets" \
  -H "x-api-key: $API_KEY")
check_result "List includes public bucket" "$BUCKETS_LIST" "test-public-bucket"
check_result "List includes private bucket" "$BUCKETS_LIST" "test-private-bucket"

echo ""

# 3. Upload files with different methods
echo "=== 3. Testing File Uploads ==="

# Create test files
echo "Public bucket test content" > /tmp/public-test.txt
echo "Private bucket test content" > /tmp/private-test.txt
echo "Large file content $(head -c 1000 /dev/urandom | base64)" > /tmp/large-test.txt

# Upload with specific key (PUT)
PUT_RESPONSE=$(curl -s -X PUT "$BASE_URL/storage/test-public-bucket/specific-file.txt" \
  -H "x-api-key: $API_KEY" \
  -F "file=@/tmp/public-test.txt")
check_result "PUT upload with specific key" "$PUT_RESPONSE" "specific-file.txt"

# Upload with auto-generated key (POST)
POST_RESPONSE=$(curl -s -X POST "$BASE_URL/storage/test-public-bucket" \
  -H "x-api-key: $API_KEY" \
  -F "file=@/tmp/public-test.txt")
check_result "POST upload with auto key" "$POST_RESPONSE" "test-public-bucket"
AUTO_KEY=$(echo "$POST_RESPONSE" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)

# Upload to private bucket
PRIVATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/storage/test-private-bucket/private-file.txt" \
  -H "x-api-key: $API_KEY" \
  -F "file=@/tmp/private-test.txt")
check_result "Upload to private bucket" "$PRIVATE_RESPONSE" "private-file.txt"

# Upload larger file
LARGE_RESPONSE=$(curl -s -X PUT "$BASE_URL/storage/test-public-bucket/large-file.txt" \
  -H "x-api-key: $API_KEY" \
  -F "file=@/tmp/large-test.txt")
check_result "Upload large file" "$LARGE_RESPONSE" "large-file.txt"

echo ""

# 4. List objects in buckets
echo "=== 4. Listing Objects ==="
PUBLIC_LIST=$(curl -s "$BASE_URL/storage/test-public-bucket" \
  -H "x-api-key: $API_KEY")
check_result "List public bucket objects" "$PUBLIC_LIST" "specific-file.txt"
check_result "List shows auto-gen file" "$PUBLIC_LIST" "$AUTO_KEY"

# Test pagination
PAGINATED_LIST=$(curl -s "$BASE_URL/storage/test-public-bucket?limit=1&offset=0" \
  -H "x-api-key: $API_KEY")
check_result "Pagination limit works" "$PAGINATED_LIST" '"limit":1'

# Test search
SEARCH_LIST=$(curl -s "$BASE_URL/storage/test-public-bucket?search=specific" \
  -H "x-api-key: $API_KEY")
check_result "Search finds file" "$SEARCH_LIST" "specific-file.txt"

echo ""

# 5. Download files
echo "=== 5. Testing Downloads ==="

# Download from public bucket without auth
PUBLIC_DOWNLOAD=$(curl -s -w "\n%{http_code}" "$BASE_URL/storage/test-public-bucket/specific-file.txt")
DOWNLOAD_STATUS=$(echo "$PUBLIC_DOWNLOAD" | tail -n 1)
DOWNLOAD_CONTENT=$(echo "$PUBLIC_DOWNLOAD" | head -n -1)
check_result "Public download without auth" "$DOWNLOAD_STATUS" "200"
check_result "Public download content" "$DOWNLOAD_CONTENT" "Public bucket test content"

# Try private bucket without auth (should fail)
PRIVATE_NO_AUTH=$(curl -s -w "\n%{http_code}" "$BASE_URL/storage/test-private-bucket/private-file.txt")
PRIVATE_STATUS=$(echo "$PRIVATE_NO_AUTH" | tail -n 1)
check_result "Private download without auth fails" "$PRIVATE_STATUS" "401"

# Download from private bucket with auth
PRIVATE_AUTH=$(curl -s -w "\n%{http_code}" "$BASE_URL/storage/test-private-bucket/private-file.txt" \
  -H "x-api-key: $API_KEY")
PRIVATE_AUTH_STATUS=$(echo "$PRIVATE_AUTH" | tail -n 1)
PRIVATE_CONTENT=$(echo "$PRIVATE_AUTH" | head -n -1)
check_result "Private download with auth" "$PRIVATE_AUTH_STATUS" "200"
check_result "Private download content" "$PRIVATE_CONTENT" "Private bucket test content"

echo ""

# 6. Update bucket visibility
echo "=== 6. Testing Bucket Visibility Changes ==="

# Make public bucket private
VISIBILITY_RESPONSE=$(curl -s -X PATCH "$BASE_URL/storage/buckets/test-public-bucket" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"public": false}')
check_result "Update bucket to private" "$VISIBILITY_RESPONSE" "Bucket is now PRIVATE"

# Try to download without auth (should now fail)
UPDATED_NO_AUTH=$(curl -s -w "\n%{http_code}" "$BASE_URL/storage/test-public-bucket/specific-file.txt")
UPDATED_STATUS=$(echo "$UPDATED_NO_AUTH" | tail -n 1)
check_result "Updated bucket blocks access" "$UPDATED_STATUS" "401"

# Change back to public
REVERT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/storage/buckets/test-public-bucket" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"public": true}')
check_result "Update bucket to public" "$REVERT_RESPONSE" "Bucket is now PUBLIC"

echo ""

# 7. Delete operations
echo "=== 7. Testing Delete Operations ==="

# Delete specific file
DELETE_FILE=$(curl -s -X DELETE "$BASE_URL/storage/test-public-bucket/specific-file.txt" \
  -H "x-api-key: $API_KEY")
check_result "Delete specific file" "$DELETE_FILE" "Object deleted successfully"

# Verify file is gone
VERIFY_DELETE=$(curl -s -w "\n%{http_code}" "$BASE_URL/storage/test-public-bucket/specific-file.txt")
DELETE_VERIFY_STATUS=$(echo "$VERIFY_DELETE" | tail -n 1)
check_result "Deleted file returns 404" "$DELETE_VERIFY_STATUS" "404"

# Delete non-existent file (should fail)
DELETE_MISSING=$(curl -s -X DELETE "$BASE_URL/storage/test-public-bucket/missing-file.txt" \
  -H "x-api-key: $API_KEY")
check_result "Delete missing file fails" "$DELETE_MISSING" "error"

echo ""

# 8. Check S3 logs
echo "=== 8. Checking S3 Integration ==="
S3_LOGS=$(docker logs insforge 2>&1 | tail -50 | grep "S3 Upload" | tail -5)
if [[ -n "$S3_LOGS" ]]; then
    echo "✅ S3 uploads confirmed in logs:"
    echo "$S3_LOGS" | while read -r line; do
        echo "   $line"
    done
    ((TESTS_PASSED++))
else
    echo "❌ No S3 upload logs found"
    ((TESTS_FAILED++))
fi

echo ""

# 9. Clean up
echo "=== 9. Cleanup ==="

# Delete buckets
DELETE_BUCKET1=$(curl -s -X DELETE "$BASE_URL/storage/test-public-bucket" \
  -H "x-api-key: $API_KEY")
check_result "Delete public bucket" "$DELETE_BUCKET1" "Bucket deleted successfully"

DELETE_BUCKET2=$(curl -s -X DELETE "$BASE_URL/storage/test-private-bucket" \
  -H "x-api-key: $API_KEY")
check_result "Delete private bucket" "$DELETE_BUCKET2" "Bucket deleted successfully"

# Clean up temp files
rm -f /tmp/public-test.txt /tmp/private-test.txt /tmp/large-test.txt

echo ""
echo "=== Test Summary ==="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "✅ All S3 storage operations working correctly!"
    exit 0
else
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi