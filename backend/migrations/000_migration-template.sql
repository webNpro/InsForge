-- Migration Template: XXX - Description
-- This is a template for creating migrations that automatically reload PostgREST schema

/*
Usage:
1. Copy this template
2. Replace XXX with migration number
3. Replace "Description" with your migration description
4. Add your migration logic in the main DO block
5. The PostgREST reload function will be called automatically at the end

Example migration structure:
*/

DO $$
BEGIN
    -- Your migration logic goes here
    -- Example:
    -- CREATE TABLE example_table (
    --     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     name TEXT NOT NULL,
    --     created_at TIMESTAMPTZ DEFAULT NOW()
    -- );
    
    -- Enable RLS if needed
    -- ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;
    
    -- Create policies if needed
    -- CREATE POLICY "example_policy" ON example_table
    --     FOR ALL TO authenticated
    --     USING (true);
    
    -- Grant permissions if needed
    -- GRANT SELECT, INSERT, UPDATE, DELETE ON example_table TO authenticated;
    -- GRANT SELECT, INSERT, UPDATE, DELETE ON example_table TO project_admin;
    
    -- Always reload PostgREST schema at the end of migrations that change table structure or RLS
    -- Only call this if the reload_postgrest_schema function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reload_postgrest_schema') THEN
        PERFORM reload_postgrest_schema();
        RAISE NOTICE 'PostgREST schema reload requested after migration';
    ELSE
        RAISE WARNING 'PostgREST reload function not found - please restart PostgREST manually';
    END IF;
    
    RAISE NOTICE 'Migration XXX completed successfully';
END $$;