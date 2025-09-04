-- Migration: 002 - Rename authentication tables to better auth naming convention

DO $$
BEGIN
    -- Rename _account to _oauth_connections
    IF EXISTS (SELECT FROM information_schema.tables 
              WHERE table_name = '_account' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables 
                       WHERE table_name = '_oauth_connections' AND table_schema = 'public') THEN
              ALTER TABLE _account RENAME TO _oauth_connections;
        END IF;
    END IF;

    -- Rename _user to _accounts
    IF EXISTS (SELECT FROM information_schema.tables 
              WHERE table_name = '_user' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT FROM information_schema.tables 
                       WHERE table_name = '_accounts' AND table_schema = 'public') THEN
              ALTER TABLE _user RENAME TO _accounts;
        END IF;
    END IF;
END $$;