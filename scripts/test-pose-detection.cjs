#!/usr/bin/env node

/**
 * Test script for pose detection across different platforms
 * Runs tests with various configurations and device emulations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configurations
const testSuites = {
  'pose-detection': {
    description: 'Core pose detection functionality',
    files: ['e2e/pose-detection.spec.ts'],
  },
  'device-compatibility': {
    description: 'Device-specific compatibility tests',
    files: ['e2e/pose-detection.spec.ts'],
    grep: '@device',
  },
  performance: {
    description: 'Performance monitoring and optimization',
    files: ['e2e/pose-detection.spec.ts'],
    grep: '@performance',
  },
  'error-handling': {
    description: 'Error scenarios and recovery',
    files: ['e2e/pose-detection.spec.ts'],
    grep: '@error',
  },
};

const platforms = {
  desktop: ['chromium', 'firefox', 'webkit'],
  mobile: ['Mobile Chrome', 'Mobile Safari'],
  tablet: ['iPad', 'Android Tablet'],
  'low-end': ['Low-end Mobile'],
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: 'pose-detection',
    platform: 'all',
    headless: true,
    update: false,
    debug: false,
    reporter: 'list',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--suite':
        options.suite = args[++i];
        break;
      case '--platform':
        options.platform = args[++i];
        break;
      case '--headed':
        options.headless = false;
        break;
      case '--update':
        options.update = true;
        break;
      case '--debug':
        options.debug = true;
        options.reporter = 'list';
        break;
      case '--reporter':
        options.reporter = args[++i];
        break;
      case '--help':
        console.log(`
Usage: node test-pose-detection.js [options]

Options:
  --suite <name>     Test suite to run (pose-detection, device-compatibility, performance, error-handling)
  --platform <type>  Platform to test (desktop, mobile, tablet, low-end, all)
  --headed          Run tests in headed mode
  --update          Update snapshots
  --debug           Run in debug mode
  --reporter <type> Test reporter (list, dot, line, json, html)
  --help            Show this help

Examples:
  node test-pose-detection.js --suite pose-detection --platform desktop
  node test-pose-detection.js --suite performance --headed
  node test-pose-detection.js --platform mobile --debug
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Build Playwright command
 */
function buildCommand(suite, platformConfig, options) {
  const config = testSuites[suite];
  if (!config) {
    throw new Error(`Unknown test suite: ${suite}`);
  }

  let command = 'npx playwright test';

  // Add test files
  command += ' ' + config.files.join(' ');

  // Add grep filter if specified
  if (config.grep) {
    command += ` --grep "${config.grep}"`;
  }

  // Add project filter for platform
  if (platformConfig && platformConfig.length) {
    command += ` --project ${platformConfig.join(' --project ')}`;
  }

  // Add options
  if (options.headless) {
    command += ' --headed=false';
  } else {
    command += ' --headed';
  }

  if (options.update) {
    command += ' --update-snapshots';
  }

  if (options.debug) {
    command += ' --debug';
  }

  command += ` --reporter=${options.reporter}`;

  // Environment variables
  const env = {
    ...process.env,
    CI: process.env.CI || 'false',
    BROWSER: platformConfig?.[0] || 'chromium',
  };

  return { command, env };
}

/**
 * Run tests and handle results
 */
function runTest(command, env, description) {
  console.log(`\n🧪 Running: ${description}`);
  console.log(`Command: ${command}\n`);

  try {
    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      cwd: process.cwd(),
    });
    console.log(`✅ Passed: ${description}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${description}`);
    console.log(`Exit code: ${error.status}\n`);
    return false;
  }
}

/**
 * Generate test report
 */
function generateReport(results) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.description}`);
      });
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'test-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: { total, passed, failed, successRate: Math.round((passed / total) * 100) },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  console.log('='.repeat(60) + '\n');

  return failed === 0;
}

/**
 * Main execution
 */
function main() {
  const options = parseArgs();
  const results = [];

  console.log('🚀 Starting Pose Detection Tests');
  console.log(`Suite: ${options.suite}`);
  console.log(`Platform: ${options.platform}`);
  console.log(`Mode: ${options.headless ? 'Headless' : 'Headed'}\n`);

  // Determine platforms to test
  const platformsToTest = options.platform === 'all' ? Object.keys(platforms) : [options.platform];

  // Run tests for each platform
  for (const platform of platformsToTest) {
    const platformConfig = platforms[platform];
    if (!platformConfig) {
      console.error(`Unknown platform: ${platform}`);
      continue;
    }

    const { command, env } = buildCommand(options.suite, platformConfig, options);
    const description = `${testSuites[options.suite].description} on ${platform}`;

    const passed = runTest(command, env, description);
    results.push({
      platform,
      suite: options.suite,
      description,
      command,
      passed,
      timestamp: new Date().toISOString(),
    });
  }

  // Generate report
  const allPassed = generateReport(results);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 Unhandled Rejection:', reason);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main();
}
