#!/bin/bash

# Universal test runner for Insforge backend tests
# This script runs all test files in the tests directory

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================="
echo "Running all Insforge backend tests"
echo "=========================================="
echo ""

# Export API configuration for all tests
export TEST_API_BASE="${TEST_API_BASE:-http://localhost:7130/api}"

# Check if admin credentials are set
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${YELLOW}Warning: Admin credentials not set. Using defaults.${NC}"
    echo "Set with: export ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your_password"
    export ADMIN_EMAIL="admin@example.com"
    export ADMIN_PASSWORD="change-this-password"
    echo ""
fi

# Check if API key is set
if [ -z "$INSFORGE_API_KEY" ]; then
    echo -e "${YELLOW}Warning: INSFORGE_API_KEY not set. Some tests may be skipped.${NC}"
    echo "Set with: export INSFORGE_API_KEY=your_api_key"
    echo ""
fi

# Export admin credentials for tests
export TEST_ADMIN_EMAIL="$ADMIN_EMAIL"
export TEST_ADMIN_PASSWORD="$ADMIN_PASSWORD"

# Keep track of test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

# Function to run a test and handle cleanup
run_test() {
    local test_script=$1
    local test_name=$(basename "$test_script" .sh)
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    echo "----------------------------------------"
    
    # Run the test in a subshell to isolate cleanup
    (
        # Run the test script
        "$test_script"
    )
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
    fi
    
    echo ""
    return $exit_code
}

# Run each test script
for test_script in "$SCRIPT_DIR"/test-*.sh; do
    if [ -f "$test_script" ] && [ -x "$test_script" ]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        run_test "$test_script"
    fi
done

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed tests:${NC}"
    for failed_test in "${FAILED_TEST_NAMES[@]}"; do
        echo "  - $failed_test"
    done
    exit 1
else
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi