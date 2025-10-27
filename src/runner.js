import { parseTestFile } from './parser.js';
import { Executor } from './executor.js';
import { matchOutput } from './matcher.js';
import { style } from './colors.js';

/**
 * @typedef {Object} TestResult
 * @property {string} file - Test file path
 * @property {number} passed - Number of passed tests
 * @property {number} failed - Number of failed tests
 * @property {number} skipped - Number of skipped tests
 * @property {TestFailure[]} failures - Details of failed tests
 * @property {TestPass[]} [passes] - Details of passed tests (for verbose mode)
 * @property {TestSkip[]} [skips] - Details of skipped tests
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
 * @typedef {Object} TestSkip
 * @property {string} command - The skipped command
 * @property {number} lineNumber - Line number in source file
 * @property {string} reason - Reason for skipping
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
    testFilePath: filePath,
    step: options.step || false,
    shell: options.shell,
    timeout: options.timeout || 30,
    trace: options.trace || false
  });

  // Load setup script early so run_first can execute before shell starts
  if (executor.setupScript === null) {
    executor.setupScript = await executor.loadSetupScript(executor.testFilePath);
  }

  const result = {
    file: filePath,
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: [],
    passes: [],
    skips: []
  };

  try {
    // Execute run_first if defined
    if (executor.setupScript) {
      const runFirstScript = executor.setupScript + '\ntype run_first >/dev/null 2>&1 && run_first';
      try {
        const runFirstResult = await executor.executeInSeparateShell(runFirstScript);
        result.runFirst = runFirstResult;

        // Print run_first output immediately to console (unless in JSON mode)
        if (!options.json) {
          if (runFirstResult.stdout && runFirstResult.stdout.length > 0) {
            for (const line of runFirstResult.stdout) {
              console.log(line);
            }
          }
          if (runFirstResult.stderr && runFirstResult.stderr.length > 0) {
            for (const line of runFirstResult.stderr) {
              console.error(line);
            }
          }
        }

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

    // Only call before_each_file if there are tests to run
    if (testFile.tests.length > 0) {
      const beforeEachFileResult = await executor.callBeforeEachFile();
      if (beforeEachFileResult) {
        result.beforeEachFile = beforeEachFileResult;

        // Print before_each_file output immediately to console (unless in JSON mode)
        if (!options.json) {
          if (beforeEachFileResult.stdout && beforeEachFileResult.stdout.length > 0) {
            for (const line of beforeEachFileResult.stdout) {
              console.log(line);
            }
          }
          if (beforeEachFileResult.stderr && beforeEachFileResult.stderr.length > 0) {
            for (const line of beforeEachFileResult.stderr) {
              console.error(line);
            }
          }
        }

        // If before_each_file fails with non-zero exit, report warning but continue
        if (beforeEachFileResult.exitCode !== 0) {
          if (options.verbosity >= 2) {
            console.warn(`Warning: before_each_file exited with code ${beforeEachFileResult.exitCode}`);
          }
        }
      }
    }

    for (const test of testFile.tests) {
      const executionResult = await executor.execute(test);

      // If there was an execution error (timeout or shell death), mark as failed
      if (executionResult.error) {
        result.failed++;
        result.failures.push({
          command: test.command,
          lineNumber: test.lineNumber,
          expectedOutput: test.expectedOutput,
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

      // Handle skip to next file
      if (executionResult.skipToNext) {
        break;
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
            expectedOutput: test.expectedOutput,
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

      if (matchResult.skipped) {
        result.skipped++;
        result.skips.push({
          command: test.command,
          lineNumber: test.lineNumber,
          reason: matchResult.skipReason || 'No reason provided'
        });
        if (options.step) {
          console.log('  ' + style.yellow(`⊘ SKIPPED: ${matchResult.skipReason}`));
          console.log();
        }
      } else if (matchResult.success) {
        result.passed++;
        result.passes.push({
          command: test.command,
          lineNumber: test.lineNumber,
          durationMs: executionResult.durationMs
        });
        if (options.step) {
          console.log('  ' + style.brightGreen('✓ PASSED'));
          console.log();
        }
      } else {
        result.failed++;
        result.failures.push({
          command: test.command,
          lineNumber: test.lineNumber,
          expectedOutput: test.expectedOutput,
          error: matchResult.error || 'Unknown error',
          actualOutput: executionResult.stdout,
          actualStderr: executionResult.stderr,
          durationMs: executionResult.durationMs
        });
        if (options.step) {
          // Display failure details in step mode
          console.log('  ' + style.brightRed('✗ FAILED'));
          console.log();

          // Show the error message
          console.log(style.dim('---error---'));
          const errorLines = (matchResult.error || 'Unknown error').split('\n');
          errorLines.forEach(line => {
            console.log(style.red(line));
          });
          console.log(style.dim('---error---'));
          console.log();

          // Show actual output if available
          if (executionResult.stdout && executionResult.stdout.length > 0) {
            console.log(style.dim('Actual stdout:'));
            console.log(style.dim('---actual-output---'));
            executionResult.stdout.slice(0, 30).forEach(line => {
              console.log(style.gray(line));
            });
            if (executionResult.stdout.length > 30) {
              console.log(style.dim(`... (${executionResult.stdout.length - 30} more lines)`));
            }
            console.log(style.dim('---end-of-output---'));
            console.log();
          }

          // Show actual stderr if available
          if (executionResult.stderr && executionResult.stderr.length > 0) {
            console.log(style.dim('Actual stderr:'));
            console.log(style.dim('---actual-output---'));
            executionResult.stderr.slice(0, 30).forEach(line => {
              console.log(style.gray(line));
            });
            if (executionResult.stderr.length > 30) {
              console.log(style.dim(`... (${executionResult.stderr.length - 30} more lines)`));
            }
            console.log(style.dim('---end-of-output---'));
            console.log();
          }
        }
      }
    }
  } finally {
    const afterEachFileResult = await executor.close();
    if (afterEachFileResult) {
      result.afterEachFile = afterEachFileResult;

      // Print after_each_file output immediately to console (unless in JSON mode)
      if (!options.json) {
        if (afterEachFileResult.stdout && afterEachFileResult.stdout.length > 0) {
          for (const line of afterEachFileResult.stdout) {
            console.log(line);
          }
        }
        if (afterEachFileResult.stderr && afterEachFileResult.stderr.length > 0) {
          for (const line of afterEachFileResult.stderr) {
            console.error(line);
          }
        }
      }

      // If after_each_file fails with non-zero exit, report warning
      if (afterEachFileResult.exitCode !== 0) {
        if (options.verbosity >= 2) {
          console.warn(`Warning: after_each_file exited with code ${afterEachFileResult.exitCode}`);
        }
      }
    }

    // Execute run_last if defined (always runs, even if shell crashed)
    if (executor.setupScript) {
      const runLastScript = executor.setupScript + '\ntype run_last >/dev/null 2>&1 && run_last';
      try {
        const runLastResult = await executor.executeInSeparateShell(runLastScript);
        result.runLast = runLastResult;

        // Print run_last output immediately to console (unless in JSON mode)
        if (!options.json) {
          if (runLastResult.stdout && runLastResult.stdout.length > 0) {
            for (const line of runLastResult.stdout) {
              console.log(line);
            }
          }
          if (runLastResult.stderr && runLastResult.stderr.length > 0) {
            for (const line of runLastResult.stderr) {
              console.error(line);
            }
          }
        }

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

  // Note: onFileComplete callback is handled by runTestFiles, not here
  // This allows it to include timing and index information

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
  const totalFiles = options.totalFiles || filePaths.length;

  if (jobs === 1) {
    // Sequential execution
    const results = [];
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const startTime = Date.now();
      try {
        const result = await runTestFile(filePath, options);
        results.push(result);

        // Call onFileComplete callback if provided
        if (options.onFileComplete) {
          const duration = Date.now() - startTime;
          options.onFileComplete(result, i, totalFiles, duration);
        }
      } catch (error) {
        const result = {
          file: filePath,
          passed: 0,
          failed: 1,
          skipped: 0,
          failures: [{
            command: '',
            lineNumber: 0,
            error: `Failed to run test file: ${error.message}`
          }]
        };
        results.push(result);

        // Call onFileComplete callback even for errors
        if (options.onFileComplete) {
          const duration = Date.now() - startTime;
          options.onFileComplete(result, i, totalFiles, duration);
        }
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

        const startTime = Date.now();

        runTestFile(filePath, options)
          .then(result => {
            results[currentIndex] = result;

            // Call onFileComplete callback if provided
            if (options.onFileComplete) {
              const duration = Date.now() - startTime;
              options.onFileComplete(result, currentIndex, totalFiles, duration);
            }
          })
          .catch(error => {
            const result = {
              file: filePath,
              passed: 0,
              failed: 1,
              skipped: 0,
              failures: [{
                command: '',
                lineNumber: 0,
                error: `Failed to run test file: ${error.message}`
              }]
            };
            results[currentIndex] = result;

            // Call onFileComplete callback even for errors
            if (options.onFileComplete) {
              const duration = Date.now() - startTime;
              options.onFileComplete(result, currentIndex, totalFiles, duration);
            }
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
export function formatResults(results, verbosity = 1, streamed = false, showFailures = 1, debug = false) {
  const output = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const allFailures = [];

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped || 0;

    // Collect all failures for later display
    if (result.failures && result.failures.length > 0) {
      for (const failure of result.failures) {
        allFailures.push({
          file: result.file,
          ...failure
        });
      }
    }

    const total = result.passed + result.failed + (result.skipped || 0);
    const passRate = (result.passed + result.failed) > 0
      ? ((result.passed / (result.passed + result.failed)) * 100).toFixed(1)
      : '0.0';

    // Debug mode: show test summaries (overrides verbosity)
    if (debug && !streamed) {
      output.push(`\n${result.file}:`);
      const summaryParts = [`${result.passed} passed`, `${result.failed} failed`];
      if (result.skipped > 0) {
        summaryParts.push(`${result.skipped} skipped`);
      }
      output.push(`  Summary: ${summaryParts.join(', ')} (${passRate}%)`);

      // Show each test with timing
      if (result.passes && result.passes.length > 0) {
        for (const pass of result.passes) {
          const duration = formatDuration(pass.durationMs);
          const cmdPreview = pass.command.split('\n')[0].substring(0, 70);
          output.push(`  ✓ Line ${pass.lineNumber}: ${cmdPreview} [${duration}]`);
        }
      }

      // Show skipped tests
      if (result.skips && result.skips.length > 0) {
        for (const skip of result.skips) {
          const cmdPreview = skip.command.split('\n')[0].substring(0, 70);
          output.push(`  ⊘ Line ${skip.lineNumber}: ${cmdPreview} [skipped: ${skip.reason}]`);
        }
      }

      if (result.failures && result.failures.length > 0) {
        for (const failure of result.failures) {
          const duration = formatDuration(failure.durationMs);
          const cmdPreview = failure.command.split('\n')[0].substring(0, 70);
          const errorBrief = failure.error.split('\n')[0];
          output.push(`  ✗ Line ${failure.lineNumber}: ${cmdPreview} [${duration}]`);
          output.push(`    Error: ${errorBrief}`);
        }
      }
      continue;
    }

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
          output.push(`✗ Line ${failure.lineNumber} (${duration})`);
          output.push('');

          // Show command
          output.push(cutLine('command', 'cyan'));
          const commandLines = failure.command.split('\n');
          commandLines.forEach(line => output.push(line));
          output.push(cutLine('end', 'cyan'));
          output.push('');

          // Show expected output
          if (failure.expectedOutput && failure.expectedOutput.length > 0) {
            output.push(cutLine('expected-output', 'green'));
            const formattedExpected = formatExpectedOutput(failure.expectedOutput);
            formattedExpected.forEach(line => output.push(line));
            output.push(cutLine('end', 'green'));
            output.push('');
          }

          // Show error/expected pattern
          output.push(cutLine('error', 'red'));
          const errorLines = failure.error.split('\n');
          errorLines.forEach(line => output.push(line));
          output.push(cutLine('end', 'red'));
          output.push('');

          // Show actual output
          if (failure.actualOutput && failure.actualOutput.length > 0) {
            output.push(cutLine('actual-stdout', 'yellow'));
            const linesToShow = failure.actualOutput.slice(0, 30);
            for (const line of linesToShow) {
              output.push(line);
            }
            if (failure.actualOutput.length > 30) {
              output.push(`... (${failure.actualOutput.length - 30} more lines)`);
            }
            output.push(cutLine('end', 'yellow'));
            output.push('');
          }

          // Show actual stderr if present
          if (failure.actualStderr && failure.actualStderr.length > 0) {
            output.push(cutLine('actual-stderr', 'magenta'));
            const linesToShow = failure.actualStderr.slice(0, 30);
            for (const line of linesToShow) {
              output.push(line);
            }
            if (failure.actualStderr.length > 30) {
              output.push(`... (${failure.actualStderr.length - 30} more lines)`);
            }
            output.push(cutLine('end', 'magenta'));
            output.push('');
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

      // Show all skipped tests
      if (result.skips && result.skips.length > 0) {
        for (const skip of result.skips) {
          const cmdPreview = skip.command.split('\n')[0].substring(0, 60);
          output.push(`  ⊘ Line ${skip.lineNumber}: ${cmdPreview} [${skip.reason}]`);
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

      // Show all skipped tests
      if (result.skips && result.skips.length > 0) {
        for (const skip of result.skips) {
          const cmdPreview = skip.command.split('\n')[0].substring(0, 60);
          output.push(`  ⊘ Line ${skip.lineNumber}: ${cmdPreview} [${skip.reason}]`);
        }
      }

      // Show all failing tests with full details
      if (result.failed > 0) {
        for (const failure of result.failures) {
          const duration = formatDuration(failure.durationMs);
          output.push(`✗ Line ${failure.lineNumber} (${duration})`);
          output.push('');

          // Show command
          output.push(cutLine('command', 'cyan'));
          const commandLines = failure.command.split('\n');
          commandLines.forEach(line => output.push(line));
          output.push(cutLine('end', 'cyan'));
          output.push('');

          // Show expected output
          if (failure.expectedOutput && failure.expectedOutput.length > 0) {
            output.push(cutLine('expected-output', 'green'));
            const formattedExpected = formatExpectedOutput(failure.expectedOutput);
            formattedExpected.forEach(line => output.push(line));
            output.push(cutLine('end', 'green'));
            output.push('');
          }

          // Show error/expected pattern
          output.push(cutLine('error', 'red'));
          const errorLines = failure.error.split('\n');
          errorLines.forEach(line => output.push(line));
          output.push(cutLine('end', 'red'));
          output.push('');

          // Show actual output
          if (failure.actualOutput && failure.actualOutput.length > 0) {
            output.push(cutLine('actual-stdout', 'yellow'));
            const linesToShow = failure.actualOutput.slice(0, 30);
            for (const line of linesToShow) {
              output.push(line);
            }
            if (failure.actualOutput.length > 30) {
              output.push(`... (${failure.actualOutput.length - 30} more lines)`);
            }
            output.push(cutLine('end', 'yellow'));
            output.push('');
          }

          // Show actual stderr if present
          if (failure.actualStderr && failure.actualStderr.length > 0) {
            output.push(cutLine('actual-stderr', 'magenta'));
            const linesToShow = failure.actualStderr.slice(0, 30);
            for (const line of linesToShow) {
              output.push(line);
            }
            if (failure.actualStderr.length > 30) {
              output.push(`... (${failure.actualStderr.length - 30} more lines)`);
            }
            output.push(cutLine('end', 'magenta'));
            output.push('');
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
      output.push('');

      // Show command
      output.push(cutLine('command', 'cyan'));
      const commandLines = failure.command.split('\n');
      commandLines.forEach(line => output.push(line));
      output.push(cutLine('end', 'cyan'));
      output.push('');

      // Show expected output
      if (failure.expectedOutput && failure.expectedOutput.length > 0) {
        output.push(cutLine('expected-output', 'green'));
        const formattedExpected = formatExpectedOutput(failure.expectedOutput);
        formattedExpected.forEach(line => output.push(line));
        output.push(cutLine('end', 'green'));
        output.push('');
      }

      // Show error
      output.push(cutLine('error', 'red'));
      const errorLines = failure.error.split('\n');
      errorLines.forEach(line => output.push(line));
      output.push(cutLine('end', 'red'));
      output.push('');

      // Add helpful hints for common errors
      if (failure.error.includes('Timeout')) {
        output.push(`Hint: Increase timeout with --timeout N (current: default)`);
        output.push('');
      } else if (failure.error.includes('Shell died')) {
        output.push(`Hint: Previous test timed out or crashed, killing the shell`);
        output.push('');
      }

      // Show actual output
      if (failure.actualOutput && failure.actualOutput.length > 0) {
        output.push(cutLine('actual-stdout', 'yellow'));
        const preview = failure.actualOutput.slice(0, 20);
        for (const line of preview) {
          output.push(line);
        }
        if (failure.actualOutput.length > 20) {
          output.push(`... (${failure.actualOutput.length - 20} more lines)`);
        }
        output.push(cutLine('end', 'yellow'));
        output.push('');
      }

      // Show actual stderr
      if (failure.actualStderr && failure.actualStderr.length > 0) {
        output.push(cutLine('actual-stderr', 'magenta'));
        const preview = failure.actualStderr.slice(0, 20);
        for (const line of preview) {
          output.push(line);
        }
        if (failure.actualStderr.length > 20) {
          output.push(`... (${failure.actualStderr.length - 20} more lines)`);
        }
        output.push(cutLine('end', 'magenta'));
        output.push('');
      }
    }
  }

  // Summary
  const total = totalPassed + totalFailed + totalSkipped;
  const passRate = (totalPassed + totalFailed) > 0
    ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
    : '0.0';

  // Build summary message parts
  const buildSummary = () => {
    if (totalFailed === 0 && totalSkipped === 0) {
      return `✓ All tests passed! (${totalPassed}/${total})`;
    } else if (totalFailed === 0) {
      return `✓ ${totalPassed} passed, ${totalSkipped} skipped (${totalPassed}/${total})`;
    } else {
      const parts = [`${totalFailed} test${totalFailed !== 1 ? 's' : ''} failed`, `${totalPassed} passed`];
      if (totalSkipped > 0) {
        parts.push(`${totalSkipped} skipped`);
      }
      return `✗ ${parts.join(', ')} (${passRate}% pass rate)`;
    }
  };

  // Level 0-1: no separator, just summary
  if (verbosity <= 1) {
    output.push(buildSummary());
  } else {
    // Level 2+: add separator before summary
    output.push('');
    output.push('═'.repeat(60));
    output.push(buildSummary());
  }

  return output.join('\n');
}

/**
 * Create a cut line with colored label
 * @param {string} label - Label text (e.g., "command", "error", "actual-output")
 * @param {string} color - Color name from style
 * @returns {string}
 */
