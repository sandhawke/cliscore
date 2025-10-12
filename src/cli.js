#!/usr/bin/env node

import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { parseTestFile } from './parser.js';
import { runTestFiles, formatResults, getSummary } from './runner.js';
import { loadConfig, mergeConfig } from './config.js';

/**
 * Parse command-line arguments
 * @param {string[]} args - Command-line arguments
 * @returns {Object}
 */
function parseArgs(args) {
  const options = {
    json: false,
    dryRun: false,
    step: false,
    percent: false,
    verbosity: 1, // 0=quiet, 1=normal, 2=verbose, 3=very verbose
    allowedLanguages: ['cliscore'],
    files: [],
    jobs: 1
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--step') {
      options.step = true;
    } else if (arg === '--percent') {
      options.percent = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbosity = 0;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbosity = 2;
    } else if (arg === '-vv') {
      options.verbosity = 3;
    } else if (arg === '--fast') {
      options.jobs = 8;
    } else if (arg === '--jobs' || arg === '-j') {
      if (i + 1 >= args.length) {
        console.error('Error: --jobs requires a number');
        process.exit(1);
      }
      const jobs = parseInt(args[++i], 10);
      if (isNaN(jobs) || jobs < 1) {
        console.error('Error: --jobs must be a positive number');
        process.exit(1);
      }
      options.jobs = jobs;
    } else if (arg === '--allow-lang' && i + 1 < args.length) {
      options.allowedLanguages.push(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
cliscore - A test runner for command-line interfaces

Usage: cliscore [options] <test-files...>

Options:
  --json              Output results as JSON
  --dry-run           Parse tests but don't execute them
  --step              Interactive mode: prompt before each command, show output after
  --percent           Output only the pass percentage (e.g., "95.5")
  -q, --quiet         Quiet: one line per file with pass rate
  -v, --verbose       Verbose: show all tests (one line per test)
  -vv                 Very verbose: show all tests with full error details
  --jobs N, -j N      Run N test files in parallel (default: 1)
  --fast              Run tests in parallel with 8 jobs (equivalent to --jobs 8)
  --allow-lang <lang> Allow additional markdown language identifier (can be used multiple times)
  -h, --help          Show this help message

Test Files:
  Supports .t (UTF format), .md (markdown with code blocks), and .cliscore files.
  Glob patterns are supported (e.g., tests/**/*.md)

Examples:
  cliscore tests/basic.t
  cliscore tests/**/*.md
  cliscore --step tests/basic.t
  cliscore --fast tests/**/*.md
  cliscore --jobs 4 tests/**/*.t
  cliscore --json --dry-run tests/example.md
  cliscore --allow-lang shell-session tests/**/*.md
`);
}

/**
 * Expand glob patterns and find test files
 * @param {string[]} patterns - File patterns
 * @returns {Promise<string[]>}
 */
async function findTestFiles(patterns) {
  const files = new Set();

  for (const pattern of patterns) {
    // Simple glob expansion - handle basic patterns
    if (pattern.includes('*')) {
      const expanded = await expandGlob(pattern);
      for (const file of expanded) {
        files.add(file);
      }
    } else {
      // Direct file path
      files.add(resolve(pattern));
    }
  }

  return Array.from(files);
}

/**
 * Expand a glob pattern (simple implementation)
 * @param {string} pattern - Glob pattern
 * @returns {Promise<string[]>}
 */
async function expandGlob(pattern) {
  const files = [];

  // Extract the directory and pattern parts
  const parts = pattern.split('/');
  let basePath = '.';
  let patternParts = parts;

  // Find the first part with a wildcard
  const firstWildcardIndex = parts.findIndex(p => p.includes('*'));
  if (firstWildcardIndex > 0) {
    basePath = parts.slice(0, firstWildcardIndex).join('/');
    patternParts = parts.slice(firstWildcardIndex);
  }

  // Recursively search
  await searchDirectory(basePath, patternParts, files);

  return files;
}

/**
 * Check if a directory should be ignored
 * @param {string} dirname - Directory name
 * @returns {boolean}
 */
function shouldIgnoreDirectory(dirname) {
  const ignoreDirs = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'coverage',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'out',
    'vendor',
    'fixtures'
  ];
  return ignoreDirs.includes(dirname) || dirname.startsWith('.');
}

/**
 * Recursively search directory for matching files
 * @param {string} dir - Current directory
 * @param {string[]} patternParts - Remaining pattern parts
 * @param {string[]} results - Accumulator for results
 */
async function searchDirectory(dir, patternParts, results) {
  if (patternParts.length === 0) {
    return;
  }

  try {
    const entries = await readdir(dir);
    const currentPattern = patternParts[0];
    const remainingParts = patternParts.slice(1);

    for (const entry of entries) {
      // Skip ignored directories
      if (shouldIgnoreDirectory(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (currentPattern === '**') {
        // Recursive wildcard
        if (stats.isDirectory()) {
          // Continue with ** pattern for subdirectories
          await searchDirectory(fullPath, patternParts, results);
          // Also try matching with remaining patterns
          if (remainingParts.length > 0) {
            await searchDirectory(fullPath, remainingParts, results);
          }
        } else if (remainingParts.length === 0) {
          // ** at the end matches all files
          if (isTestFile(entry)) {
            results.push(fullPath);
          }
        } else if (remainingParts.length > 0) {
          // ** in the middle - try matching file against remaining patterns
          const nextPattern = remainingParts[0];
          if (matchPattern(entry, nextPattern) && remainingParts.length === 1) {
            // File matches the pattern after **
            if (isTestFile(entry)) {
              results.push(fullPath);
            }
          }
        }
      } else if (matchPattern(entry, currentPattern)) {
        if (remainingParts.length === 0) {
          // Final pattern part - this should be a file
          if (stats.isFile() && isTestFile(entry)) {
            results.push(fullPath);
          }
        } else if (stats.isDirectory()) {
          // Continue with remaining patterns
          await searchDirectory(fullPath, remainingParts, results);
        }
      }
    }
  } catch (err) {
    // Ignore errors (e.g., permission denied)
  }
}

/**
 * Check if a filename matches a pattern
 * @param {string} name - Filename
 * @param {string} pattern - Pattern with * and ?
 * @returns {boolean}
 */
function matchPattern(name, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regex}$`).test(name);
}

/**
 * Check if a file is a test file based on extension
 * @param {string} filename - Filename
 * @returns {boolean}
 */
function isTestFile(filename) {
  return filename.endsWith('.t') || filename.endsWith('.md') || filename.endsWith('.cliscore');
}

/**
 * Main entry point
 */
async function main() {
  // Load configuration file
  let config = {};
  try {
    config = await loadConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  // Parse CLI arguments
  const cliOptions = parseArgs(process.argv.slice(2));

  // Merge config: defaults < cliscore.json < CLI args
  const options = mergeConfig(config, cliOptions);

  // Add non-config options from CLI
  options.json = cliOptions.json;
  options.dryRun = cliOptions.dryRun;
  options.step = cliOptions.step;
  options.percent = cliOptions.percent;
  options.verbosity = cliOptions.verbosity;
  options.files = cliOptions.files;

  // Default pattern if no files specified
  if (options.files.length === 0) {
    options.files = ['**/*.t', '**/*.md', '**/*.cliscore'];
  }

  const testFiles = await findTestFiles(options.files);

  if (testFiles.length === 0) {
    console.error('Error: No test files found');
    process.exit(1);
  }

  if (options.dryRun) {
    // Dry run: just parse and output the structure
    const parsedFiles = [];

    for (const filePath of testFiles) {
      try {
        const testFile = await parseTestFile(filePath, options.allowedLanguages);
        parsedFiles.push(testFile);
      } catch (error) {
        console.error(`Error parsing ${filePath}: ${error.message}`);
        process.exit(1);
      }
    }

    if (options.json) {
      console.log(JSON.stringify(parsedFiles, null, 2));
    } else {
      console.log(`Parsed ${parsedFiles.length} test file(s):`);
      for (const file of parsedFiles) {
        console.log(`\n${file.path}:`);
        console.log(`  ${file.tests.length} test(s)`);
        for (const test of file.tests) {
          console.log(`    Line ${test.lineNumber}: ${test.command.split('\n')[0]}`);
        }
      }
    }
  } else {
    // Step mode requires sequential execution
    if (options.step && options.jobs > 1) {
      console.error('Warning: --step mode requires sequential execution, setting --jobs 1');
      options.jobs = 1;
    }

    // Run the tests
    const results = await runTestFiles(testFiles, {
      allowedLanguages: options.allowedLanguages,
      jobs: options.jobs,
      step: options.step
    });

    const summary = getSummary(results);

    if (options.percent) {
      // Only output the percentage
      console.log(summary.passRate.toFixed(1));
    } else if (options.json) {
      console.log(JSON.stringify({ summary, results }, null, 2));
    } else {
      console.log(formatResults(results, options.verbosity));
    }

    // Exit with error code if any tests failed
    if (summary.totalFailed > 0) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
