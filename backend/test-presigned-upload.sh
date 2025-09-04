#!/bin/bash

# Test script for presigned URL upload flow (S3 only)
# This demonstrates the complete flow for uploading files using presigned URLs

API_URL="http://localhost:7130"
BUCKET_NAME="test-bucket"
TEST_FILE="test-file.txt"

echo "=== Presigned URL Upload Test (S3 Backend Only) ==="
echo ""

# Create a test file
echo "This is a test file for presigned upload" > $TEST_FILE

# Step 1: Login to get auth token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/sessions \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
if [ "$TOKEN" == "null" ]; then
  echo "Error: Failed to login"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi
echo "✓ Logged in successfully"

# Step 2: Create bucket if needed
echo ""
echo "2. Creating bucket '$BUCKET_NAME'..."
curl -s -X POST $API_URL/api/storage/buckets \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"bucketName\": \"$BUCKET_NAME\",
    \"isPublic\": true
  }" | jq .

# Step 3: Request presigned URL
echo ""
echo "3. Requesting presigned upload URL..."
PRESIGNED_RESPONSE=$(curl -s -X POST $API_URL/api/storage/buckets/$BUCKET_NAME/objects/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "filename": "test-file.txt",
    "contentType": "text/plain",
    "fileSize": 42
  }')

echo "Presigned URL Response:"
echo $PRESIGNED_RESPONSE | jq .

# Extract the upload URL and fields
UPLOAD_URL=$(echo $PRESIGNED_RESPONSE | jq -r '.uploadUrl')
FIELDS=$(echo $PRESIGNED_RESPONSE | jq -r '.fields')
KEY=$(echo $PRESIGNED_RESPONSE | jq -r '.key')
MAX_SIZE=$(echo $PRESIGNED_RESPONSE | jq -r '.maxSize')

if [ "$UPLOAD_URL" == "null" ]; then
  echo "Error: Failed to get presigned URL. This only works with S3 backend."
  exit 1
fi

echo ""
echo "✓ Got presigned URL:"
echo "  - Upload URL: $UPLOAD_URL"
echo "  - Key: $KEY"
echo "  - Max Size: $MAX_SIZE bytes"

# Step 4: Upload file directly to S3 using presigned URL
echo ""
echo "4. Uploading file directly to S3..."

# Build the multipart form data with all required fields
FORM_FIELDS=""
for field in $(echo $FIELDS | jq -r 'to_entries[] | @base64'); do
  _jq() {
    echo ${field} | base64 --decode | jq -r ${1}
  }
  FIELD_NAME=$(_jq '.key')
  FIELD_VALUE=$(_jq '.value')
  FORM_FIELDS="$FORM_FIELDS -F $FIELD_NAME=$FIELD_VALUE"
done

# Upload the file (file field must be last)
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $UPLOAD_URL \
  $FORM_FIELDS \
  -F "file=@$TEST_FILE")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -ge "200" ] && [ "$HTTP_CODE" -lt "300" ]; then
  echo "✓ File uploaded successfully to S3 (HTTP $HTTP_CODE)"
else
  echo "✗ Upload failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

# Step 5: Confirm upload
echo ""
echo "5. Confirming upload..."
FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null)

CONFIRM_RESPONSE=$(curl -s -X PUT $API_URL/api/storage/buckets/$BUCKET_NAME/objects/$KEY/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"fileSize\": $FILE_SIZE,
    \"contentType\": \"text/plain\"
  }")

echo "Confirmation Response:"
echo $CONFIRM_RESPONSE | jq .

# Step 6: Get presigned download URL
echo ""
echo "6. Getting presigned download URL..."
DOWNLOAD_RESPONSE=$(curl -s -X GET $API_URL/api/storage/buckets/$BUCKET_NAME/objects/$KEY/presigned-url \
  -H "Authorization: Bearer $TOKEN")

echo "Download URL Response:"
echo $DOWNLOAD_RESPONSE | jq .

DOWNLOAD_URL=$(echo $DOWNLOAD_RESPONSE | jq -r '.url')

# Step 7: Test download
echo ""
echo "7. Testing download from presigned URL..."
curl -s -o downloaded-$TEST_FILE "$DOWNLOAD_URL"

if cmp -s "$TEST_FILE" "downloaded-$TEST_FILE"; then
  echo "✓ Downloaded file matches original"
else
  echo "✗ Downloaded file doesn't match"
fi

# Cleanup
rm -f $TEST_FILE downloaded-$TEST_FILE

echo ""
echo "=== Test Complete ==="
echo ""
echo "Summary:"
echo "- Presigned URLs work ONLY with S3 backend"
echo "- Upload flow: Request presigned URL → Upload to S3 → Confirm upload"
echo "- Files go directly to S3, bypassing your backend server"
echo "- This reduces backend load and improves upload performance"