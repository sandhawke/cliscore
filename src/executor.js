import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { readFile, access, stat } from 'fs/promises';
import { resolve, dirname } from 'path';
import * as readline from 'readline';

/**
 * @typedef {import('./parser.js').TestCommand} TestCommand
 */

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Whether execution succeeded
 * @property {string[]} stdout - Standard output lines
 * @property {string[]} stderr - Standard error lines
 * @property {number} exitCode - Exit code of the command
 * @property {number} durationMs - Execution duration in milliseconds
 * @property {string} [error] - Error message if execution failed
 * @property {boolean} [skipped] - Whether test was skipped in step mode
 * @property {string} [skipReason] - Reason for skip
 */

/**
 * Executor for running shell commands with output capture
 */
export class Executor {
  constructor(options = {}) {
    this.shell = null;
    this.shellPath = options.shell || '/bin/sh';
    this.shellReady = false;
    this.setupScript = options.setupScript || null;
    this.testFilePath = options.testFilePath || null; // Path to test file for setup script discovery
    this.stepMode = options.step || false;
    this.rl = null;
    this.timeout = options.timeout || 30; // Timeout in seconds
    this.shellDead = false; // Flag indicating shell was killed
    this.trace = options.trace || false; // Trace mode for I/O logging
    this.beforeEachFileCalled = false; // Track if before_each_file was called
  }

  /**
   * Log trace message with timestamp
   * @param {string} type - Event type
   * @param {string} message - Message to log
   */
  traceLog(type, message) {
    if (!this.trace) return;

    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    const fileInfo = this.testFilePath ? ` [${this.testFilePath}]` : '';
    const prefix = `[TRACE ${timestamp}]`;
    const lines = message.split('\n');

    console.error(`${prefix} ${type}${fileInfo}:`);
    for (const line of lines) {
      console.error(`  ${line}`);
    }
  }

