#!/usr/bin/env node

import { readdir, stat, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTestFile } from './parser.js';
import { runTestFiles, formatResults, getSummary } from './runner.js';
import { loadConfig, mergeConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m${seconds}s`;
  }
}

/**
 * Parse command-line arguments
 * @param {string[]} args - Command-line arguments
 * @returns {Object}
 */
function parseArgs(args) {
  const options = {
    json: false,
    dryRun: false,
    step: true, // Step mode is now the default
    percent: false,
    verbosity: 1, // 0=quiet, 1=normal, 2=verbose, 3=very verbose
    allowedLanguages: ['console', 'cliscore'],
    files: [],
    jobs: 1,
    shell: undefined,
    show: 1, // Number of failures to show in detail (default: 1)
    timeout: 30, // Timeout in seconds per test (default: 30)
    debug: false, // Debug mode: show test summaries
    trace: false, // Trace mode: show all I/O events
    progress: false, // Progress mode: show real-time progress
    saveDir: null // Directory to save detailed test results
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--step') {
      options.step = true;
    } else if (arg === '--run') {
      options.step = false;
    } else if (arg === '--percent') {
      options.percent = true;
      options.step = false; // --percent implies --run
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbosity = 0;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbosity = 2;
    } else if (arg === '-vv') {
      options.verbosity = 3;
    } else if (arg === '-vvv') {
      options.verbosity = 4;
    } else if (arg === '--fast') {
      options.jobs = 8;
      options.step = false; // --fast implies --run
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
    } else if (arg === '--shell') {
      if (i + 1 >= args.length) {
        console.error('Error: --shell requires a path');
        process.exit(1);
      }
      options.shell = args[++i];
    } else if (arg === '--show') {
      if (i + 1 >= args.length) {
        console.error('Error: --show requires a number or "all"');
        process.exit(1);
      }
      const value = args[++i];
      if (value === 'all' || value === '-1') {
        options.show = -1;
      } else {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          console.error('Error: --show must be a non-negative number or "all"');
          process.exit(1);
        }
        options.show = num;
      }
    } else if (arg === '--timeout') {
      if (i + 1 >= args.length) {
        console.error('Error: --timeout requires a number (seconds)');
        process.exit(1);
      }
      const timeout = parseInt(args[++i], 10);
      if (isNaN(timeout) || timeout < 1) {
        console.error('Error: --timeout must be a positive number');
        process.exit(1);
      }
      options.timeout = timeout;
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '--trace') {
      options.trace = true;
      options.debug = true; // trace implies debug
    } else if (arg === '--progress') {
      options.progress = true;
    } else if (arg.startsWith('--save=')) {
      options.saveDir = arg.slice(7);
    } else if (arg === '--save') {
      if (i + 1 >= args.length) {
        console.error('Error: --save requires a directory path');
        process.exit(1);
      }
      options.saveDir = args[++i];
    } else if (arg === '--version' || arg === '-V') {
      options.showVersion = true;
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
 * Print version information
 */
async function printVersion() {
  try {
    const packagePath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf-8'));
    console.log(`cliscore v${packageJson.version}`);
  } catch (error) {
    console.log('cliscore (version unknown)');
  }
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
  (default)           Interactive step mode: prompt before each test, show output
  --run               Non-interactive: run all tests without stopping
  --percent           Output only the pass percentage (e.g., "95.5")
  -q, --quiet         Quiet: only summary line
  (default)           One line per file with pass rate
  -v, --verbose       Show failures with details
  -vv                 Show all tests (one line per test)
  -vvv                Show all tests with full error details
  --jobs N, -j N      Run N test files in parallel (default: 1)
  --fast              Run tests in parallel with 8 jobs (equivalent to --jobs 8)
  --allow-lang <lang> Allow additional markdown language identifier (can be used multiple times)
  --shell <path>      Shell to use for executing commands (default: /bin/sh)
  --show N            Show details for first N failures (default: 1, use "all" or -1 for all)
  --timeout N         Timeout in seconds per test (default: 30)
  --save <dir>        Save detailed test results to directory (creates if needed)
  --debug             Debug mode: show summary of what happened with each test
  --trace             Trace mode: show all I/O events (read/write to shell)
  --progress          Show real-time progress as files complete
  -V, --version       Show version number
  -h, --help          Show this help message

Test Files:
  Supports .t (UTF format), .md (markdown with code blocks), and .cliscore files.
  Glob patterns are supported (e.g., tests/**/*.md)

Examples:
  cliscore tests/basic.t                                 (interactive step mode)
  cliscore --run tests/**/*.md                          (non-interactive)
  cliscore --run --fast tests/**/*.md                   (parallel non-interactive)
  cliscore --run --jobs 4 tests/**/*.t                  (4 parallel jobs)
  cliscore --json --dry-run tests/example.md
  cliscore --allow-lang shell-session tests/**/*.md
`);
}

