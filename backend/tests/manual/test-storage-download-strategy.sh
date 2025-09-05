#!/bin/bash

# Test Storage Download Strategy - Direct URLs for public, Presigned for private
# This script tests the optimized download strategy implementation

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source the test configuration
source "$SCRIPT_DIR/../test-config.sh"

# Check requirements
check_requirements

print_blue "🧪 Testing Storage Download Strategy Optimization..."

# API Configuration
API_BASE="$TEST_API_BASE"
AUTH_TOKEN=""

# Read .env file to get admin credentials
if [ -f "$SCRIPT_DIR/../../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../../.env" | xargs)
    print_info "Loaded environment variables from .env"
fi

# Use admin credentials from environment
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

print_info "Using admin credentials: $ADMIN_EMAIL"

# Test tracking
TEST_FAILED=0

# Function to track test failures
track_test_failure() {
    TEST_FAILED=$((TEST_FAILED + 1))
}

# Function to cleanup and exit
cleanup_and_exit() {
    local exit_code=$1
    
    print_info "🧹 Cleaning up test buckets and files..."
    
    if [ -n "$AUTH_TOKEN" ]; then
        # Delete test buckets
        for bucket in public-test-bucket private-test-bucket; do
            curl -s -X DELETE "$API_BASE/storage/buckets/$bucket" \
                -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null 2>&1
        done
    fi
    
    # Clean up test file
    rm -f "$SCRIPT_DIR/test-download-file.txt" 2>/dev/null
    
    exit $exit_code
}

# Function to exit with proper status
exit_with_status() {
    if [ $TEST_FAILED -eq 0 ]; then
        print_success "All tests passed!"
        cleanup_and_exit 0
    else
        print_fail "Failed $TEST_FAILED test(s)"
        cleanup_and_exit 1
    fi
}

# ========================================
# 1. Login as admin
# ========================================
print_blue "1. Logging in as admin..."

auth_response=$(curl -s -X POST "$API_BASE/auth/admin/sessions" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

if echo "$auth_response" | grep -q '"accessToken"'; then
    AUTH_TOKEN=$(echo "$auth_response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    print_success "Admin login successful"
else
    print_fail "Failed to login as admin"
    echo "Response: $auth_response"
    exit 1
fi

# ========================================
# 2. Create PUBLIC bucket
# ========================================
print_blue "2. Creating PUBLIC test bucket..."

public_bucket_response=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "bucketName": "public-test-bucket",
        "isPublic": true
    }')

if echo "$public_bucket_response" | grep -q '"bucketName"'; then
    print_success "Public bucket created successfully"
else
    print_fail "Failed to create public bucket"
    echo "Response: $public_bucket_response"
    track_test_failure
fi

# ========================================
# 3. Create PRIVATE bucket
# ========================================
print_blue "3. Creating PRIVATE test bucket..."

private_bucket_response=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "bucketName": "private-test-bucket",
        "isPublic": false
    }')

if echo "$private_bucket_response" | grep -q '"bucketName"'; then
    print_success "Private bucket created successfully"
else
    print_fail "Failed to create private bucket"
    echo "Response: $private_bucket_response"
    track_test_failure
fi

# ========================================
# 4. Upload test file to PUBLIC bucket
# ========================================
print_blue "4. Uploading test file to PUBLIC bucket..."

# Create a test file
echo "This is a test file for download strategy testing" > "$SCRIPT_DIR/test-download-file.txt"

public_upload_response=$(curl -s -X PUT "$API_BASE/storage/buckets/public-test-bucket/objects/test-public.txt" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -F "file=@$SCRIPT_DIR/test-download-file.txt")

if echo "$public_upload_response" | grep -q '"key"'; then
    print_success "File uploaded to public bucket"
    PUBLIC_FILE_KEY=$(echo "$public_upload_response" | grep -o '"key":"[^"]*' | cut -d'"' -f4)
    print_info "Public file key: $PUBLIC_FILE_KEY"
else
    print_fail "Failed to upload to public bucket"
    echo "Response: $public_upload_response"
    track_test_failure
fi

# ========================================
# 5. Upload test file to PRIVATE bucket
# ========================================
print_blue "5. Uploading test file to PRIVATE bucket..."

private_upload_response=$(curl -s -X PUT "$API_BASE/storage/buckets/private-test-bucket/objects/test-private.txt" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -F "file=@$SCRIPT_DIR/test-download-file.txt")

if echo "$private_upload_response" | grep -q '"key"'; then
    print_success "File uploaded to private bucket"
    PRIVATE_FILE_KEY=$(echo "$private_upload_response" | grep -o '"key":"[^"]*' | cut -d'"' -f4)
    print_info "Private file key: $PRIVATE_FILE_KEY"
else
    print_fail "Failed to upload to private bucket"
    echo "Response: $private_upload_response"
    track_test_failure
fi

# ========================================
# 6. Get download strategy for PUBLIC bucket file
# ========================================
print_blue "6. Testing download strategy for PUBLIC bucket file..."

public_strategy_response=$(curl -s -X POST "$API_BASE/storage/buckets/public-test-bucket/objects/test-public.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "expiresIn": 3600
    }')

print_info "Public bucket download strategy response:"
echo "$public_strategy_response" | jq . 2>/dev/null || echo "$public_strategy_response"

