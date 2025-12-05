#!/usr/bin/env node

/**
 * Migration Validation Script
 * Validates that React to Next.js migration follows proper conventions
 */

const fs = require('fs');
const path = require('path');

const VALIDATION_RULES = {
  // Files that should NOT exist in Next.js
  forbiddenFiles: [
    'src/index.js',
    'src/Index.tsx',
    'src/index.tsx',
    'src/reportWebVitals.js',
    'src/Reportwebvitals.tsx',
    'src/reportWebVitals.tsx',
    'src/setupTests.js',
    'src/Setuptests.tsx',
    'src/setupTests.tsx',
    'public/index.html'
  ],

  // Files with incorrect naming conventions
  incorrectNaming: {
    'src/hooks/Usetodos.tsx': 'hooks/useTodos.ts',
    'src/hooks/Usetodos.ts': 'hooks/useTodos.ts',
    'src/context/Todocontext.tsx': 'lib/context/TodoContext.tsx',
    'src/context/TodoContext.tsx': 'lib/context/TodoContext.tsx'
  },

  // Required Next.js files
  requiredFiles: [
    'app/layout.tsx',
    'app/page.tsx',
    'next.config.js',
    'package.json'
  ]
};

class MigrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  validate() {
    console.log('🔍 Validating React to Next.js migration...\n');

    this.checkForbiddenFiles();
    this.checkIncorrectNaming();
    this.checkRequiredFiles();
    this.checkHookNaming();
    this.checkContextLocation();

    this.printResults();
  }

  checkForbiddenFiles() {
    console.log('📋 Checking for forbidden files...');
    
    VALIDATION_RULES.forbiddenFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.errors.push({
          type: 'FORBIDDEN_FILE',
          file: filePath,
          message: `❌ ${filePath} should not exist in Next.js`,
          fix: `Delete this file - it's not needed in Next.js`
        });
      }
    });
  }

  checkIncorrectNaming() {
    console.log('📋 Checking for incorrect naming conventions...');
    
    Object.entries(VALIDATION_RULES.incorrectNaming).forEach(([wrongPath, correctPath]) => {
      if (fs.existsSync(wrongPath)) {
        this.errors.push({
          type: 'INCORRECT_NAMING',
          file: wrongPath,
          message: `❌ ${wrongPath} has incorrect naming`,
          fix: `Rename/move to: ${correctPath}`
        });
      }
    });
  }

  checkRequiredFiles() {
    console.log('📋 Checking for required Next.js files...');
    
    VALIDATION_RULES.requiredFiles.forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        this.warnings.push({
          type: 'MISSING_REQUIRED',
          file: filePath,
          message: `⚠️  ${filePath} is missing`,
          fix: `Create this required Next.js file`
        });
      }
    });
  }

  checkHookNaming() {
    console.log('📋 Checking hook naming conventions...');
    
    const hooksDir = 'hooks';
    if (fs.existsSync(hooksDir)) {
      const files = this.getAllFiles(hooksDir);
      
      files.forEach(file => {
        const basename = path.basename(file);
        
        // Check if it's a hook file (should start with 'use')
        if (basename.match(/^[A-Z]/) && basename.includes('use')) {
          this.errors.push({
            type: 'HOOK_NAMING',
            file,
            message: `❌ ${file} - Hooks must be camelCase (e.g., useTodos.ts)`,
            fix: `Rename to ${basename.replace(/^[A-Z]/, c => c.toLowerCase())}`
          });
        }

        // Check if hook uses .tsx when it shouldn't
        if (basename.startsWith('use') && basename.endsWith('.tsx')) {
          const content = fs.readFileSync(file, 'utf-8');
          if (!content.includes('JSX') && !content.includes('<')) {
            this.warnings.push({
              type: 'HOOK_EXTENSION',
              file,
              message: `⚠️  ${file} - Hooks should use .ts unless returning JSX`,
              fix: `Rename to ${basename.replace('.tsx', '.ts')}`
            });
          }
        }
      });
    }
  }

  checkContextLocation() {
    console.log('📋 Checking context file locations...');
    
    const srcContext = 'src/context';
    if (fs.existsSync(srcContext)) {
      const files = this.getAllFiles(srcContext);
      
      files.forEach(file => {
        this.warnings.push({
          type: 'CONTEXT_LOCATION',
          file,
          message: `⚠️  ${file} - Context should be in lib/ or app/context/`,
          fix: `Move to lib/context/ or app/context/`
        });
      });
    }
  }

  getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        this.getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60) + '\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validation checks passed!\n');
      return;
    }

    if (this.errors.length > 0) {
      console.log('🚨 ERRORS (must fix):\n');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
        console.log(`   File: ${error.file}`);
        console.log(`   Fix: ${error.fix}\n`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS (should fix):\n');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
        console.log(`   File: ${warning.file}`);
        console.log(`   Fix: ${warning.fix}\n`);
      });
    }

    console.log('='.repeat(60));
    console.log(`Total Errors: ${this.errors.length}`);
    console.log(`Total Warnings: ${this.warnings.length}`);
    console.log('='.repeat(60) + '\n');

    if (this.errors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validation
const validator = new MigrationValidator();
validator.validate();