/**
 * Expand glob patterns and find test files
 * @param {string[]} patterns - File patterns
 * @param {string[]} ignoredDirectories - Directory names to ignore
 * @returns {Promise<string[]>}
 */
async function findTestFiles(patterns, ignoredDirectories) {
  const files = new Set();

  for (const pattern of patterns) {
    // Simple glob expansion - handle basic patterns
    if (pattern.includes('*')) {
      const expanded = await expandGlob(pattern, ignoredDirectories);
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
 * @param {string[]} ignoredDirectories - Directory names to ignore
 * @returns {Promise<string[]>}
 */
async function expandGlob(pattern, ignoredDirectories) {
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
  await searchDirectory(basePath, patternParts, files, ignoredDirectories);

  return files;
}

/**
 * Check if a directory should be ignored
 * @param {string} dirname - Directory name
 * @param {string[]} ignoredDirectories - List of directory names to ignore
 * @returns {boolean}
 */
function shouldIgnoreDirectory(dirname, ignoredDirectories) {
  return ignoredDirectories.includes(dirname) || dirname.startsWith('.');
}

/**
 * Recursively search directory for matching files
 * @param {string} dir - Current directory
 * @param {string[]} patternParts - Remaining pattern parts
 * @param {string[]} results - Accumulator for results
 * @param {string[]} ignoredDirectories - Directory names to ignore
 */
async function searchDirectory(dir, patternParts, results, ignoredDirectories) {
  if (patternParts.length === 0) {
    return;
  }

  try {
    const entries = await readdir(dir);
    const currentPattern = patternParts[0];
    const remainingParts = patternParts.slice(1);

    for (const entry of entries) {
      // Skip ignored directories
      if (shouldIgnoreDirectory(entry, ignoredDirectories)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (currentPattern === '**') {
        // Recursive wildcard
        if (stats.isDirectory()) {
          // Continue with ** pattern for subdirectories
          await searchDirectory(fullPath, patternParts, results, ignoredDirectories);
          // Also try matching with remaining patterns
          if (remainingParts.length > 0) {
            await searchDirectory(fullPath, remainingParts, results, ignoredDirectories);
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
          await searchDirectory(fullPath, remainingParts, results, ignoredDirectories);
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

  // Handle --version flag
  if (cliOptions.showVersion) {
    await printVersion();
    process.exit(0);
  }

  // Merge config: defaults < cliscore.json < CLI args
  const options = mergeConfig(config, cliOptions);

  // Add non-config options from CLI
  options.json = cliOptions.json;
  options.dryRun = cliOptions.dryRun;
  options.step = cliOptions.step;
  options.percent = cliOptions.percent;
  options.verbosity = cliOptions.verbosity;
  options.files = cliOptions.files;
  options.show = cliOptions.show;
  options.timeout = cliOptions.timeout;
  options.debug = cliOptions.debug;
  options.trace = cliOptions.trace;
  options.progress = cliOptions.progress;

  // Default pattern if no files specified
  if (options.files.length === 0) {
    options.files = ['**/*.t', '**/*.md', '**/*.cliscore'];
  }

  const testFiles = await findTestFiles(options.files, options.ignoredDirectories);

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
      step: options.step,
      verbosity: options.verbosity,
      shell: options.shell,
      timeout: options.timeout,
      debug: options.debug,
      trace: options.trace,
      progress: options.progress,
      totalFiles: testFiles.length,
      json: options.json,
      saveDir: options.saveDir,
      // Stream output for quiet/default modes (but not debug/trace)
      onFileComplete: (options.verbosity <= 1 && !options.json && !options.percent && !options.debug && !options.trace)
        ? (result, index, total, duration) => {
            const testTotal = result.passed + result.failed;
            const passRate = testTotal > 0 ? ((result.passed / testTotal) * 100).toFixed(1) : '0.0';

            if (options.progress) {
              // Progress mode: [N/total] file (duration) status
              const status = result.failed === 0 ? '✓' : '✗';
              const durationStr = duration ? ` (${formatDuration(duration)})` : '';
              console.log(`[${index + 1}/${total}] ${result.file}${durationStr} ${status}`);
            } else if (options.verbosity === 1) {
              // Default: one line per file
              const status = result.failed === 0 ? '✓' : '✗';
              console.log(`${status} ${result.file}: ${passRate}% (${result.passed}/${testTotal})`);
            }
            // Quiet mode (0): print nothing per file
          }
        : null
    });

    const summary = getSummary(results);

    if (options.percent) {
      // Only output the percentage
      console.log(summary.passRate.toFixed(1));
    } else if (options.json) {
      console.log(JSON.stringify({ summary, results }, null, 2));
    } else {
      const wasStreamed = options.verbosity <= 1 && !options.debug && !options.trace;
      console.log(formatResults(results, options.verbosity, wasStreamed, options.show, options.debug));
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