function cutLine(label, color = 'cyan') {
  return `---${style[color](label)}---`;
}

/**
 * Format expected output patterns for display
 * @param {Array} expectedOutput - Array of output expectations
 * @returns {string[]} - Formatted lines to display
 */
function formatExpectedOutput(expectedOutput) {
  const lines = [];

  for (const expectation of expectedOutput) {
    const stream = expectation.stream === 'stderr' ? '[stderr] ' : '';

    switch (expectation.type) {
      case 'literal':
        lines.push(`${stream}${expectation.pattern}`);
        break;
      case 'regex':
        const flags = expectation.flags ? expectation.flags : '';
        lines.push(`${stream}[Matching: /${expectation.pattern}/${flags}]`);
        break;
      case 'glob':
        lines.push(`${stream}[Matching glob: ${expectation.pattern}]`);
        break;
      case 'ellipsis':
        lines.push('...');
        break;
      case 'no-eol':
        lines.push(`${expectation.pattern} (no-eol)`);
        break;
      case 'skip':
        lines.push(`[SKIP: ${expectation.reason}]`);
        break;
      case 'inline':
        lines.push(expectation.pattern);
        break;
      case 'stderr':
        lines.push(`[stderr: ${expectation.pattern}]`);
        break;
      default:
        lines.push(`[Unknown expectation type: ${expectation.type}]`);
    }
  }

  return lines;
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
  let totalSkipped = 0;
  let totalFiles = results.length;
  let filesWithFailures = 0;

  for (const result of results) {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped || 0;
    if (result.failed > 0) {
      filesWithFailures++;
    }
  }

  const totalTests = totalPassed + totalFailed + totalSkipped;

  return {
    totalFiles,
    filesWithFailures,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalTests,
    passRate: totalPassed + totalFailed > 0
      ? (totalPassed / (totalPassed + totalFailed)) * 100
      : 0
  };
}
