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
 * @property {Object} [runFirst] - Output from run_first function
 * @property {Object} [runLast] - Output from run_last function
 */

/**
 * @typedef {Object} TestFailure
 * @property {string} command - The failed command
 * @property {number} lineNumber - Line number in source file
 * @property {string} error - Error description
 * @property {string[]} [actualOutput] - Actual output received
 * @property {number} durationMs - Execution duration in milliseconds
 */

/**
 * @typedef {Object} TestPass
 * @property {string} command - The passed command
 * @property {number} lineNumber - Line number in source file
 * @property {number} durationMs - Execution duration in milliseconds
 */

/**
 * Run tests from a file
 * @param {string} filePath - Path to test file
 * @param {Object} options - Runner options
 * @param {string[]} [options.allowedLanguages] - Allowed markdown language identifiers
 * @returns {Promise<TestResult>}
 */
export async function runTestFile(filePath, options = {}) {
  const allowedLanguages = options.allowedLanguages || ['console', 'cliscore'];

  const testFile = await parseTestFile(filePath, allowedLanguages);
  const executor = new Executor({
    step: options.step || false,
    shell: options.shell,
    timeout: options.timeout || 30
  });

  const result = {
    file: filePath,
    passed: 0,
    failed: 0,
    failures: [],
    passes: []
  };

  try {
    // Execute run_first if defined
    if (executor.setupScript) {
      const runFirstScript = executor.setupScript + '\ntype run_first >/dev/null 2>&1 && run_first';
      try {
        const runFirstResult = await executor.executeInSeparateShell(runFirstScript);
        result.runFirst = runFirstResult;

        // If run_first fails with non-zero exit, report warning but continue
        if (runFirstResult.exitCode !== 0) {
          if (options.verbosity >= 2) {
            console.warn(`Warning: run_first exited with code ${runFirstResult.exitCode}`);
          }
        }
      } catch (err) {
        if (options.verbosity >= 2) {
          console.warn(`Warning: run_first failed: ${err.message}`);
        }
      }
    }

    await executor.start();

    for (const test of testFile.tests) {
      const executionResult = await executor.execute(test);

      // If there was an execution error (timeout or shell death), mark as failed
      if (executionResult.error) {
        result.failed++;
        result.failures.push({
          command: test.command,
          lineNumber: test.lineNumber,
          error: executionResult.error,
          actualOutput: executionResult.stdout || [],
          actualStderr: executionResult.stderr || [],
          durationMs: executionResult.durationMs
        });

        // If shell died, remaining tests will also fail
        if (executionResult.error.includes('Shell died') || executionResult.error.includes('Timeout')) {
          // Continue to process remaining tests - they will all get "Shell died" errors
        }
        continue;
      }

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
            actualStderr: executionResult.stderr,
            durationMs: executionResult.durationMs
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
          lineNumber: test.lineNumber,
          durationMs: executionResult.durationMs
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
          actualStderr: executionResult.stderr,
          durationMs: executionResult.durationMs
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

    // Execute run_last if defined (always runs, even if shell crashed)
    if (executor.setupScript) {
      const runLastScript = executor.setupScript + '\ntype run_last >/dev/null 2>&1 && run_last';
      try {
        const runLastResult = await executor.executeInSeparateShell(runLastScript);
        result.runLast = runLastResult;

        // If run_last fails with non-zero exit, report warning
        if (runLastResult.exitCode !== 0) {
          if (options.verbosity >= 2) {
            console.warn(`Warning: run_last exited with code ${runLastResult.exitCode}`);
          }
        }
      } catch (err) {
        if (options.verbosity >= 2) {
          console.warn(`Warning: run_last failed: ${err.message}`);
        }
      }
    }
  }

  // Stream output for quiet/default modes if callback provided
  if (options.onFileComplete && options.verbosity <= 1) {
    options.onFileComplete(result);
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
 * @param {number} verbosity - Verbosity level (0=quiet, 1=default, 2=verbose, 3=very verbose, 4=all details)
 * @param {boolean} streamed - Whether results were already streamed
 * @param {number} showFailures - Number of failures to show in detail (-1 = all, default: 1)
 * @returns {string}
 */
export function formatResults(results, verbosity = 1, streamed = false, showFailures = 1) {
  const output = [];
  let totalPassed = 0;
  let totalFailed = 0;
  const allFailures = [];

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;

    // Collect all failures for later display
    if (result.failures && result.failures.length > 0) {
      for (const failure of result.failures) {
        allFailures.push({
          file: result.file,
          ...failure
        });
      }
    }

    const total = result.passed + result.failed;
    const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';

    // Level 0 (quiet): nothing per file, just summary at end
    if (verbosity === 0) {
      continue;
    }

    // Level 1 (default): one line per file with pass rate
    // Skip if already streamed
    if (verbosity === 1) {
      if (!streamed) {
        const status = result.failed === 0 ? '✓' : '✗';
        output.push(`${status} ${result.file}: ${passRate}% (${result.passed}/${total})`);
      }
      continue;
    }

    // Level 2 (verbose): show failures with details
    if (verbosity === 2) {
      if (result.failed > 0 || result.runFirst || result.runLast) {
        output.push(`\n${result.file}:`);

        // Show run_first timing if present
        if (result.runFirst) {
          const duration = formatDuration(result.runFirst.durationMs);
          const status = result.runFirst.exitCode === 0 ? '✓' : '✗';
          output.push(`  ${status} run_first() (${duration})`);
          if (result.runFirst.exitCode !== 0) {
            output.push(`    Exit code: ${result.runFirst.exitCode}`);
          }
        }

        // Show failures
        for (const failure of result.failures) {
          const duration = formatDuration(failure.durationMs);
          output.push(`  ✗ Line ${failure.lineNumber}: ${failure.command} (${duration})`);
          output.push(`    ${failure.error}`);

          if (failure.actualOutput && failure.actualOutput.length > 0) {
            output.push(`    Actual output:`);
            for (const line of failure.actualOutput) {
              output.push(`      ${line}`);
            }
          }
        }

        // Show run_last timing if present
        if (result.runLast) {
          const duration = formatDuration(result.runLast.durationMs);
          const status = result.runLast.exitCode === 0 ? '✓' : '✗';
          output.push(`  ${status} run_last() (${duration})`);
          if (result.runLast.exitCode !== 0) {
            output.push(`    Exit code: ${result.runLast.exitCode}`);
          }
        }
      }
      continue;
    }

    // Level 3 (very verbose -vv): one line per test
    if (verbosity === 3) {
      output.push(`\n${result.file}:`);

      // Show run_first timing if present
      if (result.runFirst) {
        const duration = formatDuration(result.runFirst.durationMs);
        const status = result.runFirst.exitCode === 0 ? '✓' : '✗';
        output.push(`  ${status} run_first() (${duration})`);
      }

      // Show all passing tests
      if (result.passes && result.passes.length > 0) {
        for (const pass of result.passes) {
          const cmdPreview = pass.command.split('\n')[0].substring(0, 60);
          const duration = formatDuration(pass.durationMs);
          output.push(`  ✓ Line ${pass.lineNumber}: ${cmdPreview} (${duration})`);
        }
      }

      // Show all failing tests
      if (result.failed > 0) {
        for (const failure of result.failures) {
          const cmdPreview = failure.command.split('\n')[0].substring(0, 60);
          const duration = formatDuration(failure.durationMs);
          output.push(`  ✗ Line ${failure.lineNumber}: ${cmdPreview} (${duration})`);
        }
      }

      // Show run_last timing if present
      if (result.runLast) {
        const duration = formatDuration(result.runLast.durationMs);
        const status = result.runLast.exitCode === 0 ? '✓' : '✗';
        output.push(`  ${status} run_last() (${duration})`);
      }
      continue;
    }

    // Level 4 (very very verbose -vvv): all tests with full error details
    if (verbosity >= 4) {
      output.push(`\n${result.file}:`);

      // Show run_first timing and output if present
      if (result.runFirst) {
        const duration = formatDuration(result.runFirst.durationMs);
        const status = result.runFirst.exitCode === 0 ? '✓' : '✗';
        output.push(`  ${status} run_first() (${duration})`);
        if (result.runFirst.stdout && result.runFirst.stdout.length > 0) {
          output.push(`    Output:`);
          for (const line of result.runFirst.stdout) {
            output.push(`      ${line}`);
          }
        }
      }

      // Show all passing tests
      if (result.passes && result.passes.length > 0) {
        for (const pass of result.passes) {
          const cmdPreview = pass.command.split('\n')[0].substring(0, 60);
          const duration = formatDuration(pass.durationMs);
          output.push(`  ✓ Line ${pass.lineNumber}: ${cmdPreview} (${duration})`);
        }
      }

      // Show all failing tests with full details
      if (result.failed > 0) {
        for (const failure of result.failures) {
          const duration = formatDuration(failure.durationMs);
          output.push(`  ✗ Line ${failure.lineNumber}: ${failure.command} (${duration})`);
          output.push(`    ${failure.error}`);

          if (failure.actualOutput && failure.actualOutput.length > 0) {
            output.push(`    Actual output:`);
            for (const line of failure.actualOutput) {
              output.push(`      ${line}`);
            }
          }
        }
      }

      // Show run_last timing and output if present
      if (result.runLast) {
        const duration = formatDuration(result.runLast.durationMs);
        const status = result.runLast.exitCode === 0 ? '✓' : '✗';
        output.push(`  ${status} run_last() (${duration})`);
        if (result.runLast.stdout && result.runLast.stdout.length > 0) {
          output.push(`    Output:`);
          for (const line of result.runLast.stdout) {
            output.push(`      ${line}`);
          }
        }
      }
      continue;
    }
  }

  // Show failure details for verbosity 0-1 (default mode)
  if (verbosity <= 1 && allFailures.length > 0 && showFailures !== 0) {
    const failuresToShow = showFailures === -1 ? allFailures : allFailures.slice(0, showFailures);

    output.push('');
    if (showFailures === -1 || allFailures.length <= showFailures) {
      output.push(`Showing all ${allFailures.length} failure${allFailures.length !== 1 ? 's' : ''}:`);
    } else {
      output.push(`Showing first ${showFailures} of ${allFailures.length} failures:`);
    }
    output.push('');

    for (const failure of failuresToShow) {
      output.push(`${failure.file}:${failure.lineNumber}`);
      const cmdPreview = failure.command.length > 80
        ? failure.command.substring(0, 80) + '...'
        : failure.command;
      output.push(`  $ ${cmdPreview}`);
      output.push(`  ${failure.error}`);

      // Add helpful hints for common errors
      if (failure.error.includes('Timeout')) {
        output.push(`  Hint: Increase timeout with --timeout N (current: default)`);
      } else if (failure.error.includes('Shell died')) {
        output.push(`  Hint: Previous test timed out or crashed, killing the shell`);
      }

      if (failure.actualOutput && failure.actualOutput.length > 0) {
        const preview = failure.actualOutput.slice(0, 5);
        output.push(`  Actual output:`);
        for (const line of preview) {
          output.push(`    ${line}`);
        }
        if (failure.actualOutput.length > 5) {
          output.push(`    ... (${failure.actualOutput.length - 5} more lines)`);
        }
      }
      output.push('');
    }
  }

  // Summary
  const total = totalPassed + totalFailed;
  const passRate = total > 0 ? ((totalPassed / total) * 100).toFixed(1) : '0.0';

  // Level 0-1: no separator, just summary
  if (verbosity <= 1) {
    if (totalFailed === 0) {
      output.push(`✓ All tests passed! (${totalPassed}/${total})`);
    } else {
      output.push(`✗ ${totalFailed} test${totalFailed !== 1 ? 's' : ''} failed, ${totalPassed} passed (${passRate}% pass rate)`);
    }
  } else {
    // Level 2+: add separator before summary
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
