#!/bin/bash

# Generate secure random tokens for Logflare
echo "Generating Logflare access tokens..."

# Generate 32-byte random tokens and encode as base64
PUBLIC_TOKEN=$(openssl rand -base64 32)
PRIVATE_TOKEN=$(openssl rand -base64 32)

echo ""
echo "Generated tokens:"
echo "=================="
echo "LOGFLARE_PUBLIC_ACCESS_TOKEN=$PUBLIC_TOKEN"
echo "LOGFLARE_PRIVATE_ACCESS_TOKEN=$PRIVATE_TOKEN"
echo ""
echo "To use these tokens:"
echo "1. Update your .env file with the generated tokens"
echo "2. Restart the docker services: docker-compose restart analytics vector"
echo ""
echo "Note: These are randomly generated tokens for your self-hosted Logflare instance."
echo "Keep the PRIVATE token secure and never commit it to version control."