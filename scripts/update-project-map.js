#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectMapUpdater {
  constructor() {
    this.mapPath = '.kiro/project-map.json';
    this.loadExistingMap();
  }

  loadExistingMap() {
    try {
      const content = fs.readFileSync(this.mapPath, 'utf8');
      this.projectMap = JSON.parse(content);
    } catch (error) {
      // Initialize if map doesn't exist
      this.projectMap = {
        metadata: {
          version: "1.0.0",
          lastFullScan: new Date().toISOString(),
          totalFiles: 0
        },
        components: {},
        services: {},
        hooks: {},
        utilities: {},
        pages: {},
        types: {},
        config: {}
      };
    }
  }

  updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
      // File was deleted, remove from map
      this.removeFromMap(filePath);
      return;
    }

    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = this.extractFileInfo(content, filePath);
    
    if (!analysis) return;

    const category = this.categorizeFile(filePath, content);
    
    // Remove from other categories if it was moved
    this.removeFromAllCategories(filePath);
    
    // Add to correct category
    this.projectMap[category][filePath] = {
      ...analysis,
      lastModified: new Date().toISOString().split('T')[0]
    };

    this.updateMetadata();
    this.saveMap();
  }

  removeFromMap(filePath) {
    let removed = false;
    Object.keys(this.projectMap).forEach(category => {
      if (typeof this.projectMap[category] === 'object' && this.projectMap[category][filePath]) {
        delete this.projectMap[category][filePath];
        removed = true;
      }
    });
    
    if (removed) {
      this.updateMetadata();
      this.saveMap();
    }
  }

  removeFromAllCategories(filePath) {
    ['components', 'services', 'hooks', 'utilities', 'pages', 'types', 'config'].forEach(category => {
      if (this.projectMap[category][filePath]) {
        delete this.projectMap[category][filePath];
      }
    });
  }

  extractFileInfo(content, filePath) {
    const exports = this.extractExports(content);
    const dependencies = this.extractDependencies(content);
    const purpose = this.inferPurpose(content, filePath);
    
    return {
      purpose,
      exports,
      dependencies
    };
  }

  extractExports(content) {
    const exports = [];
    
    // Named exports
    const namedExports = content.match(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g);
    if (namedExports) {
      namedExports.forEach(match => {
        const name = match.match(/(\w+)$/)[1];
        exports.push(name);
      });
    }
    
    // Default exports
    const defaultExport = content.match(/export\s+default\s+(\w+)/);
    if (defaultExport) {
      exports.push(defaultExport[1]);
    }
    
    return exports;
  }

  extractDependencies(content) {
    const deps = [];
    
    // Import statements
    const imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (imports) {
      imports.forEach(imp => {
        const module = imp.match(/from\s+['"]([^'"]+)['"]/)[1];
        if (module.startsWith('./') || module.startsWith('../')) {
          deps.push(module);
        }
      });
    }
    
    return deps;
  }

  inferPurpose(content, filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Component patterns
    if (content.includes('return (') && (content.includes('JSX') || content.includes('<'))) {
      return `React component for ${fileName.toLowerCase()}`;
    }
    
    // Hook patterns
    if (fileName.startsWith('use') && (content.includes('useState') || content.includes('useEffect'))) {
      return `Custom React hook for ${fileName.slice(3).toLowerCase()}`;
    }
    
    // Service patterns
    if (content.includes('fetch') || content.includes('axios') || content.includes('api')) {
      return `Service for API calls and ${fileName.toLowerCase()} operations`;
    }
    
    // Utility patterns
    if (content.includes('export function') || content.includes('export const')) {
      return `Utility functions for ${fileName.toLowerCase()}`;
    }
    
    // Type definitions
    if (content.includes('interface') || content.includes('type ')) {
      return `Type definitions for ${fileName.toLowerCase()}`;
    }
    
    return `${fileName} module`;
  }

  categorizeFile(filePath, content) {
    // Pages (Next.js)
    if (filePath.includes('app/') && (filePath.includes('page.') || filePath.includes('layout.'))) {
      return 'pages';
    }
    
    // Components
    if (filePath.includes('components/') || (content.includes('JSX') && content.includes('return ('))) {
      return 'components';
    }
    
    // Hooks
    if (path.basename(filePath).startsWith('use') && (content.includes('useState') || content.includes('useEffect'))) {
      return 'hooks';
    }
    
    // Services
    if (filePath.includes('services/') || content.includes('fetch') || content.includes('axios')) {
      return 'services';
    }
    
    // Types
    if (filePath.includes('types/') || content.includes('interface') || content.includes('type ')) {
      return 'types';
    }
    
    // Config
    if (filePath.includes('config') || filePath.includes('.config.')) {
      return 'config';
    }
    
    // Default to utilities
    return 'utilities';
  }

  updateMetadata() {
    let totalFiles = 0;
    Object.keys(this.projectMap).forEach(category => {
      if (typeof this.projectMap[category] === 'object' && category !== 'metadata') {
        totalFiles += Object.keys(this.projectMap[category]).length;
      }
    });
    
    this.projectMap.metadata.totalFiles = totalFiles;
    this.projectMap.metadata.lastUpdate = new Date().toISOString();
  }

  saveMap() {
    fs.writeFileSync(this.mapPath, JSON.stringify(this.projectMap, null, 2));
  }

  // Check for existing functionality
  findSimilar(purpose, category) {
    const similar = [];
    
    Object.entries(this.projectMap[category] || {}).forEach(([path, info]) => {
      if (info.purpose.toLowerCase().includes(purpose.toLowerCase()) || 
          purpose.toLowerCase().includes(info.purpose.toLowerCase())) {
        similar.push({ path, purpose: info.purpose });
      }
    });
    
    return similar;
  }
}

// CLI usage
const filePath = process.argv[2];

if (filePath) {
  const updater = new ProjectMapUpdater();
  updater.updateFile(filePath);
} else {
  console.log('Usage: node scripts/update-project-map.js <file-path>');
}