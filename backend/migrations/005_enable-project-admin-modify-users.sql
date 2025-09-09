-- Migration: 004 - Enable project admin modify any users.

DO $$
BEGIN
    -- Create a function to reload PostgREST schema
    CREATE OR REPLACE FUNCTION reload_postgrest_schema()
    RETURNS void
    LANGUAGE plpgsql
    AS $reload_function$
    BEGIN
        -- Method 1: Use NOTIFY to signal PostgREST to reload schema
        -- PostgREST listens to 'pgrst' channel for schema changes
        NOTIFY pgrst, 'reload schema';
        
        RAISE NOTICE 'PostgREST schema reload notification sent';
    END
    $reload_function$;

    -- Grant execute permission to project_admin and authenticated users
    GRANT EXECUTE ON FUNCTION reload_postgrest_schema() TO project_admin;
    GRANT EXECUTE ON FUNCTION reload_postgrest_schema() TO authenticated;
    
    RAISE NOTICE 'PostgREST schema reload function created successfully';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'Allow project_admin to update any user'
    ) THEN
      CREATE POLICY "Allow project_admin to update any user" ON users
        FOR UPDATE
        TO project_admin
        USING (true)
        WITH CHECK (true);  -- make sure project-admin always can update
    END IF;

    GRANT SELECT, UPDATE ON users TO project_admin;
    
    -- Notify PostgREST to reload schema after policy changes
     IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reload_postgrest_schema') THEN
        PERFORM reload_postgrest_schema();
        RAISE NOTICE 'PostgREST schema reload requested after migration';
    ELSE
        RAISE WARNING 'PostgREST reload function not found - please restart PostgREST manually';
    END IF;
    
    RAISE NOTICE 'Migration project-admin-update-users completed successfully';
END $$;