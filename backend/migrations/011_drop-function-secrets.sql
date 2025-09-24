-- Drop the _function_secrets table as it has been replaced by using the main _secrets table
-- This migration is part of the refactoring to unify all secrets management

-- Drop the trigger first
DROP TRIGGER IF EXISTS update__function_secrets_updated_at ON _function_secrets;

-- Drop the index
DROP INDEX IF EXISTS idx_function_secrets_key;

-- Drop the table
DROP TABLE IF EXISTS _function_secrets;

-- Note: All edge function secrets should now be managed through the _secrets table
-- via the /api/secrets endpoint