-- init.sql
-- Create anonymous user for postgrest
CREATE ROLE web_anon NOLOGIN;

-- Create role for authenticator
CREATE ROLE authenticated NOLOGIN;

-- Create anonymous role
CREATE ROLE anon NOLOGIN;

-- Create dashboard user role for admin users
CREATE ROLE dashboard_user NOLOGIN;

