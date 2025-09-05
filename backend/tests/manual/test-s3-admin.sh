#!/bin/bash

# Test S3 Download Strategy with proper admin setup

API_BASE="http://localhost:7130/api"

echo "=== S3 Download Strategy Test (Admin Setup) ==="
echo ""

# Step 1: Create admin user and get token
echo "1. Setting up admin access..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/admin/sessions" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@example.com",
        "password": "admin123"
    }')

if echo "$ADMIN_RESPONSE" | grep -q '"accessToken"'; then
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "✓ Admin authenticated"
else
    echo "✗ Admin login failed: $ADMIN_RESPONSE"
    echo "Trying to create admin user first..."
    
    # Try to create admin
    curl -s -X POST "$API_BASE/auth/admin/users" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@example.com",
            "password": "admin123"
        }' > /dev/null
    
    # Try login again
    ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/admin/sessions" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@example.com",
            "password": "admin123"
        }')
    
    if echo "$ADMIN_RESPONSE" | grep -q '"accessToken"'; then
        ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        echo "✓ Admin created and authenticated"
    else
        echo "✗ Cannot authenticate as admin. Please check your setup."
        exit 1
    fi
fi

# Step 2: Delete old test buckets
echo ""
echo "2. Cleaning up old test buckets..."
for bucket in s3-public-bucket s3-private-bucket; do
    curl -s -X DELETE "$API_BASE/storage/buckets/$bucket" \
        -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null 2>&1
done
echo "✓ Cleanup complete"

# Step 3: Create PUBLIC bucket
echo ""
echo "3. Creating PUBLIC bucket (s3-public-bucket)..."
PUBLIC_CREATE=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "bucketName": "s3-public-bucket",
        "isPublic": true
    }')

if echo "$PUBLIC_CREATE" | grep -q '"bucketName"'; then
    echo "✓ Public bucket created with isPublic=true"
else
    echo "Response: $PUBLIC_CREATE"
fi

# Step 4: Create PRIVATE bucket
echo ""
echo "4. Creating PRIVATE bucket (s3-private-bucket)..."
PRIVATE_CREATE=$(curl -s -X POST "$API_BASE/storage/buckets" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "bucketName": "s3-private-bucket",
        "isPublic": false
    }')

if echo "$PRIVATE_CREATE" | grep -q '"bucketName"'; then
    echo "✓ Private bucket created with isPublic=false"
else
    echo "Response: $PRIVATE_CREATE"
fi

# Step 5: Upload test files
echo ""
echo "5. Uploading test files..."
echo "Test file content for S3" > /tmp/test-s3.txt

# Upload to public bucket
PUBLIC_UPLOAD=$(curl -s -X PUT "$API_BASE/storage/buckets/s3-public-bucket/objects/test.txt" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@/tmp/test-s3.txt")
echo "✓ Uploaded to public bucket"

# Upload to private bucket
PRIVATE_UPLOAD=$(curl -s -X PUT "$API_BASE/storage/buckets/s3-private-bucket/objects/test.txt" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@/tmp/test-s3.txt")
echo "✓ Uploaded to private bucket"

# Step 6: Test download strategies
echo ""
echo "6. Testing download strategies..."
echo ""
echo "=========================================="
echo "PUBLIC BUCKET TEST (s3-public-bucket):"
echo "=========================================="

PUBLIC_STRATEGY=$(curl -s -X POST "$API_BASE/storage/buckets/s3-public-bucket/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"expiresIn": 3600}')

echo "Full Response:"
echo "$PUBLIC_STRATEGY" | jq . 2>/dev/null || echo "$PUBLIC_STRATEGY"

if echo "$PUBLIC_STRATEGY" | grep -q '"method"'; then
    METHOD=$(echo "$PUBLIC_STRATEGY" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PUBLIC_STRATEGY" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "Analysis:"
    echo "  Method: $METHOD"
    
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        echo "  Storage: S3"
        
        if [ "$METHOD" = "direct" ]; then
            echo "  ✅✅✅ SUCCESS: Public bucket returns DIRECT URL!"
            echo "  ✅ NO PRESIGNING OVERHEAD"
            
            if echo "$URL" | grep -q "X-Amz-Signature"; then
                echo "  ❌ ERROR: URL should NOT have signature for direct access"
            else
                echo "  ✅ CORRECT: No signature in URL"
            fi
        else
            echo "  ❌❌❌ FAILED: Public bucket should return 'direct' method"
            echo "  ❌ Currently returning: $METHOD"
            echo "  ❌ This means optimization is not working"
        fi
        
        echo "  URL Pattern: $(echo "$URL" | sed 's/\(https:\/\/[^\/]*\/[^?]*\).*/\1/')"
    else
        echo "  Storage: Local filesystem (optimization not applicable)"
    fi
fi

echo ""
echo "=========================================="
echo "PRIVATE BUCKET TEST (s3-private-bucket):"
echo "=========================================="

PRIVATE_STRATEGY=$(curl -s -X POST "$API_BASE/storage/buckets/s3-private-bucket/objects/test.txt/download-strategy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"expiresIn": 3600}')

echo "Full Response:"
echo "$PRIVATE_STRATEGY" | jq . 2>/dev/null || echo "$PRIVATE_STRATEGY"

if echo "$PRIVATE_STRATEGY" | grep -q '"method"'; then
    METHOD=$(echo "$PRIVATE_STRATEGY" | grep -o '"method":"[^"]*' | cut -d'"' -f4)
    URL=$(echo "$PRIVATE_STRATEGY" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "Analysis:"
    echo "  Method: $METHOD"
    
    if echo "$URL" | grep -q "s3.amazonaws.com"; then
        echo "  Storage: S3"
        
        if [ "$METHOD" = "presigned" ]; then
            echo "  ✅✅✅ CORRECT: Private bucket returns PRESIGNED URL"
            
            if echo "$URL" | grep -q "X-Amz-Signature"; then
                echo "  ✅ Has signature for secure access"
            else
                echo "  ❌ Missing signature (should have one)"
            fi
            
            if echo "$PRIVATE_STRATEGY" | grep -q '"expiresAt"'; then
                EXPIRES=$(echo "$PRIVATE_STRATEGY" | grep -o '"expiresAt":"[^"]*' | cut -d'"' -f4)
                echo "  ✅ Has expiration: $EXPIRES"
            fi
        else
            echo "  ❌ INCORRECT: Private should be 'presigned', got '$METHOD'"
        fi
    else
        echo "  Storage: Local filesystem (both use direct method)"
    fi
fi

# Cleanup
rm -f /tmp/test-s3.txt

echo ""
echo "=========================================="
echo "SUMMARY:"
echo "=========================================="
echo "Expected behavior with S3 storage:"
echo "  ✅ Public buckets: 'direct' method, no signature"
echo "  ✅ Private buckets: 'presigned' method, with signature and expiration"
echo ""
echo "If you see presigned URLs for public buckets, the optimization is NOT working."