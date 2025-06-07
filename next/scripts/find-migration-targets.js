#!/usr/bin/env node

/**
 * Migration Target Finder
 * Scans the codebase to find files that need to be migrated to the new PlatformContext
 */

const fs = require('fs');
const path = require('path');

// Patterns to search for
const MIGRATION_PATTERNS = [
  // Old context imports
  'useUniversalWallet',
  'useFarcasterContext',
  'useMiniApp',
  'useWalletProvider',
  'FarcasterWalletProvider',
  'MiniAppContext',
  
  // Old provider imports
  'AppProviders',
  'UniversalWalletContext',
  'FarcasterContext',
  
  // Old hook patterns
  'farcasterContext.isInMiniApp',
  'farcasterContext.walletAddress',
  'farcasterContext.user',
  'switchToOptimalChain',
  'connectFarcasterWallet',
];

// Directories to scan
const SCAN_DIRS = [
  'src/components',
  'src/hooks',
  'src/contexts',
  'src/pages',
  'src/app',
  'src/utils',
];

// Files to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'MIGRATION_GUIDE.md',
  'SimplifiedAppProviders.tsx',
  'PlatformContext.tsx',
  'UnifiedConnectButton.tsx',
  'find-migration-targets.js',
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];
    
    MIGRATION_PATTERNS.forEach(pattern => {
      if (content.includes(pattern)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(pattern)) {
            findings.push({
              pattern,
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      }
    });
    
    return findings;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath, results = []) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      
      if (shouldIgnoreFile(fullPath)) {
        return;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, results);
      } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
        const findings = scanFile(fullPath);
        if (findings.length > 0) {
          results.push({
            file: fullPath,
            findings,
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return results;
}

function generateMigrationReport(results) {
  console.log('\n🔍 MIGRATION TARGET ANALYSIS');
  console.log('=====================================\n');
  
  if (results.length === 0) {
    console.log('✅ No migration targets found! Your codebase is already clean.\n');
    return;
  }
  
  console.log(`📊 Found ${results.length} files that need migration:\n`);
  
  // Group by priority
  const highPriority = [];
  const mediumPriority = [];
  const lowPriority = [];
  
  results.forEach(result => {
    const hasContextImports = result.findings.some(f => 
      f.pattern.includes('Context') || f.pattern.includes('Provider')
    );
    const hasHookUsage = result.findings.some(f => 
      f.pattern.startsWith('use') || f.pattern.includes('farcasterContext.')
    );
    
    if (hasContextImports) {
      highPriority.push(result);
    } else if (hasHookUsage) {
      mediumPriority.push(result);
    } else {
      lowPriority.push(result);
    }
  });
  
  // High priority files (providers, contexts)
  if (highPriority.length > 0) {
    console.log('🔴 HIGH PRIORITY (Providers & Contexts):');
    highPriority.forEach(result => {
      console.log(`   📄 ${result.file}`);
      result.findings.forEach(finding => {
        console.log(`      Line ${finding.line}: ${finding.pattern}`);
      });
      console.log('');
    });
  }
  
  // Medium priority files (hook usage)
  if (mediumPriority.length > 0) {
    console.log('🟡 MEDIUM PRIORITY (Hook Usage):');
    mediumPriority.forEach(result => {
      console.log(`   📄 ${result.file}`);
      result.findings.forEach(finding => {
        console.log(`      Line ${finding.line}: ${finding.pattern}`);
      });
      console.log('');
    });
  }
  
  // Low priority files (other patterns)
  if (lowPriority.length > 0) {
    console.log('🟢 LOW PRIORITY (Other Patterns):');
    lowPriority.forEach(result => {
      console.log(`   📄 ${result.file}`);
      result.findings.forEach(finding => {
        console.log(`      Line ${finding.line}: ${finding.pattern}`);
      });
      console.log('');
    });
  }
  
  // Migration suggestions
  console.log('💡 MIGRATION SUGGESTIONS:');
  console.log('=====================================');
  console.log('1. Start with HIGH PRIORITY files (providers/contexts)');
  console.log('2. Update your app root to use SimplifiedAppProviders');
  console.log('3. Migrate components one by one using the migration guide');
  console.log('4. Test each component after migration');
  console.log('5. Remove old context files once migration is complete\n');
  
  console.log('📖 See MIGRATION_GUIDE.md for detailed instructions\n');
}

// Main execution
function main() {
  console.log('🚀 Scanning codebase for migration targets...\n');
  
  const results = [];
  
  SCAN_DIRS.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      console.log(`Scanning ${dir}...`);
      scanDirectory(fullPath, results);
    }
  });
  
  generateMigrationReport(results);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile, generateMigrationReport };
