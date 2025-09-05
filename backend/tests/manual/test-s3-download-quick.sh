#!/bin/bash

# Quick test for S3 download strategy optimization

API_BASE="http://localhost:7130/api"

echo "Testing S3 Download Strategy Optimization..."
echo "==========================================="

# Step 1: Register a test user
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/users" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "s3test@example.com",
        "password": "testpass123"
    }')

if echo "$REGISTER_RESPONSE" | grep -q '"accessToken"'; then
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "✓ User registered and logged in"
else
    # Try login if already exists
    echo "User might exist, trying login..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/sessions" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "s3test@example.com",
            "password": "testpass123"
        }')
    
    if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        echo "✓ Logged in successfully"
    else
        echo "✗ Failed to authenticate"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
fi

# Step 2: Create PUBLIC bucket
echo ""
echo "2. Creating PUBLIC test bucket..."
PUBLIC_BUCKET_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "bucketName": "s3-public-test",
        "isPublic": true
    }')

if echo "$PUBLIC_BUCKET_RESPONSE" | grep -q '"bucketName"' || echo "$PUBLIC_BUCKET_RESPONSE" | grep -q "already exists"; then
    echo "✓ Public bucket ready"
else
    echo "Note: $PUBLIC_BUCKET_RESPONSE"
fi

# Step 3: Create PRIVATE bucket
echo ""
echo "3. Creating PRIVATE test bucket..."
PRIVATE_BUCKET_RESPONSE=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "bucketName": "s3-private-test",
        "isPublic": false
    }')

if echo "$PRIVATE_BUCKET_RESPONSE" | grep -q '"bucketName"' || echo "$PRIVATE_BUCKET_RESPONSE" | grep -q "already exists"; then
    echo "✓ Private bucket ready"
else
    echo "Note: $PRIVATE_BUCKET_RESPONSE"
fi

# Step 4: Upload test file to both buckets
echo ""
echo "4. Uploading test files..."
echo "Test content for S3 strategy test" > /tmp/s3-test-file.txt

# Upload to public bucket
curl -s -X PUT "$API_BASE/storage/buckets/s3-public-test/objects/test-public.txt" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/s3-test-file.txt" > /dev/null

echo "✓ Uploaded to public bucket"

# Upload to private bucket
curl -s -X PUT "$API_BASE/storage/buckets/s3-private-test/objects/test-private.txt" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/s3-test-file.txt" > /dev/null

echo "✓ Uploaded to private bucket"

# Step 5: Get download strategy for PUBLIC bucket
echo ""
echo "5. Testing PUBLIC bucket download strategy..."
PUBLIC_STRATEGY=$(curl -s -X POST "$API_BASE/storage/buckets/s3-public-test/objects/test-public.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

echo "Response: $PUBLIC_STRATEGY"

if echo "$PUBLIC_STRATEGY" | grep -q '"method"'; then
    METHOD=$(echo "$PUBLIC_STRATEGY" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PUBLIC_STRATEGY" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "Method: $METHOD"
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        echo "Storage: S3 detected"
        
        if [ "$METHOD" = "direct" ]; then
            echo "✓✓✓ SUCCESS: Public bucket returns DIRECT URL (optimized!)"
            if ! echo "$URL" | grep -q "X-Amz-Signature"; then
                echo "✓ Confirmed: No signature in URL (direct S3 access)"
            else
                echo "✗ WARNING: URL has signature (should be direct)"
            fi
        else
            echo "✗✗✗ FAIL: Public bucket should return 'direct' method, got '$METHOD'"
        fi
    else
        echo "Storage: Local filesystem"
        echo "✓ Local storage always uses direct method"
    fi
fi

# Step 6: Get download strategy for PRIVATE bucket
echo ""
echo "6. Testing PRIVATE bucket download strategy..."
PRIVATE_STRATEGY=$(curl -s -X POST "$API_BASE/storage/buckets/s3-private-test/objects/test-private.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"expiresIn": 3600}')

echo "Response: $PRIVATE_STRATEGY"

if echo "$PRIVATE_STRATEGY" | grep -q '"method"'; then
    METHOD=$(echo "$PRIVATE_STRATEGY" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PRIVATE_STRATEGY" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "Method: $METHOD"
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        echo "Storage: S3 detected"
        
        if [ "$METHOD" = "presigned" ]; then
            echo "✓✓✓ SUCCESS: Private bucket returns PRESIGNED URL"
            if echo "$URL" | grep -q "X-Amz-Signature"; then
                echo "✓ Confirmed: URL has signature for secure access"
            else
                echo "✗ WARNING: URL missing signature"
            fi
        else
            echo "✗✗✗ FAIL: Private bucket should return 'presigned' method, got '$METHOD'"
        fi
    else
        echo "Storage: Local filesystem"
        echo "✓ Local storage always uses direct method"
    fi
fi

# Cleanup
rm -f /tmp/s3-test-file.txt

echo ""
echo "==========================================="
echo "Test complete!"
echo ""
echo "Expected behavior with S3:"
echo "  - Public buckets: direct S3 URLs (no presigning)"
echo "  - Private buckets: presigned URLs with expiration"