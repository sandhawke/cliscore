/**
 * Command-line interface for cliscore
 */

import fs from 'fs'
import path from 'path'
import dbg from 'debug'
import { runTest, formatAsOutput } from '../index.js'
import { createTempExecutionDir } from './executor.js'

const debug = dbg('cliscore:cli')

/**
 * Run the cliscore CLI
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<number>} Exit code (0 for success, non-zero for failure)
 */
export async function cli(args) {
  debug(`Starting cliscore with args: ${args.join(' ')}`)

  if (args.length === 0) {
    console.error('Usage: cliscore <test-file> [<test-file> ...]')
    return 1
  }

  let allPassed = true
  let tempDirs = []

  for (const file of args) {
    if (!file.endsWith('.t')) {
      console.error(`Error: ${file} is not a .t file`)
      allPassed = false
      continue
    }

    try {
      debug(`Reading file: ${file}`)
      const content = fs.readFileSync(file, 'utf8')

      // Create a clean temporary directory for this test
      const testDir = await createTempExecutionDir()
      tempDirs.push(testDir)

      const result = await runTest({
        content,
        executionDir: testDir,
        env: {
          // Pass the original source directory for reference
          TESTDIR: path.dirname(path.resolve(file)),
          TESTFILE: path.basename(file)
        },
        onOutput: (command, stdout, stderr) => {
          debug(`Command: ${command}`)
          debug(`stdout: ${stdout}`)
          debug(`stderr: ${stderr}`)
        }
      })

      console.log(formatAsOutput(result))

      if (!result.succeeded) {
        allPassed = false
      }
    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`)
      debug(`Stack trace: ${err.stack}`)
      allPassed = false
    }
  }

  // Cleanup could be added here if desired
  // for (const dir of tempDirs) {
  //   fs.rmSync(dir, { recursive: true, force: true });
  // }

  return allPassed ? 0 : 1
}

// Run the CLI if this module is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli(process.argv.slice(2))
    .then(exitCode => process.exit(exitCode))
    .catch(err => {
      console.error('Unhandled error:', err)
      process.exit(1)
    })
}
