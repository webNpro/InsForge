-- Test SQL file with complex cases including semicolons in strings
CREATE TABLE test_complex (
    id SERIAL PRIMARY KEY,
    message TEXT,
    data JSONB
);

-- Insert with semicolon in string
INSERT INTO test_complex (message, data) 
VALUES ('This message contains a; semicolon', '{"key": "value; with semicolon"}');

-- Insert with multiple semicolons and quotes
INSERT INTO test_complex (message, data) 
VALUES ('Here''s a test; with both '' quotes and ; semicolons', '{"test": "data"}');

-- Comment with semicolon; this should be ignored
/* Block comment with ; semicolon 
   across multiple lines; */
INSERT INTO test_complex (message) 
VALUES ('Another test with embedded SQL: SELECT * FROM users; DROP TABLE users;');

-- Function with semicolons in body
CREATE OR REPLACE FUNCTION test_func() RETURNS void AS $$
BEGIN
    -- Function body with semicolons
    RAISE NOTICE 'Test message;';
    PERFORM 1;
END;
$$ LANGUAGE plpgsql;

-- View with complex query
CREATE VIEW complex_view AS
SELECT 
    id,
    message,
    CASE 
        WHEN message LIKE '%;%' THEN 'Has semicolon'
        ELSE 'No semicolon'
    END as has_semi
FROM test_complex;