if echo "$public_strategy_response" | grep -q '"method"'; then
    METHOD=$(echo "$public_strategy_response" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$public_strategy_response" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    print_info "Method: $METHOD"
    print_info "URL: $URL"
    
    # Check if using S3
    if echo "$URL" | grep -q "s3"; then
        print_info "Storage provider: S3"
        
        # For S3, public buckets should return 'direct' method
        if [ "$METHOD" = "direct" ]; then
            print_success "✅ PUBLIC bucket correctly returns DIRECT URL (no presigning)"
            
            # Verify the URL format is a direct S3 URL
            if echo "$URL" | grep -q "https://.*\.s3\..*\.amazonaws\.com/"; then
                print_success "✅ URL is a direct S3 URL format"
            else
                print_fail "❌ URL doesn't look like a direct S3 URL"
                track_test_failure
            fi
            
            # Check that there's no expiresAt field for direct URLs
            if echo "$public_strategy_response" | grep -q '"expiresAt"'; then
                print_fail "❌ Direct URL should not have expiresAt field"
                track_test_failure
            else
                print_success "✅ No expiresAt field for direct URL"
            fi
        else
            print_fail "❌ PUBLIC bucket should return 'direct' method for S3, got: $METHOD"
            track_test_failure
        fi
    else
        print_info "Storage provider: Local"
        # For local storage, direct method is expected
        if [ "$METHOD" = "direct" ]; then
            print_success "✅ Local storage returns direct method as expected"
        else
            print_fail "❌ Local storage should return 'direct' method, got: $METHOD"
            track_test_failure
        fi
    fi
else
    print_fail "Failed to get download strategy for public bucket"
    track_test_failure
fi

# ========================================
# 7. Get download strategy for PRIVATE bucket file
# ========================================
print_blue "7. Testing download strategy for PRIVATE bucket file..."

private_strategy_response=$(curl -s -X POST "$API_BASE/storage/buckets/private-test-bucket/objects/test-private.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "expiresIn": 3600
    }')

print_info "Private bucket download strategy response:"
echo "$private_strategy_response" | jq . 2>/dev/null || echo "$private_strategy_response"

if echo "$private_strategy_response" | grep -q '"method"'; then
    METHOD=$(echo "$private_strategy_response" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$private_strategy_response" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    print_info "Method: $METHOD"
    print_info "URL: $URL"
    
    # Check if using S3
    if echo "$URL" | grep -q "s3"; then
        print_info "Storage provider: S3"
        
        # For S3, private buckets should return 'presigned' method
        if [ "$METHOD" = "presigned" ]; then
            print_success "✅ PRIVATE bucket correctly returns PRESIGNED URL"
            
            # Verify the URL has S3 presigned parameters
            if echo "$URL" | grep -q "X-Amz-Signature"; then
                print_success "✅ URL contains S3 signature parameters"
            else
                print_fail "❌ URL missing S3 signature parameters"
                track_test_failure
            fi
            
            # Check for expiresAt field
            if echo "$private_strategy_response" | grep -q '"expiresAt"'; then
                print_success "✅ Presigned URL has expiresAt field"
                EXPIRES_AT=$(echo "$private_strategy_response" | grep -o '"expiresAt":"[^"]*' | cut -d'"' -f4)
                print_info "Expires at: $EXPIRES_AT"
            else
                print_fail "❌ Presigned URL should have expiresAt field"
                track_test_failure
            fi
        else
            print_fail "❌ PRIVATE bucket should return 'presigned' method for S3, got: $METHOD"
            track_test_failure
        fi
    else
        print_info "Storage provider: Local"
        # For local storage, direct method is expected even for private buckets
        if [ "$METHOD" = "direct" ]; then
            print_success "✅ Local storage returns direct method as expected"
        else
            print_fail "❌ Local storage should return 'direct' method, got: $METHOD"
            track_test_failure
        fi
    fi
else
    print_fail "Failed to get download strategy for private bucket"
    track_test_failure
fi

# ========================================
# 8. Test downloading from PUBLIC bucket without auth
# ========================================
print_blue "8. Testing PUBLIC bucket download without authentication..."

# Try to download from public bucket without auth
public_download_response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_BASE/storage/buckets/public-test-bucket/objects/test-public.txt")

if [ "$public_download_response" = "200" ]; then
    print_success "✅ PUBLIC bucket allows download without authentication"
else
    print_fail "❌ PUBLIC bucket should allow download without auth, got HTTP $public_download_response"
    track_test_failure
fi

# ========================================
# 9. Test downloading from PRIVATE bucket without auth
# ========================================
print_blue "9. Testing PRIVATE bucket download without authentication..."

# Try to download from private bucket without auth
private_download_response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_BASE/storage/buckets/private-test-bucket/objects/test-private.txt")

if [ "$private_download_response" = "401" ] || [ "$private_download_response" = "403" ]; then
    print_success "✅ PRIVATE bucket correctly blocks download without authentication"
else
    print_fail "❌ PRIVATE bucket should block download without auth, got HTTP $private_download_response"
    track_test_failure
fi

# ========================================
# Summary
# ========================================
echo ""
print_blue "=========================================="
print_blue "Storage Download Strategy Test Complete"
print_blue "=========================================="
echo ""
print_info "Summary:"
print_info "- Public buckets should use direct URLs (no presigning overhead)"
print_info "- Private buckets should use presigned URLs with expiration"
print_info "- This optimization reduces AWS API calls and improves performance"

# Exit with proper status
exit_with_status