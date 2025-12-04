const fs = require('fs');
const path = require('path');

const projectMap = {
  metadata: {
    version: '1.0.0',
    lastFullScan: new Date().toISOString(),
    totalFiles: 0,
    projectName: 'ReviveHub',
    description: 'AI-powered code modernization and migration platform'
  },
  components: {},
  services: {},
  hooks: {},
  utilities: {},
  pages: {},
  types: {},
  config: {},
  transformers: {},
  migration: {},
  planner: {},
  github: {},
  scanner: {}
};

function scanDirectory(dir, category) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath, category);
        }
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = filePath.replace(/\\/g, '/');
        
        const info = {
          purpose: extractPurpose(content, file),
          exports: extractExports(content),
          dependencies: extractDependencies(content),
          lastModified: new Date().toISOString().split('T')[0]
        };
        
        projectMap[category][relativePath] = info;
        projectMap.metadata.totalFiles++;
      }
    });
  } catch (err) {
    // Skip directories we can't read
  }
}

function extractPurpose(content, fileName) {
  // Extract from JSDoc comments
  const jsdocMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdocMatch) {
    const firstLine = jsdocMatch[1].split('\n')[1];
    if (firstLine) {
      return firstLine.replace(/^\s*\*\s*/, '').trim();
    }
  }
  
  // Extract from single-line comments
  const commentMatch = content.match(/\/\/\s*(.+)/);
  if (commentMatch) {
    return commentMatch[1].trim();
  }
  
  // Infer from file name
  return 'Module for ' + fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
}

function extractExports(content) {
  const exports = [];
  
  // Named exports
  const namedMatches = content.matchAll(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g);
  for (const match of namedMatches) {
    exports.push(match[1]);
  }
  
  // Default export
  if (content.includes('export default')) {
    const defaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (defaultMatch) {
      exports.push('default: ' + defaultMatch[1]);
    } else {
      exports.push('default');
    }
  }
  
  return exports;
}

function extractDependencies(content) {
  const deps = [];
  const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
  
  for (const match of importMatches) {
    const dep = match[1];
    if (dep.startsWith('./') || dep.startsWith('../') || dep.startsWith('@/')) {
      deps.push(dep);
    }
  }
  
  return deps;
}

// Scan all directories
console.log('Scanning components...');
scanDirectory('components', 'components');

console.log('Scanning services...');
scanDirectory('services', 'services');

console.log('Scanning hooks...');
scanDirectory('hooks', 'hooks');

console.log('Scanning lib...');
scanDirectory('lib', 'utilities');

console.log('Scanning app...');
scanDirectory('app', 'pages');

console.log('Scanning types...');
scanDirectory('types', 'types');

console.log('Scanning transformers...');
scanDirectory('lib/transformers', 'transformers');

console.log('Scanning migration...');
scanDirectory('lib/migration', 'migration');

console.log('Scanning planner...');
scanDirectory('lib/planner', 'planner');

console.log('Scanning github...');
scanDirectory('lib/github', 'github');

console.log('Scanning scanner...');
scanDirectory('lib/scanner', 'scanner');

// Write the project map
fs.writeFileSync('.kiro/project-map.json', JSON.stringify(projectMap, null, 2));

console.log('\nProject map created successfully!');
console.log('Total files scanned:', projectMap.metadata.totalFiles);
console.log('Components:', Object.keys(projectMap.components).length);
console.log('Services:', Object.keys(projectMap.services).length);
console.log('Hooks:', Object.keys(projectMap.hooks).length);
console.log('Utilities:', Object.keys(projectMap.utilities).length);
console.log('Pages:', Object.keys(projectMap.pages).length);
console.log('Types:', Object.keys(projectMap.types).length);
console.log('Transformers:', Object.keys(projectMap.transformers).length);
console.log('Migration:', Object.keys(projectMap.migration).length);
console.log('Planner:', Object.keys(projectMap.planner).length);
console.log('GitHub:', Object.keys(projectMap.github).length);
console.log('Scanner:', Object.keys(projectMap.scanner).length);
