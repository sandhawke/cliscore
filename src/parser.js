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
 * @param {string} options.fileName - Name of the test file (for error reporting)
 * @returns {object} Object containing parsed commands and their expected outputs
 */
export function parseTestFile(content, options = {}) {
  const indent = options.indent || 2
  const indentStr = ' '.repeat(indent)
  const cmdPrefix = `${indentStr}$ `
  const contPrefix = `${indentStr}> `
  const fileName = options.fileName || 'unknown-file'

  const lines = content.split('\n')
  const result = {
    commands: []
  }

  let currentCommand = null
  let currentCommandLines = []
  let currentExpectedOutput = []
  let commandStartLine = -1
  let outputStartLine = -1
  let lastSection = null

  debug('Parsing test file content')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    if (line.startsWith(cmdPrefix)) {
      // If we have a command in progress, add it to the results
      if (currentCommand !== null) {
        result.commands.push({
          command: currentCommandLines.join('\n'),
          expectedOutput: currentExpectedOutput,
          lineInfo: {
            file: fileName,
            commandLine: commandStartLine,
            outputStartLine: outputStartLine
          }
        })
      }

      // Start a new command
      currentCommand = line.substring(cmdPrefix.length)
      currentCommandLines = [currentCommand]
      currentExpectedOutput = []
      commandStartLine = lineNumber
      outputStartLine = -1
      lastSection = 'command'
      debug(`Found command at line ${lineNumber}: ${currentCommand}`)
    } else if (line.startsWith(contPrefix)) {
      // Continuation of the current command
      if (currentCommand !== null) {
        const contLine = line.substring(contPrefix.length)
        currentCommandLines.push(contLine)
        lastSection = 'command'
        debug(`Found command continuation at line ${lineNumber}: ${contLine}`)
      }
    } else if (line.startsWith(indentStr)) {
      // Expected output
      if (currentCommand !== null) {
        const outputLine = line.substring(indentStr.length)
        currentExpectedOutput.push(outputLine)
        if (lastSection === 'command' && outputStartLine === -1) {
          outputStartLine = lineNumber
        }
        lastSection = 'output'
        debug(`Found expected output at line ${lineNumber}: ${outputLine}`)
      }
    }
    // Ignore other lines (comments)
  }

  // Add the last command if there is one
  if (currentCommand !== null) {
    result.commands.push({
      command: currentCommandLines.join('\n'),
      expectedOutput: currentExpectedOutput,
      lineInfo: {
        file: fileName,
        commandLine: commandStartLine,
        outputStartLine: outputStartLine
      }
    })
  }

  debug(`Parsed ${result.commands.length} commands`)
  return result
}
