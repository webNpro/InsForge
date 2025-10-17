-- Migration: 014 - Add updated_at trigger to users table
-- Adds the updated_at trigger to the users table for automatic timestamp management

DO $$
BEGIN
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