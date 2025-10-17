-- Migration: 014 - Add updated_at trigger to users table
-- Adds the updated_at trigger to the users table for automatic timestamp management

DO $$
BEGIN
    -- Ensure the update_updated_at_column function exists (created in 000_create-base-tables.sql)
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;

    -- Add updated_at trigger to users table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgrelid = 'users'::regclass 
        AND tgname = 'users_update_timestamp'
    ) THEN
        CREATE TRIGGER users_update_timestamp 
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Added updated_at trigger to users table';
    ELSE
        RAISE NOTICE 'updated_at trigger already exists on users table';
    END IF;
END $$;