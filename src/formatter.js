/**
 * Test result formatter
 * Formats test results into TAP (Test Anything Protocol) output
 */

import dbg from 'debug'

const debug = dbg('cliscore:formatter')

/**
 * Format test results in TAP format
 * @param {object} results - Test results to format
 * @returns {string} TAP formatted output
 */
export function formatTAP(results) {
  debug('Formatting results as TAP')

  let output = 'TAP version 13\n'

  output += `1..${results.commands.length}\n`

  for (let i = 0; i < results.commands.length; i++) {
    const result = results.commands[i]
    const testNumber = i + 1

    if (result.match) {
      output += `ok ${testNumber} - Command executed successfully\n`
    } else {
      output += `not ok ${testNumber} - Output did not match expected results\n`
      output += '  ---\n'
      output += `  command: |\n    ${result.command.replace(/\n/g, '\n    ')}\n`
      output += `  expected: |\n${result.expectedOutput.map(line => `    ${line}`).join('\n')}\n`
      output += '  actual: |\n'
      if (result.actualOutput) {
        output += `${result.actualOutput.split('\n').map(line => `    ${line}`).join('\n')}\n`
      }
      if (result.exitCode !== 0) {
        output += `  exitCode: ${result.exitCode}\n`
      }
      output += '  ...\n'
    }
  }

  // Summary
  const passed = results.commands.filter(r => r.match).length
  const failed = results.commands.filter(r => !r.match).length

  output += `\n# tests ${results.commands.length}\n`
  output += `# pass ${passed}\n`
  output += `# fail ${failed}\n`

  return output
}
