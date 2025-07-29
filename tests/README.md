# Insforge Backend Tests

This directory contains all test scripts for the Insforge backend.

## Prerequisites

- Backend server running on `http://localhost:7130`
- Admin credentials: `admin@example.com` / `change-this-password`
- API key for storage operations

## Environment Variables

Set these before running tests:

```bash
# Required for storage tests
export INSFORGE_API_KEY="your_api_key_here"

# Optional - defaults shown
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="change-this-password"
export TEST_API_BASE="http://localhost:7130/api"
```

## Running Tests

### Run all tests
```bash
./tests/run-all-tests.sh
```

### Run individual tests
```bash
./tests/test-auth-router.sh
./tests/test-database-router.sh
./tests/test-modify-columns.sh           # NEW: Comprehensive column tests
./tests/test-e2e.sh
./tests/test-id-field.sh
./tests/test-oauth-config.sh
./tests/test-public-bucket.sh
```

## Test Data Cleanup

All tests automatically clean up after themselves by:
- Deleting test users (email prefix: `testuser_`)
- Removing test tables
- Deleting test storage buckets

### Manual cleanup

To remove ALL test data from the system:

```bash
./tests/cleanup-all-test-data.sh
```

This will prompt for confirmation and then delete:
- All users with email prefix `testuser_`
- All tables containing `test_`, `temp_`, `_test`, `_temp`
- All buckets containing `test`, `temp`, `public-images-`, `private-docs-`
- All API keys with "test" in their name

## Test Configuration

All tests source `test-config.sh` which provides:
- Shared configuration and environment variables
- Color output utilities
- Automatic cleanup functions
- Error tracking

## Writing New Tests

1. Create a new shell script in the `tests/` directory
2. Source the test configuration:
   ```bash
   source "$SCRIPT_DIR/test-config.sh"
   ```
3. Register resources for cleanup:
   ```bash
   register_test_user "$email"
   register_test_table "$table_name"
   register_test_bucket "$bucket_name"
   ```
4. Use utility functions:
   ```bash
   print_success "Test passed"
   print_fail "Test failed"
   print_info "Running test..."
   ```
5. Tests will automatically clean up on exit

## Authentication

- **Auth endpoints** (users, profiles): Use JWT tokens via `Authorization: Bearer $token`
- **Database endpoints**: Use JWT tokens via `Authorization: Bearer $token`
- **Storage endpoints**: Use API keys via `x-api-key: $api_key`

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

Tests track failures and return appropriate exit codes for CI/CD integration.