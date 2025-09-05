#!/bin/bash

# Direct database check for bucket visibility
echo "Checking bucket visibility directly in the backend..."

docker exec insforge node -e "
const path = require('path');
process.chdir('/app/backend');

// Use the actual backend database connection
const Database = require('better-sqlite3');
const db = new Database('data/insforge.db');

console.log('All storage buckets:');
const buckets = db.prepare('SELECT name, public, created_at FROM _storage_buckets').all();
buckets.forEach(b => {
  console.log(\`  \${b.name}: public=\${b.public} (created: \${b.created_at})\`);
});

// Check specific test buckets
console.log('\\nTest buckets status:');
['s3-public-test', 's3-private-test'].forEach(name => {
  const bucket = db.prepare('SELECT * FROM _storage_buckets WHERE name = ?').get(name);
  if (bucket) {
    console.log(\`  \${name}: public=\${bucket.public}\`);
  } else {
    console.log(\`  \${name}: NOT FOUND\`);
  }
});

db.close();
" 2>&1 | grep -v "Error:"
