-- Migration: 004 - Enable project admin modify any users.

DO $$
BEGIN
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
END $$;