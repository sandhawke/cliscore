/**
 * Executor for shell commands
 * Runs commands and captures their output
 */

import { spawn } from 'child_process'
import dbg from 'debug'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync, mkdirSync, unlinkSync } from 'fs'

const debug = dbg('cliscore:executor')

/**
 * Execute a shell command and capture its output
 * @param {string} command - The command to execute
 * @param {object} options - Execution options
 * @param {string} options.cwd - Working directory for command (default: process.cwd())
 * @param {object} options.env - Environment variables (default: process.env)
 * @param {string} options.shell - Shell to use (default: /bin/bash)
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {string} options.scriptFile - Path to a script file to append commands to (for persistent state)
 * @returns {Promise<object>} Object with stdout, stderr, and exitCode
 */
export async function executeCommand(command, options = {}) {
  const cwd = options.cwd || process.cwd()
  const env = options.env || process.env
  const shell = options.shell || '/bin/bash'
  const timeout = options.timeout || 30000 // Default timeout: 30s
  const scriptFile = options.scriptFile || null

  debug(`Executing command: ${command}`)
  debug(`Working directory: ${cwd}`)
  debug(`Using shell: ${shell}`)

  // Ensure the working directory exists
  if (!existsSync(cwd)) {
    debug(`Creating directory: ${cwd}`)
    mkdirSync(cwd, { recursive: true })
  }

  // Determine if this command might contain a here-document
  const mightContainHereDoc = command.includes('<<')

  // Create a temp script if the command might contain a here-document
  let tempScriptPath = null
  if (mightContainHereDoc) {
    tempScriptPath = join(cwd, `temp-cmd-${Date.now()}.sh`)
    // Source the script file if exists, then run the command
    const scriptContent = scriptFile ?
      `#!/bin/bash\nsource "${scriptFile}" 2>/dev/null >/dev/null || true\n${command}\n` :
      `#!/bin/bash\n${command}\n`
    await writeFile(tempScriptPath, scriptContent, { mode: 0o755 })
    debug(`Created temporary script at ${tempScriptPath}`)
  }

  // Prepare environment
  const testEnv = {
    ...env,
    SHELL: shell,
    CRAMTMP: cwd,
  }

  // Execute the command
  const result = await new Promise((resolve, reject) => {
    let childProcess

    if (tempScriptPath) {
      // Execute the temp script directly
      childProcess = spawn(tempScriptPath, [], {
        cwd,
        env: testEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } else {
      // For regular commands, source the script file if exists for environment setup
      // IMPORTANT: Redirect output when sourcing to /dev/null to prevent accumulation
      // but use a special technique to preserve variable values
      let fullCommand = command
      if (scriptFile) {
        // The fix: We need to redirect stdout/stderr to /dev/null when sourcing
        // but still allow environment variables to be preserved
        fullCommand = `{ source "${scriptFile}" || true; } > /dev/null 2>&1 && ${command}`
      }
      childProcess = spawn(shell, ['-c', fullCommand], {
        cwd,
        env: testEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    }

    let stdout = ''
    let stderr = ''
    let killed = false

    const timeoutId = setTimeout(() => {
      debug(`Command timed out after ${timeout}ms`)
      killed = true
      childProcess.kill()
      resolve({
        stdout,
        stderr: stderr + `\nCommand timed out after ${timeout}ms`,
        exitCode: 124 // Timeout exit code
      })
    }, timeout)

    childProcess.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      debug(`stdout: ${text.replace(/\n/g, '\\n')}`)
    })

    childProcess.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      debug(`stderr: ${text.replace(/\n/g, '\\n')}`)
    })

    childProcess.on('close', (code) => {
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

    childProcess.on('error', (err) => {
      clearTimeout(timeoutId)
      debug(`Command execution error: ${err.message}`)
      reject(err)
    })
  })

  // Clean up the temporary script
  if (tempScriptPath) {
    try {
      unlinkSync(tempScriptPath)
    } catch (err) {
      debug(`Failed to delete temporary script: ${err.message}`)
    }
  }

  // After execution, append the command to the script file for state persistence
  if (scriptFile) {
    await appendToScriptFile(scriptFile, command)
  }

  return result
}

/**
 * Append a command to a script file
 * @param {string} scriptFile - Path to the script file
 * @param {string} command - Command to append
 * @returns {Promise<void>}
 */
async function appendToScriptFile(scriptFile, command) {
  // Don't include exit status checks in the script file to avoid side effects
  const cleanCommand = command.replace(/\bexit\s+\d+\b/, '# $&')

  // Write commands in a way that preserves state but doesn't produce output when sourced
  // The curly braces with redirects ensure any output is suppressed but variables persist
  await writeFile(scriptFile, `{ ${cleanCommand}; } > /dev/null 2>&1\n`, { flag: 'a' })
  debug(`Appended command to script file: ${scriptFile}`)
}

/**
 * Create a temporary execution directory
 * @returns {Promise<string>} Path to the temporary directory
 */
export async function createTempExecutionDir() {
  // Create a unique directory name based on timestamp and random string
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const dirPath = join(tmpdir(), `cliscore-${timestamp}-${randomString}`)

  // Ensure the directory exists
  mkdirSync(dirPath, { recursive: true })
  debug(`Created temporary execution directory: ${dirPath}`)

  return dirPath
}

/**
 * Create a temporary script file for a test
 * @param {string} dir - Directory to create the script file in
 * @returns {Promise<string>} Path to the script file
 */
export async function createTempScriptFile(dir) {
  const scriptPath = join(dir, 'test-script.sh')
  await writeFile(scriptPath, '#!/bin/bash\n\n', { mode: 0o755 })
  debug(`Created temporary script file: ${scriptPath}`)
  return scriptPath
}
