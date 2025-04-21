/**
 * Parser for .t test files
 * Extracts commands and expected outputs from test files
 */

import dbg from 'debug'

const debug = dbg('cliscore:parser')

/**
 * Parse a test file into commands and expected outputs
 * @param {string} content - The content of the test file
 * @param {object} options - Parsing options
 * @param {number} options.indent - Number of spaces for indentation (default: 2)
 * @returns {object} Object containing parsed commands and their expected outputs
 */
export function parseTestFile(content, options = {}) {
  const indent = options.indent || 2
  const indentStr = ' '.repeat(indent)
  const cmdPrefix = `${indentStr}$ `
  const contPrefix = `${indentStr}> `

  const lines = content.split('\n')
  const result = {
    commands: []
  }

  let currentCommand = null
  let currentCommandLines = []
  let currentExpectedOutput = []

  debug('Parsing test file content')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith(cmdPrefix)) {
      // If we have a command in progress, add it to the results
      if (currentCommand !== null) {
        result.commands.push({
          command: currentCommandLines.join('\n'),
          expectedOutput: currentExpectedOutput
        })
      }

      // Start a new command
      currentCommand = line.substring(cmdPrefix.length)
      currentCommandLines = [currentCommand]
      currentExpectedOutput = []
      debug(`Found command: ${currentCommand}`)
    } else if (line.startsWith(contPrefix)) {
      // Continuation of the current command
      if (currentCommand !== null) {
        const contLine = line.substring(contPrefix.length)
        currentCommandLines.push(contLine)
        debug(`Found command continuation: ${contLine}`)
      }
    } else if (line.startsWith(indentStr)) {
      // Expected output
      if (currentCommand !== null) {
        const outputLine = line.substring(indentStr.length)
        currentExpectedOutput.push(outputLine)
        debug(`Found expected output: ${outputLine}`)
      }
    }
    // Ignore other lines (comments)
  }

  // Add the last command if there is one
  if (currentCommand !== null) {
    result.commands.push({
      command: currentCommandLines.join('\n'),
      expectedOutput: currentExpectedOutput
    })
  }

  debug(`Parsed ${result.commands.length} commands`)
  return result
}
