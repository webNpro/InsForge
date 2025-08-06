// This script adds .js extensions to import statements in compiled JavaScript files
// This is needed because TypeScript doesn't add them, but Node.js requires them

import * as fs from 'fs';
import * as path from 'path';

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix: from './something' → from './something.js'
  content = content.replace(
    /from ['"](\.[^'"]+)['"];/g,
    (match, importPath) => {
      // Don't add .js if it already has it
      if (importPath.endsWith('.js')) {
        return match;
      }
      return `from '${importPath}.js';`;
    }
  );
  
  fs.writeFileSync(filePath, content);
}

function fixDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      console.log(`Fixing imports in: ${fullPath}`);
      fixFile(fullPath);
    }
  }
}

// Fix all .js files in dist directory
fixDirectory('./dist');
console.log('✅ Fixed all imports');