import { spawn } from 'child_process';
import { randomBytes } from 'crypto';

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
  constructor() {
    this.shell = null;
    this.shellReady = false;
  }

  /**
   * Start the shell process
   * @returns {Promise<void>}
   */
  async start() {
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

    const marker = this.generateMarker();
    const { command } = testCommand;

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
          resolve({
            success: exitCode === 0,
            stdout: stdoutLines,
            stderr: stderrLines,
            exitCode: exitCode ?? 0
          });
        }
      };

      const stdoutHandler = (data) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');

        // Keep the last incomplete line in the buffer
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          // Check for our end marker
          const markerMatch = line.match(new RegExp(`${stdoutEndMarker}:(\\d+)$`));
          if (markerMatch) {
            exitCode = parseInt(markerMatch[1], 10);
            stdoutComplete = true;
            this.shell.stdout.off('data', stdoutHandler);
            checkComplete();
            return;
          }
          stdoutLines.push(line);
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
      const fullCommand = `${command}
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
    if (this.shell) {
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
