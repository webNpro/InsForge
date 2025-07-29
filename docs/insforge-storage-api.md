# Insforge OSS Storage API Documentation

## API Basics

**Base URL:** `http://localhost:7130`  
**Authentication:** All requests require `x-api-key` header (except public bucket downloads)  
**System:** Bucket-based storage with public/private access control
**URL Format**: Response `url` field contains `/api/storage/...` - prepend host only (no /api)


## Bucket Operations (Use MCP Tools)

### Available MCP Tools
1. **create-bucket** - Create bucket (`bucket_name`, `public`: true by default)
2. **list-buckets** - List all buckets
3. **delete-bucket** - Delete bucket

## Object Operations (Use REST API)

### Base URL
`/api/storage/:bucket/:key`

### Upload Object with Specific Key
**PUT** `/api/storage/:bucket/:key`


Send file as multipart/form-data:
```javascript
const formData = new FormData();
formData.append('file', fileObject);
```

Returns:
```json
{
  "bucket": "test-images",
  "key": "test.txt", 
  "size": 30,
  "mime_type": "text/plain",
  "uploaded_at": "2025-07-18T04:32:13.801Z",
  "url": "/api/storage/test-images/test.txt"
}
```

Example curl:
```bash
curl -X PUT http://localhost:7130/api/storage/avatars/user123.jpg \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/image.jpg"
```

### Upload Object with Auto-Generated Key
**POST** `/api/storage/:bucket`

Request:
```bash
curl -X POST http://localhost:7130/api/storage/avatars \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/image.jpg"
```

Response:
```json
{
  "bucket": "avatars",
  "key": "image-1737546841234-a3f2b1.jpg", 
  "size": 15234,
  "mime_type": "image/jpeg",
  "uploaded_at": "2025-07-18T04:32:13.801Z",
  "url": "/api/storage/avatars/image-1737546841234-a3f2b1.jpg"
}
```

### Download Object
**GET** `/api/storage/:bucket/:key`

Returns the actual file content with appropriate content-type headers.
**Note:** Public buckets allow downloads without authentication.

Example response: Raw file content (not JSON wrapped)

### List Objects
**GET** `/api/storage/:bucket`

Query parameters:
- `prefix` - Filter by key prefix
- `limit` - Max results (default: 100)
- `offset` - Pagination offset

Returns:
```json
{
  "bucket": "test-images",
  "prefix": null,
  "objects": [
    {
      "bucket": "test-images",
      "key": "test.txt",
      "size": 30,
      "mime_type": "text/plain",
      "uploaded_at": "2025-07-18T04:32:13.801Z",
      "url": "/api/storage/test-images/test.txt"
    }
  ]
}
```

Pagination headers:
- `X-Total-Count`: Total number of objects
- `X-Page`: Current page number
- `X-Page-Size`: Number of items per page

Example curl:
```bash
curl -X GET "http://localhost:7130/api/storage/avatars?limit=10&prefix=users/" \
  -H "x-api-key: YOUR_API_KEY"
```

### Delete Object
**DELETE** `/api/storage/:bucket/:key`

Returns:
```json
{
  "message": "Object deleted successfully"
}
```

Example curl:
```bash
curl -X DELETE http://localhost:7130/api/storage/avatars/user123.jpg \
  -H "x-api-key: YOUR_API_KEY"
```

### Update Bucket Visibility
**PATCH** `/api/storage/buckets/:bucket`

Request body:
```json
{ "public": true }
```

Returns:
```json
{
  "message": "Bucket visibility updated",
  "bucket": "test-images",
  "public": false
}
```

Example curl:
```bash
curl -X PATCH http://localhost:7130/api/storage/buckets/avatars \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"public": true}'
```

## Database Integration

### Option 1: Upload with Specific Key (PUT)
```javascript
// Step 1: Upload file with known key
const formData = new FormData();
formData.append('file', file);
const upload = await fetch('/api/storage/images/avatar.jpg', {
  method: 'PUT',
  headers: { 'x-api-key': apiKey },
  body: formData
});

// Step 2: Store metadata
const records = [{
  user_id: 'user123',
  image: await upload.json()  // Store file metadata
}];
await fetch('/api/database/profiles', {
  method: 'POST',
  headers: { 
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(records)
});
```

### Option 2: Upload with Auto-Generated Key (POST)
```javascript
// Step 1: Upload file with auto-generated key
const formData = new FormData();
formData.append('file', file);
const upload = await fetch('/api/storage/images', {
  method: 'POST',
  headers: { 'x-api-key': apiKey },
  body: formData
});
const fileData = await upload.json();

// Step 2: Store metadata with generated key
const records = [{
  user_id: 'user123',
  image: fileData  // Contains auto-generated key
}];
await fetch('/api/database/profiles', {
  method: 'POST',
  headers: { 
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(records)
});
```

## Error Response Format

All error responses follow this format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "statusCode": 400,
  "nextAction": "Suggested action to resolve the error"
}
```

Example error:
```json
{
  "error": "BUCKET_NOT_FOUND",
  "message": "Bucket 'nonexistent' does not exist",
  "statusCode": 404,
  "nextAction": "Create the bucket first"
}
```

## Important Rules

1. **File Operations**
   - Upload uses multipart/form-data
   - Database stores metadata only
   - Use `json` column type for file metadata

2. **Bucket Names**
   - Must be valid identifiers
   - Cannot start with underscore

3. **Remember**
   - Bucket management uses MCP tools
   - Object operations use REST API
   - All operations need API key