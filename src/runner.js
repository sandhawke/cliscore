import { parseTestFile } from './parser.js';
import { Executor } from './executor.js';
import { matchOutput } from './matcher.js';

/**
 * @typedef {Object} TestResult
 * @property {string} file - Test file path
 * @property {number} passed - Number of passed tests
 * @property {number} failed - Number of failed tests
 * @property {TestFailure[]} failures - Details of failed tests
 * @property {TestPass[]} [passes] - Details of passed tests (for verbose mode)
 */

/**
 * @typedef {Object} TestFailure
 * @property {string} command - The failed command
 * @property {number} lineNumber - Line number in source file
 * @property {string} error - Error description
 * @property {string[]} [actualOutput] - Actual output received
 */

/**
 * @typedef {Object} TestPass
 * @property {string} command - The passed command
 * @property {number} lineNumber - Line number in source file
 */

/**
 * Run tests from a file
 * @param {string} filePath - Path to test file
 * @param {Object} options - Runner options
 * @param {string[]} [options.allowedLanguages] - Allowed markdown language identifiers
 * @returns {Promise<TestResult>}
 */
export async function runTestFile(filePath, options = {}) {
  const allowedLanguages = options.allowedLanguages || ['cliscore'];

  const testFile = await parseTestFile(filePath, allowedLanguages);
  const executor = new Executor({
    step: options.step || false
  });

  const result = {
    file: filePath,
    passed: 0,
    failed: 0,
    failures: [],
    passes: []
  };

  try {
    await executor.start();

    for (const test of testFile.tests) {
      const executionResult = await executor.execute(test);

      // Handle skipped tests in step mode
      if (executionResult.skipped) {
        if (executionResult.success) {
          result.passed++;
          if (options.step) {
            console.log('✓ Test marked as PASS (skipped)');
          }
        } else {
          result.failed++;
          result.failures.push({
            command: test.command,
            lineNumber: test.lineNumber,
            error: executionResult.skipReason || 'Skipped by user',
            actualOutput: executionResult.stdout,
            actualStderr: executionResult.stderr
          });
          if (options.step) {
            console.log('✗ Test marked as FAIL (skipped)');
          }
        }
        continue;
      }

      const matchResult = matchOutput(
        executionResult.stdout,
        executionResult.stderr,
        test.expectedOutput
      );

      if (matchResult.success) {
        result.passed++;
        result.passes.push({
          command: test.command,
          lineNumber: test.lineNumber
        });
        if (options.step) {
          console.log('✓ Test PASSED');
        }
      } else {
        result.failed++;
        result.failures.push({
          command: test.command,
          lineNumber: test.lineNumber,
          error: matchResult.error || 'Unknown error',
          actualOutput: executionResult.stdout,
          actualStderr: executionResult.stderr
        });
        if (options.step) {
          console.log('✗ Test FAILED');
          console.log('\nFailure details:');
          console.log(matchResult.error);
        }
      }
    }
  } finally {
    executor.close();
  }

  return result;
}

/**
 * Run tests from multiple files
 * @param {string[]} filePaths - Paths to test files
 * @param {Object} options - Runner options
 * @param {number} [options.jobs=1] - Number of test files to run in parallel
 * @returns {Promise<TestResult[]>}
 */
export async function runTestFiles(filePaths, options = {}) {
  const jobs = options.jobs || 1;

  if (jobs === 1) {
    // Sequential execution
    const results = [];
    for (const filePath of filePaths) {
      try {
        const result = await runTestFile(filePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          file: filePath,
          passed: 0,
          failed: 1,
          failures: [{
            command: '',
            lineNumber: 0,
            error: `Failed to run test file: ${error.message}`
          }]
        });
      }
    }
    return results;
  }

  // Parallel execution with limited concurrency
  const results = new Array(filePaths.length);
  let index = 0;
  let activeWorkers = 0;

  return new Promise((resolve) => {
    const runNext = () => {
      while (activeWorkers < jobs && index < filePaths.length) {
        const currentIndex = index;
        const filePath = filePaths[index];
        index++;
        activeWorkers++;

        runTestFile(filePath, options)
          .then(result => {
            results[currentIndex] = result;
          })
          .catch(error => {
            results[currentIndex] = {
              file: filePath,
              passed: 0,
              failed: 1,
              failures: [{
                command: '',
                lineNumber: 0,
                error: `Failed to run test file: ${error.message}`
              }]
            };
          })
          .finally(() => {
            activeWorkers--;
            if (index >= filePaths.length && activeWorkers === 0) {
              resolve(results);
            } else {
              runNext();
            }
          });
      }
    };

    runNext();
  });
}

