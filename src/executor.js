/**
 * Executor for shell commands
 * Runs commands and captures their output
 */

import { spawn } from 'child_process'
import dbg from 'debug'

const debug = dbg('cliscore:executor')

/**
 * Execute a shell command and capture its output
 * @param {string} command - The command to execute
 * @param {object} options - Execution options
 * @param {string} options.cwd - Working directory for command (default: process.cwd())
 * @param {object} options.env - Environment variables (default: process.env)
 * @param {string} options.shell - Shell to use (default: /bin/sh)
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<object>} Object with stdout, stderr, and exitCode
 */
export async function executeCommand(command, options = {}) {
  const cwd = options.cwd || process.cwd()
  const env = options.env || process.env
  const shell = options.shell || '/bin/sh'
  const timeout = options.timeout || 30000 // Default timeout: 30s

  debug(`Executing command: ${command}`)
  debug(`Working directory: ${cwd}`)

  return new Promise((resolve, reject) => {
    const child = spawn(shell, ['-c', command], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    const timeoutId = setTimeout(() => {
      debug(`Command timed out after ${timeout}ms`)
      killed = true
      child.kill()
      resolve({
        stdout,
        stderr: stderr + `\nCommand timed out after ${timeout}ms`,
        exitCode: 124 // Timeout exit code
      })
    }, timeout)

    child.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      debug(`stdout: ${text.replace(/\n/g, '\\n')}`)
    })

    child.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      debug(`stderr: ${text.replace(/\n/g, '\\n')}`)
    })

    child.on('close', (code) => {
      if (!killed) {
        clearTimeout(timeoutId)
        debug(`Command exited with code: ${code}`)
        resolve({
          stdout,
          stderr,
          exitCode: code
        })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timeoutId)
      debug(`Command execution error: ${err.message}`)
      reject(err)
    })
  })
}
