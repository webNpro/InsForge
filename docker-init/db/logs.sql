\set pguser `echo "$POSTGRES_USER"`

CREATE DATABASE _insforge WITH OWNER :pguser;

\c _insforge
create schema if not exists _analytics;
alter schema _analytics owner to :pguser;

-- Create sources table to track different log sources
CREATE TABLE IF NOT EXISTS _analytics.sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default log sources
INSERT INTO _analytics.sources (name, token) VALUES
    ('cloudflare.logs.prod', 'insforge-vector'),
    ('deno-relay-logs', 'function-vector'),
    ('postgREST.logs.prod', 'postgrest-vector'),
    ('postgres.logs', 'postgres-vector')
ON CONFLICT (name) DO NOTHING;

-- Create log event tables for each source
-- Vector will insert logs into these tables
CREATE TABLE IF NOT EXISTS _analytics.log_events_insforge_vector (
    id VARCHAR(255) PRIMARY KEY,
    event_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    body JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _analytics.log_events_function_vector (
    id VARCHAR(255) PRIMARY KEY,
    event_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    body JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _analytics.log_events_postgrest_vector (
    id VARCHAR(255) PRIMARY KEY,
    event_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    body JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS _analytics.log_events_postgres_vector (
    id VARCHAR(255) PRIMARY KEY,
    event_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    body JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_insforge_timestamp ON _analytics.log_events_insforge_vector(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_function_timestamp ON _analytics.log_events_function_vector(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_postgrest_timestamp ON _analytics.log_events_postgrest_vector(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_postgres_timestamp ON _analytics.log_events_postgres_vector(timestamp DESC);

-- Create indexes for search performance on event_message
CREATE INDEX IF NOT EXISTS idx_insforge_message ON _analytics.log_events_insforge_vector USING gin(to_tsvector('english', event_message));
CREATE INDEX IF NOT EXISTS idx_function_message ON _analytics.log_events_function_vector USING gin(to_tsvector('english', event_message));
CREATE INDEX IF NOT EXISTS idx_postgrest_message ON _analytics.log_events_postgrest_vector USING gin(to_tsvector('english', event_message));
CREATE INDEX IF NOT EXISTS idx_postgres_message ON _analytics.log_events_postgres_vector USING gin(to_tsvector('english', event_message));

-- Create indexes for JSONB body search
CREATE INDEX IF NOT EXISTS idx_insforge_body ON _analytics.log_events_insforge_vector USING gin(body);
CREATE INDEX IF NOT EXISTS idx_function_body ON _analytics.log_events_function_vector USING gin(body);
CREATE INDEX IF NOT EXISTS idx_postgrest_body ON _analytics.log_events_postgrest_vector USING gin(body);
CREATE INDEX IF NOT EXISTS idx_postgres_body ON _analytics.log_events_postgres_vector USING gin(body);

\c insforge