  /**
   * Load cliscore.sh setup script if it exists
   * Searches recursively from test file's directory up to filesystem root.
   * Security: Only loads scripts owned by the same UID as the test file.
   * @param {string} [testFilePath] - Optional path to test file
   * @returns {Promise<string|null>}
   */
  async loadSetupScript(testFilePath) {
    if (!testFilePath) {
      return null;
    }

    // Get the UID of the test file for security check
    let testFileUid;
    try {
      const testFileStat = await stat(resolve(testFilePath));
      testFileUid = testFileStat.uid;
    } catch (err) {
      // If we can't stat the test file, we can't do security checks
      console.warn(`Warning: Cannot stat test file ${testFilePath}: ${err.message}`);
      return null;
    }

    // Start from the test file's directory and walk up to root
    let currentDir = dirname(resolve(testFilePath));

    while (true) {
      const setupPath = resolve(currentDir, 'cliscore.sh');

      try {
        await access(setupPath);

        // Check ownership for security
        const setupStat = await stat(setupPath);
        if (setupStat.uid !== testFileUid) {
          console.warn(`Warning: Ignoring ${setupPath} - ownership mismatch (test file uid: ${testFileUid}, setup script uid: ${setupStat.uid})`);
          // Continue searching up the tree
        } else {
          // Found a valid setup script with matching ownership
          const content = await readFile(setupPath, 'utf-8');
          return content;
        }
      } catch {
        // File doesn't exist or can't be accessed, continue up the tree
      }

      // Move to parent directory
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached filesystem root
        break;
      }
      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Prompt user for action in step mode
   * @param {string} command - The command to show
   * @returns {Promise<'run'|'pass'|'fail'>}
   */
  async promptStep(command) {
    if (!this.stepMode) {
      return 'run';
    }

    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    // Show the command
    const commandPreview = command.length > 100
      ? command.substring(0, 100) + '...'
      : command;

    return new Promise((resolve) => {
      this.rl.question(`\nAbout to run: ${commandPreview}\nRun test / skip as Pass / skip as Fail? [R/p/f] `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'p' || normalized === 'pass') {
          resolve('pass');
        } else if (normalized === 'f' || normalized === 'fail') {
          resolve('fail');
        } else {
          resolve('run');
        }
      });
    });
  }

  /**
   * Execute a shell script in a separate shell and capture output
   * @param {string} script - Script content to execute
   * @returns {Promise<{stdout: string[], stderr: string[], exitCode: number, durationMs: number}>}
   */
  async executeInSeparateShell(script) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const shell = spawn(this.shellPath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const stdoutLines = [];
      const stderrLines = [];
      let exitCode = null;

      shell.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        // Remove empty last line if present
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }
        stdoutLines.push(...lines);
      });

      shell.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }
        stderrLines.push(...lines);
      });

      shell.on('exit', (code) => {
        exitCode = code ?? 0;
        resolve({
          stdout: stdoutLines,
          stderr: stderrLines,
          exitCode,
          durationMs: Date.now() - startTime
        });
      });

      shell.on('error', (err) => {
        reject(new Error(`Failed to execute script: ${err.message}`));
      });

      // Write script and close stdin
      shell.stdin.write(script + '\n');
      shell.stdin.end();
    });
  }

  /**
   * Start the shell process
   * @returns {Promise<void>}
   */
  async start() {
    // Load setup script if not already provided
    if (this.setupScript === null) {
      this.setupScript = await this.loadSetupScript(this.testFilePath);
    }

    this.traceLog('SPAWN', `Starting shell: ${this.shellPath}`);

    return new Promise((resolve, reject) => {
      this.shell = spawn(this.shellPath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.shell.on('error', (err) => {
        this.traceLog('ERROR', `Shell error: ${err.message}`);
        reject(new Error(`Failed to start shell: ${err.message}`));
      });

      this.shell.on('exit', (code) => {
        this.traceLog('EXIT', `Shell exited with code ${code}`);
        if (!this.shellReady) {
          reject(new Error(`Shell exited prematurely with code ${code}`));
        }
      });

      // Source the setup script if it exists
      if (this.setupScript) {
        this.traceLog('STDIN', 'Sourcing setup script');
        this.shell.stdin.write(this.setupScript + '\n');
      }

      // Wait a bit for shell to be ready
      setTimeout(() => {
        this.shellReady = true;
        resolve();
      }, 100);
    });
  }

  /**
   * Call before_each_file hook if it exists
   * Should be called after start() and before any tests are executed
   * @returns {Promise<{stdout: string[], stderr: string[], exitCode: number, durationMs: number}|null>}
   */
  async callBeforeEachFile() {
    if (!this.shell || !this.shellReady || this.shellDead) {
      throw new Error('Executor not started. Call start() first.');
    }

    if (!this.setupScript || this.beforeEachFileCalled) {
      return null;
    }

    const startTime = Date.now();
    this.traceLog('STDIN', 'Calling before_each_file()');
    this.beforeEachFileCalled = true;

    const marker = this.generateMarker();
    const stdoutEndMarker = `__CLISCORE_BEFORE_EACH_FILE_STDOUT_${marker}__`;
    const stderrEndMarker = `__CLISCORE_BEFORE_EACH_FILE_STDERR_${marker}__`;

    return new Promise((resolve) => {
      const stdoutLines = [];
      const stderrLines = [];
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let exitCode = null;
      let stdoutComplete = false;
      let stderrComplete = false;

      const checkComplete = () => {
        if (stdoutComplete && stderrComplete) {
          resolve({
            stdout: stdoutLines,
            stderr: stderrLines,
            exitCode: exitCode ?? 0,
            durationMs: Date.now() - startTime
          });
        }
      };

      const stdoutHandler = (data) => {
        const dataStr = data.toString();
        this.traceLog('STDOUT', dataStr.trimEnd());
        stdoutBuffer += dataStr;

        const markerRegex = new RegExp(`${stdoutEndMarker}:(\\d+)`);
        const markerMatch = stdoutBuffer.match(markerRegex);

        if (markerMatch) {
          const outputBeforeMarker = stdoutBuffer.substring(0, markerMatch.index);
          if (outputBeforeMarker) {
            const lines = outputBeforeMarker.split('\n');
            if (lines[lines.length - 1] === '' && lines.length > 1) {
              lines.pop();
            }
            stdoutLines.push(...lines);
          }
          exitCode = parseInt(markerMatch[1], 10);
          stdoutComplete = true;
          this.shell.stdout.off('data', stdoutHandler);
          checkComplete();
          return;
        }

        const newlineIndex = stdoutBuffer.lastIndexOf('\n');
        if (newlineIndex !== -1) {
          const completeLines = stdoutBuffer.substring(0, newlineIndex);
          stdoutBuffer = stdoutBuffer.substring(newlineIndex + 1);
          if (completeLines) {
            const lines = completeLines.split('\n');
            stdoutLines.push(...lines);
          }
        }
      };

      const stderrHandler = (data) => {
        const dataStr = data.toString();
        this.traceLog('STDERR', dataStr.trimEnd());
        stderrBuffer += dataStr;
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.includes(stderrEndMarker)) {
            stderrComplete = true;
            this.shell.stderr.off('data', stderrHandler);
            checkComplete();
            return;
          }
          stderrLines.push(line);
        }
      };

      this.shell.stdout.on('data', stdoutHandler);
      this.shell.stderr.on('data', stderrHandler);

      const command = `type before_each_file >/dev/null 2>&1 && before_each_file
__EXIT_CODE=$?
echo "${stdoutEndMarker}:$__EXIT_CODE"
echo "${stderrEndMarker}" >&2
`;
      this.shell.stdin.write(command);
    });
  }

  /**
   * Execute a command and capture its output
   * @param {TestCommand} testCommand - Test command to execute
   * @returns {Promise<ExecutionResult>}
   */
  async execute(testCommand) {
    if (!this.shell || !this.shellReady || this.shellDead) {
      if (this.shellDead) {
        return {
          success: false,
          stdout: [],
          stderr: [],
          exitCode: -1,
          durationMs: 0,
          error: 'Shell died due to previous timeout or error'
        };
      }
      throw new Error('Executor not started. Call start() first.');
    }

    const { command } = testCommand;
    const startTime = Date.now();

    // In step mode, ask for action
    const action = await this.promptStep(command);
    if (action === 'pass') {
      return {
        success: true,
        stdout: [],
        stderr: [],
        exitCode: 0,
        durationMs: Date.now() - startTime,
        skipped: true,
        skipReason: 'Skipped as pass by user'
      };
    } else if (action === 'fail') {
      return {
        success: false,
        stdout: [],
        stderr: [],
        exitCode: 1,
        durationMs: Date.now() - startTime,
        skipped: true,
        skipReason: 'Skipped as fail by user'
      };
    }

    const marker = this.generateMarker();
    let timeoutHandle = null;
    let timedOut = false;

    return new Promise((resolve) => {
      const stdoutLines = [];
      const stderrLines = [];
      let stdoutBuffer = '';
      let stderrBuffer = '';
      let exitCode = null;

      const stdoutEndMarker = `__CLISCORE_STDOUT_END_${marker}__`;
      const stderrEndMarker = `__CLISCORE_STDERR_END_${marker}__`;

      let stdoutComplete = false;
      let stderrComplete = false;

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        this.shellDead = true;

        // Remove listeners to prevent further processing
        if (this.shell && this.shell.stdout) {
          this.shell.stdout.removeAllListeners('data');
        }
        if (this.shell && this.shell.stderr) {
          this.shell.stderr.removeAllListeners('data');
        }

        // Kill the shell
        if (this.shell) {
          this.shell.kill('SIGTERM');
          setTimeout(() => {
            if (this.shell && !this.shell.killed) {
              this.shell.kill('SIGKILL');
            }
          }, 1000);
        }

        resolve({
          success: false,
          stdout: stdoutLines,
          stderr: stderrLines,
          exitCode: -1,
          durationMs: Date.now() - startTime,
          error: `Timeout after ${this.timeout}s`
        });
      }, this.timeout * 1000);

      const checkComplete = () => {
        if (stdoutComplete && stderrComplete) {
          // Clear timeout if we completed normally
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          // If we already timed out, don't resolve again
          if (timedOut) {
            return;
          }

          const result = {
            success: exitCode === 0,
            stdout: stdoutLines,
            stderr: stderrLines,
            exitCode: exitCode ?? 0,
            durationMs: Date.now() - startTime
          };

          // In step mode, show the output
          if (this.stepMode) {
            console.log('\n--- Output ---');
            if (stdoutLines.length > 0) {
              console.log('stdout:');
              stdoutLines.forEach(line => console.log('  ' + line));
            }
            if (stderrLines.length > 0) {
              console.log('stderr:');
              stderrLines.forEach(line => console.log('  ' + line));
            }
            console.log(`Exit code: ${exitCode ?? 0}`);
            console.log('--- End Output ---\n');
          }

          resolve(result);
        }
      };

      const stdoutHandler = (data) => {
        const dataStr = data.toString();
        this.traceLog('STDOUT', dataStr.trimEnd());
        stdoutBuffer += dataStr;

        // Check if we have the end marker
        const markerRegex = new RegExp(`${stdoutEndMarker}:(\\d+)`);
        const markerMatch = stdoutBuffer.match(markerRegex);

        if (markerMatch) {
          // Extract everything before the marker
          const outputBeforeMarker = stdoutBuffer.substring(0, markerMatch.index);

          // Split on newlines but preserve all parts
          if (outputBeforeMarker) {
            const lines = outputBeforeMarker.split('\n');
            // If the output ended with a newline, remove the empty last element
            if (lines[lines.length - 1] === '' && lines.length > 1) {
              lines.pop();
            }
            stdoutLines.push(...lines);
          }

          exitCode = parseInt(markerMatch[1], 10);
          stdoutComplete = true;
          this.shell.stdout.off('data', stdoutHandler);
          checkComplete();
          return;
        }

        // Process complete lines, keep incomplete ones in buffer
        const newlineIndex = stdoutBuffer.lastIndexOf('\n');
        if (newlineIndex !== -1) {
          const completeLines = stdoutBuffer.substring(0, newlineIndex);
          stdoutBuffer = stdoutBuffer.substring(newlineIndex + 1);

          if (completeLines) {
            const lines = completeLines.split('\n');
            stdoutLines.push(...lines);
          }
        }
      };

      const stderrHandler = (data) => {
        const dataStr = data.toString();
        this.traceLog('STDERR', dataStr.trimEnd());
        stderrBuffer += dataStr;
        const lines = stderrBuffer.split('\n');

        // Keep the last incomplete line in the buffer
        stderrBuffer = lines.pop() || '';

        for (const line of lines) {
          // Check for our end marker
          if (line.includes(stderrEndMarker)) {
            stderrComplete = true;
            this.shell.stderr.off('data', stderrHandler);
            checkComplete();
            return;
          }
          stderrLines.push(line);
        }
      };

      this.shell.stdout.on('data', stdoutHandler);
      this.shell.stderr.on('data', stderrHandler);

      // Execute the command followed by marker echoes
      // Only wrap in subshell if command contains 'exit' to avoid killing main shell
      // but preserve environment for other commands
      const needsSubshell = /\bexit\b/.test(command);
      const fullCommand = needsSubshell
        ? `(${command})
__EXIT_CODE=$?
echo "${stdoutEndMarker}:$__EXIT_CODE"
echo "${stderrEndMarker}" >&2
`
        : `${command}
__EXIT_CODE=$?
echo "${stdoutEndMarker}:$__EXIT_CODE"
echo "${stderrEndMarker}" >&2
`;

      this.traceLog('STDIN', `Command: ${command}`);
      this.traceLog('STDIN', `Markers: ${stdoutEndMarker}, ${stderrEndMarker}`);
      this.shell.stdin.write(fullCommand);
    });
  }

  /**
   * Execute multiple commands in sequence
   * @param {TestCommand[]} commands - Commands to execute
   * @returns {Promise<ExecutionResult[]>}
   */
  async executeAll(commands) {
    const results = [];
    for (const cmd of commands) {
      const result = await this.execute(cmd);
      results.push(result);
    }
    return results;
  }

  /**
   * Close the shell process
   * @returns {Promise<{stdout: string[], stderr: string[], exitCode: number, durationMs: number}|null>}
   */
  async close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    let afterEachFileResult = null;

    if (this.shell) {
      // Call after_each_file only if before_each_file was called
      if (this.setupScript && this.beforeEachFileCalled && !this.shellDead) {
        try {
          this.traceLog('STDIN', 'Calling after_each_file()');

          const startTime = Date.now();
          const marker = this.generateMarker();
          const stdoutEndMarker = `__CLISCORE_AFTER_EACH_FILE_STDOUT_${marker}__`;
          const stderrEndMarker = `__CLISCORE_AFTER_EACH_FILE_STDERR_${marker}__`;

          afterEachFileResult = await new Promise((resolve) => {
            const stdoutLines = [];
            const stderrLines = [];
            let stdoutBuffer = '';
            let stderrBuffer = '';
            let exitCode = null;
            let stdoutComplete = false;
            let stderrComplete = false;
            let timedOut = false;

            const timeout = setTimeout(() => {
              if (!timedOut) {
                timedOut = true;
                this.traceLog('STDERR', 'after_each_file() timed out after 5s');
                if (this.shell && this.shell.stdout) {
                  this.shell.stdout.off('data', stdoutHandler);
                }
                if (this.shell && this.shell.stderr) {
                  this.shell.stderr.off('data', stderrHandler);
                }
                resolve({
                  stdout: stdoutLines,
                  stderr: stderrLines,
                  exitCode: -1,
                  durationMs: Date.now() - startTime
                });
              }
            }, 5000); // 5 second timeout for cleanup

            const checkComplete = () => {
              if (stdoutComplete && stderrComplete && !timedOut) {
                clearTimeout(timeout);
                resolve({
                  stdout: stdoutLines,
                  stderr: stderrLines,
                  exitCode: exitCode ?? 0,
                  durationMs: Date.now() - startTime
                });
              }
            };

            const stdoutHandler = (data) => {
              const dataStr = data.toString();
              this.traceLog('STDOUT', dataStr.trimEnd());
              stdoutBuffer += dataStr;

              const markerRegex = new RegExp(`${stdoutEndMarker}:(\\d+)`);
              const markerMatch = stdoutBuffer.match(markerRegex);

              if (markerMatch) {
                const outputBeforeMarker = stdoutBuffer.substring(0, markerMatch.index);
                if (outputBeforeMarker) {
                  const lines = outputBeforeMarker.split('\n');
                  if (lines[lines.length - 1] === '' && lines.length > 1) {
                    lines.pop();
                  }
                  stdoutLines.push(...lines);
                }
                exitCode = parseInt(markerMatch[1], 10);
                stdoutComplete = true;
                this.shell.stdout.off('data', stdoutHandler);
                checkComplete();
                return;
              }

              const newlineIndex = stdoutBuffer.lastIndexOf('\n');
              if (newlineIndex !== -1) {
                const completeLines = stdoutBuffer.substring(0, newlineIndex);
                stdoutBuffer = stdoutBuffer.substring(newlineIndex + 1);
                if (completeLines) {
                  const lines = completeLines.split('\n');
                  stdoutLines.push(...lines);
                }
              }
            };

            const stderrHandler = (data) => {
              const dataStr = data.toString();
              this.traceLog('STDERR', dataStr.trimEnd());
              stderrBuffer += dataStr;
              const lines = stderrBuffer.split('\n');
              stderrBuffer = lines.pop() || '';

              for (const line of lines) {
                if (line.includes(stderrEndMarker)) {
                  stderrComplete = true;
                  this.shell.stderr.off('data', stderrHandler);
                  checkComplete();
                  return;
                }
                stderrLines.push(line);
              }
            };

            this.shell.stdout.on('data', stdoutHandler);
            this.shell.stderr.on('data', stderrHandler);

            // Execute after_each_file and echo markers
            const command = `type after_each_file >/dev/null 2>&1 && after_each_file
__EXIT_CODE=$?
echo "${stdoutEndMarker}:$__EXIT_CODE"
echo "${stderrEndMarker}" >&2
`;
            this.shell.stdin.write(command);
          });
        } catch (err) {
          this.traceLog('ERROR', `Error during after_each_file: ${err.message}`);
          // Continue with shutdown even if after_each_file fails
        }
      }

      this.shell.stdin.end();
      this.shell.kill();
      this.shell = null;
      this.shellReady = false;
    }

    return afterEachFileResult;
  }

  /**
   * Generate a unique marker for separating command output
   * @returns {string}
   */
  generateMarker() {
    return randomBytes(8).toString('hex');
  }
}
