# Insforge Debug Guide

## When Your API Code Fails

**Start here** → `get-instructions` and `get-backend-metadata` (understand system state)
**Read docs** → `get-db-api`, `get-auth-api`, `get-storage-api` (read ALL of them)
**Check table** → `get-table-schema` with your table name
**Test endpoint** → Use curl with exact API format from docs

## Critical Rule: Read Documentation First

Before debugging, you MUST read all documentation to understand how the API works.

## Common MCP Issues

**Table created but API fails** → Check field names match schema exactly
**Array required** → PostgREST requires POST requests as arrays `[{...}]
**Foreign key error** → Parent record must exist before child
**Auth tables** → Use Auth API for _auth tables, not Database API

## Debug Workflow

1. **Always** call `get-backend-metadata` first
2. Read the relevant API documentation completely
3. Check your table schema matches your API calls
4. Test with curl using exact format from docs
5. Verify response matches documentation

## Key Rules

- Backend runs on port 7130
- All database operations need `x-api-key` header
- POST requests must be arrays `[{...}]`
- System tables (prefixed with _) need special APIs
- No escaped characters in JSON

**Remember**: MCP creates the structure, but you must follow API documentation exactly to use it.