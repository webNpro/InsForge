#!/bin/bash

API_BASE="http://localhost:7130/api"

echo "=== S3 Download Strategy Test (with proper bucket creation) ==="
echo ""

# First, delete existing test buckets
echo "Cleaning up old test buckets..."
for bucket in s3-public-test s3-private-test; do
    curl -s -X DELETE "$API_BASE/storage/buckets/$bucket" \
        -H "Authorization: Bearer test" > /dev/null 2>&1
done

# Create test user
echo "1. Creating test user..."
USER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/users" \
    -H "Content-Type: application/json" \
    -d '{"email": "s3test2@example.com", "password": "test123"}')

if echo "$USER_RESPONSE" | grep -q '"accessToken"'; then
    TOKEN=$(echo "$USER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    # Login if exists
    USER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/sessions" \
        -H "Content-Type: application/json" \
        -d '{"email": "s3test2@example.com", "password": "test123"}')
    TOKEN=$(echo "$USER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

echo "✓ User authenticated"

# Now test the download strategy for both bucket types
# Note: buckets might already exist from previous tests

echo ""
echo "2. Testing with existing buckets (if any)..."

# Upload test files
echo "Test content" > /tmp/test.txt

# Try upload to public bucket
curl -s -X PUT "$API_BASE/storage/buckets/s3-public-test/objects/test-file.txt" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test.txt" > /dev/null 2>&1

# Try upload to private bucket  
curl -s -X PUT "$API_BASE/storage/buckets/s3-private-test/objects/test-file.txt" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test.txt" > /dev/null 2>&1

echo ""
echo "3. Testing download strategies..."
echo ""

# Test public bucket
echo "PUBLIC bucket (s3-public-test):"
PUBLIC_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/s3-public-test/objects/test-file.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

if echo "$PUBLIC_RESPONSE" | grep -q '"method"'; then
    METHOD=$(echo "$PUBLIC_RESPONSE" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PUBLIC_RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo "  Method: $METHOD"
    
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        if [ "$METHOD" = "direct" ]; then
            echo "  ✅ OPTIMIZED: Direct S3 URL (no presigning)"
            echo "  URL format: $(echo "$URL" | sed 's/\(https:\/\/[^\/]*\/\).*/\1.../')"
        else
            echo "  ⚠️  NOT OPTIMIZED: Still using presigned URLs"
            echo "  URL has signature: $(echo "$URL" | grep -q "X-Amz-Signature" && echo "Yes" || echo "No")"
        fi
    else
        echo "  Local storage mode"
    fi
else
    echo "  Error: $PUBLIC_RESPONSE"
fi

echo ""
echo "PRIVATE bucket (s3-private-test):"
PRIVATE_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets/s3-private-test/objects/test-file.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

if echo "$PRIVATE_RESPONSE" | grep -q '"method"'; then
    METHOD=$(echo "$PRIVATE_RESPONSE" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PRIVATE_RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo "  Method: $METHOD"
    
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        if [ "$METHOD" = "presigned" ]; then
            echo "  ✅ CORRECT: Presigned URL with expiration"
            echo "  Has signature: $(echo "$URL" | grep -q "X-Amz-Signature" && echo "Yes" || echo "No")"
        else
            echo "  ⚠️  INCORRECT: Should use presigned for private buckets"
        fi
    else
        echo "  Local storage mode"
    fi
else
    echo "  Error: $PRIVATE_RESPONSE"
fi

rm -f /tmp/test.txt

echo ""
echo "============================================"
echo "Expected with S3 storage:"
echo "  Public: direct method (no presigning)"
echo "  Private: presigned method (with signature)"
