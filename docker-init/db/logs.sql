\set pguser `echo "$POSTGRES_USER"`

CREATE DATABASE _insforge WITH OWNER :pguser;

\c _insforge
create schema if not exists _analytics;
alter schema _analytics owner to :pguser;

-- Create publication for Logflare replication (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'logflare_pub') THEN
        CREATE PUBLICATION logflare_pub FOR ALL TABLES;
    END IF;
END
$$;

\c postgres
