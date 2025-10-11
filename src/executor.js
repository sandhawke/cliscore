import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { readFile, access } from 'fs/promises';
import { resolve } from 'path';
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
 * @property {string} [error] - Error message if execution failed
 */

/**
 * Executor for running shell commands with output capture
 */
export class Executor {
  constructor(options = {}) {
    this.shell = null;
    this.shellReady = false;
    this.setupScript = options.setupScript || null;
    this.stepMode = options.step || false;
    this.rl = null;
  }

  /**
   * Load cliscore.sh setup script if it exists
   * @returns {Promise<string|null>}
   */
  async loadSetupScript() {
    try {
      const setupPath = resolve(process.cwd(), 'cliscore.sh');
      await access(setupPath);
      const content = await readFile(setupPath, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Prompt user for confirmation in step mode
   * @param {string} command - The command to show
   * @returns {Promise<boolean>}
   */
  async promptStep(command) {
    if (!this.stepMode) {
      return true;
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
      this.rl.question(`\nAbout to run: ${commandPreview}\nContinue? [Y/n] `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'n' || normalized === 'no') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Start the shell process
   * @returns {Promise<void>}
   */
  async start() {
    // Load setup script if not already provided
    if (this.setupScript === null) {
      this.setupScript = await this.loadSetupScript();
    }

    return new Promise((resolve, reject) => {
      this.shell = spawn('/bin/sh', [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.shell.on('error', (err) => {
        reject(new Error(`Failed to start shell: ${err.message}`));
      });

      this.shell.on('exit', (code) => {
        if (!this.shellReady) {
          reject(new Error(`Shell exited prematurely with code ${code}`));
        }
      });

      // Source the setup script if it exists
      if (this.setupScript) {
        this.shell.stdin.write(this.setupScript + '\n');
        // Call cliscore_setup if defined
        this.shell.stdin.write('type cliscore_setup >/dev/null 2>&1 && cliscore_setup\n');
      }

      // Wait a bit for shell to be ready
      setTimeout(() => {
        this.shellReady = true;
        resolve();
      }, 100);
    });
  }

  /**
   * Execute a command and capture its output
   * @param {TestCommand} testCommand - Test command to execute
   * @returns {Promise<ExecutionResult>}
   */
  async execute(testCommand) {
    if (!this.shell || !this.shellReady) {
      throw new Error('Executor not started. Call start() first.');
    }

    const { command } = testCommand;

    // In step mode, ask for confirmation
    const shouldRun = await this.promptStep(command);
    if (!shouldRun) {
      return {
        success: false,
        stdout: [],
        stderr: ['Test skipped by user'],
        exitCode: 0
      };
    }

    const marker = this.generateMarker();

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

      const checkComplete = () => {
        if (stdoutComplete && stderrComplete) {
          const result = {
            success: exitCode === 0,
            stdout: stdoutLines,
            stderr: stderrLines,
            exitCode: exitCode ?? 0
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
        stdoutBuffer += data.toString();

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
        stderrBuffer += data.toString();
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
      // Wrap in a subshell to prevent exit commands from killing the main shell
      const fullCommand = `(${command})
__EXIT_CODE=$?
echo "${stdoutEndMarker}:$__EXIT_CODE"
echo "${stderrEndMarker}" >&2
`;

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
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    if (this.shell) {
      // Call cliscore_teardown if defined
      if (this.setupScript) {
        try {
          this.shell.stdin.write('type cliscore_teardown >/dev/null 2>&1 && cliscore_teardown\n');
        } catch {
          // Ignore errors during teardown
        }
      }
      this.shell.stdin.end();
      this.shell.kill();
      this.shell = null;
      this.shellReady = false;
    }
  }

  /**
   * Generate a unique marker for separating command output
   * @returns {string}
   */
  generateMarker() {
    return randomBytes(8).toString('hex');
  }
}
