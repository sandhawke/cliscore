/**
 * cliscore - Testing framework for anything with a CLI
 * Compatible with cram and mercurial unified test format
 */

import dbg from 'debug'
import { parseTestFile } from './src/parser.js'
import { executeCommand } from './src/executor.js'
import { matchOutput } from './src/matcher.js'
import { formatTAP } from './src/formatter.js'

const debug = dbg('cliscore')

/**
 * Run a test file and return the results
 * @param {object} options - Test options
 * @param {string} options.content - Content of the test file
 * @param {string} options.executionDir - Directory to execute commands in (default: process.cwd())
 * @param {object} options.env - Environment variables for commands (default: {})
 * @param {function} options.onOutput - Callback for command output (default: null)
 * @param {string} options.shell - Shell to use for commands (default: /bin/sh)
 * @param {number} options.timeout - Command timeout in ms (default: 30000)
 * @returns {Promise<object>} Test results
 */
export async function runTest(options) {
  const {
    content,
    executionDir = process.cwd(),
    env = {},
    onOutput = null,
    shell = '/bin/sh',
    timeout = 30000
  } = options

  debug(`Running test in directory: ${executionDir}`)

  // Parse test file
  const test = parseTestFile(content)

  // Set up execution environment
  const execOptions = {
    cwd: executionDir,
    env: { ...process.env, ...env },
    shell,
    timeout
  }

  const results = {
    succeeded: true,
    commands: []
  }

  // Execute each command and check output
  for (const command of test.commands) {
    debug(`Executing command: ${command.command}`)

    const execResult = await executeCommand(command.command, execOptions)

    if (onOutput) {
      onOutput(command.command, execResult.stdout, execResult.stderr)
    }

    const match = matchOutput({
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      exitCode: execResult.exitCode,
      expectedOutput: command.expectedOutput
    })

    results.commands.push({
      command: command.command,
      expectedOutput: command.expectedOutput,
      actualOutput: execResult.stdout + execResult.stderr,
      exitCode: execResult.exitCode,
      match: match.matched,
      matchDetails: match.details
    })

    if (!match.matched) {
      results.succeeded = false
    }
  }

  debug(`Test completion: ${results.succeeded ? 'PASS' : 'FAIL'}`)
  return results
}

/**
 * Format test results as TAP output
 * @param {object} results - Test results to format
 * @returns {string} TAP formatted output
 */
export function formatAsOutput(results) {
  return formatTAP(results)
}

export default {
  runTest,
  formatAsOutput
}
