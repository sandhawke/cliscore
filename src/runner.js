import { parseTestFile } from './parser.js';
import { Executor } from './executor.js';
import { matchOutput } from './matcher.js';

/**
 * @typedef {Object} TestResult
 * @property {string} file - Test file path
 * @property {number} passed - Number of passed tests
 * @property {number} failed - Number of failed tests
 * @property {TestFailure[]} failures - Details of failed tests
 */

/**
 * @typedef {Object} TestFailure
 * @property {string} command - The failed command
 * @property {number} lineNumber - Line number in source file
 * @property {string} error - Error description
 * @property {string[]} [actualOutput] - Actual output received
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
  const executor = new Executor();

  const result = {
    file: filePath,
    passed: 0,
    failed: 0,
    failures: []
  };

  try {
    await executor.start();

    for (const test of testFile.tests) {
      const executionResult = await executor.execute(test);

      const matchResult = matchOutput(
        executionResult.stdout,
        executionResult.stderr,
        test.expectedOutput
      );

      if (matchResult.success) {
        result.passed++;
      } else {
        result.failed++;
        result.failures.push({
          command: test.command,
          lineNumber: test.lineNumber,
          error: matchResult.error || 'Unknown error',
          actualOutput: executionResult.stdout,
          actualStderr: executionResult.stderr
        });
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
 * @returns {string}
 */
export function formatResults(results) {
  const output = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;

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
  output.push('');
  output.push('═'.repeat(60));

  const total = totalPassed + totalFailed;
  const passRate = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0';

  if (totalFailed === 0) {
    output.push(`✓ All tests passed! (${totalPassed}/${total})`);
  } else {
    output.push(`✗ ${totalFailed} test${totalFailed !== 1 ? 's' : ''} failed, ${totalPassed} passed (${passRate}% pass rate)`);
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
