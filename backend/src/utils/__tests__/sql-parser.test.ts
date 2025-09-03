import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { parseSQLStatements } from '../sql-parser.js';

describe('SQL Parser', () => {
  let complexSqlContent: string;

  beforeAll(async () => {
    // Read the test SQL file
    const testSqlPath = path.join(__dirname, './test-sql-with-semicolons.sql');
    complexSqlContent = await fs.readFile(testSqlPath, 'utf-8');
  });

  describe('parseSQLStatements', () => {
    it('should handle empty input', () => {
      expect(() => parseSQLStatements('')).toThrow('SQL text must be a non-empty string');
    });

    it('should handle null/undefined input', () => {
      expect(() => parseSQLStatements(null as any)).toThrow('SQL text must be a non-empty string');
      expect(() => parseSQLStatements(undefined as any)).toThrow('SQL text must be a non-empty string');
    });

    it('should parse simple SQL statements', () => {
      const sql = `
        CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);
        INSERT INTO users (name) VALUES ('John Doe');
        SELECT * FROM users;
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(3);
      expect(statements[0]).toContain('CREATE TABLE users');
      expect(statements[1]).toContain('INSERT INTO users');
      expect(statements[2]).toContain('SELECT * FROM users');
    });

    it('should handle semicolons inside string literals', () => {
      const sql = `
        INSERT INTO messages (content) VALUES ('Hello; World');
        INSERT INTO logs (data) VALUES ('Error: Connection failed; retrying...');
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain("'Hello; World'");
      expect(statements[1]).toContain("'Error: Connection failed; retrying...'");
    });

    it('should handle escaped quotes in strings', () => {
      const sql = `
        INSERT INTO quotes (text) VALUES ('He said: ''Hello; World''');
        INSERT INTO data (json) VALUES ('{"key": "value; with semicolon"}');
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain("''Hello; World''");
      expect(statements[1]).toContain('"value; with semicolon"');
    });

    it('should filter out pure comment statements', () => {
      const sql = `
        -- This is just a comment;
        CREATE TABLE test (id INT);
        /* This is a block comment with; semicolon */
        INSERT INTO test (id) VALUES (1);
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('CREATE TABLE test');
      expect(statements[1]).toContain('INSERT INTO test');
    });

    it('should handle complex SQL file with all edge cases', () => {
      const statements = parseSQLStatements(complexSqlContent);
      
      // Expected statements from test-sql-with-semicolons.sql:
      // 1. CREATE TABLE test_complex
      // 2. INSERT with semicolon in string
      // 3. INSERT with escaped quotes and semicolons
      // 4. INSERT with embedded SQL in string
      // 5. CREATE FUNCTION with semicolons in body
      // 6. CREATE VIEW with complex CASE
      expect(statements).toHaveLength(6);
      
      // Verify specific statements
      expect(statements[0]).toContain('CREATE TABLE test_complex');
      expect(statements[1]).toContain('This message contains a; semicolon');
      expect(statements[2]).toContain("Here''s a test; with both '' quotes and ; semicolons");
      expect(statements[3]).toContain('SELECT * FROM users; DROP TABLE users;');
      expect(statements[4]).toContain('CREATE OR REPLACE FUNCTION test_func()');
      expect(statements[4]).toContain('RAISE NOTICE');
      expect(statements[5]).toContain('CREATE VIEW complex_view');
      expect(statements[5]).toContain("WHEN message LIKE '%;%'");
    });

    it('should handle PostgreSQL dollar-quoted strings', () => {
      const sql = `
        CREATE FUNCTION test() RETURNS void AS $$
        BEGIN
          RAISE NOTICE 'Function with; semicolon';
          PERFORM 1;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain('CREATE FUNCTION test()');
      expect(statements[0]).toContain('RAISE NOTICE');
      expect(statements[0]).toContain('$$ LANGUAGE plpgsql');
    });

    it('should handle mixed comment styles', () => {
      const sql = `
        CREATE TABLE test (id INT); -- Line comment with; semicolon
        /* Block comment 
           with multiple lines;
           and semicolons; */
        INSERT INTO test VALUES (1);
      `;
      
      const statements = parseSQLStatements(sql);
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('CREATE TABLE test');
      expect(statements[1]).toContain('INSERT INTO test VALUES');
    });
  });
});