/**
 * Format test results for display
 * @param {TestResult[]} results - Test results
 * @param {number} verbosity - Verbosity level (0=quiet, 1=normal, 2=verbose, 3=very verbose)
 * @returns {string}
 */
export function formatResults(results, verbosity = 1) {
  const output = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;

    const total = result.passed + result.failed;
    const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';

    // Quiet mode: one line per file with percentage
    if (verbosity === 0) {
      const status = result.failed === 0 ? '✓' : '✗';
      output.push(`${status} ${result.file}: ${passRate}% (${result.passed}/${total})`);
      continue;
    }

    // Verbose mode: show all tests (passing and failing)
    if (verbosity >= 2) {
      output.push(`\n${result.file}:`);

      // Show all passing tests
      if (result.passes && result.passes.length > 0) {
        for (const pass of result.passes) {
          const cmdPreview = pass.command.split('\n')[0].substring(0, 60);
          output.push(`  ✓ Line ${pass.lineNumber}: ${cmdPreview}`);
        }
      }

      // Show all failing tests
      if (result.failed > 0) {
        for (const failure of result.failures) {
          const cmdPreview = failure.command.split('\n')[0].substring(0, 60);
          output.push(`  ✗ Line ${failure.lineNumber}: ${cmdPreview}`);
          if (verbosity >= 3) {
            output.push(`    ${failure.error}`);
          }
        }
      }
      continue;
    }

    // Normal mode: only show failures
    if (result.failed > 0) {
      output.push(`\n${result.file}:`);

      for (const failure of result.failures) {
        output.push(`  ✗ Line ${failure.lineNumber}: ${failure.command}`);
        output.push(`    ${failure.error}`);

        if (failure.actualOutput && failure.actualOutput.length > 0) {
          output.push(`    Actual output:`);
          for (const line of failure.actualOutput) {
            output.push(`      ${line}`);
          }
        }
      }
    }
  }

  // Summary
  const total = totalPassed + totalFailed;
  const passRate = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0';

  if (verbosity === 0) {
    // Quiet mode: just add summary line
    if (totalFailed === 0) {
      output.push(`✓ All tests passed! (${totalPassed}/${total})`);
    } else {
      output.push(`✗ ${totalFailed} test${totalFailed !== 1 ? 's' : ''} failed, ${totalPassed} passed (${passRate}% pass rate)`);
    }
  } else {
    // Normal and verbose modes: add separator
    output.push('');
    output.push('═'.repeat(60));

    if (totalFailed === 0) {
      output.push(`✓ All tests passed! (${totalPassed}/${total})`);
    } else {
      output.push(`✗ ${totalFailed} test${totalFailed !== 1 ? 's' : ''} failed, ${totalPassed} passed (${passRate}% pass rate)`);
    }
  }

  return output.join('\n');
}

/**
 * Get summary statistics from test results
 * @param {TestResult[]} results - Test results
 * @returns {Object}
 */
export function getSummary(results) {
  let totalPassed = 0;
  let totalFailed = 0;
  let totalFiles = results.length;
  let filesWithFailures = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    if (result.failed > 0) {
      filesWithFailures++;
    }
  }

  return {
    totalFiles,
    filesWithFailures,
    totalPassed,
    totalFailed,
    totalTests: totalPassed + totalFailed,
    passRate: totalPassed + totalFailed > 0
      ? (totalPassed / (totalPassed + totalFailed)) * 100
      : 0
  };
}
