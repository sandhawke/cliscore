/**
 * Output matcher
 * Compares actual output to expected output with support for special matchers
 */

import dbg from 'debug'

const debug = dbg('cliscore:matcher')

/**
 * Match actual output against expected output
 * @param {object} options - Matching options
 * @param {string} options.stdout - Actual stdout from command
 * @param {string} options.stderr - Actual stderr from command
 * @param {number} options.exitCode - Command's exit code
 * @param {string[]} options.expectedOutput - Expected output lines
 * @returns {object} Result with matched status and details
 */
export function matchOutput(options) {
  const { stdout, stderr, exitCode, expectedOutput } = options

  // Combine stdout and stderr to match against expected output
  let actualOutput = stdout + stderr

  // Check for expected exit code in last line
  let expectedExitCode = null
  let expectedOutputLines = [...expectedOutput]

  const lastLine = expectedOutputLines[expectedOutputLines.length - 1] || ''
  const exitCodeMatch = lastLine.match(/\[(\d+)\]$/)

  if (exitCodeMatch) {
    expectedExitCode = parseInt(exitCodeMatch[1], 10)
    // Remove exit code from last line
    expectedOutputLines[expectedOutputLines.length - 1] = lastLine.substring(0, exitCodeMatch.index).trimEnd()

    // Remove last line if now empty
    if (expectedOutputLines[expectedOutputLines.length - 1] === '') {
      expectedOutputLines.pop()
    }

    debug(`Expected exit code: ${expectedExitCode}, Actual: ${exitCode}`)
  }

  // Exit code mismatch
  if (expectedExitCode !== null && expectedExitCode !== exitCode) {
    return {
      matched: false,
      details: [
        {
          matched: false,
          type: 'exitCode',
          expected: expectedExitCode,
          actual: exitCode
        }
      ]
    }
  }

  // Empty case
  if (expectedOutputLines.length === 0 && actualOutput.trim() === '') {
    return { matched: true, details: [] }
  }

  // Split output into lines
  const actualLines = actualOutput.split('\n')
  // Remove trailing empty line (from final newline)
  if (actualLines[actualLines.length - 1] === '') {
    actualLines.pop()
  }

  const results = {
    matched: true,
    details: []
  }

  // Compare each line
  for (let i = 0; i < expectedOutputLines.length; i++) {
    const expectedLine = expectedOutputLines[i]
    const actualLine = actualLines[i] || ''

    // Try exact match first
    if (actualLine === expectedLine) {
      results.details.push({ line: i, matched: true, type: 'exact' })
      continue
    }

    // Check for special matchers
    if (expectedLine.endsWith(' (re)')) {
      const pattern = expectedLine.substring(0, expectedLine.length - 5)
      try {
        const regex = new RegExp(`^${pattern}$`)
        if (regex.test(actualLine)) {
          results.details.push({ line: i, matched: true, type: 're' })
          continue
        }
      } catch (e) {
        debug(`Invalid regex pattern: ${pattern}`)
      }
    } else if (expectedLine.endsWith(' (glob)')) {
      const pattern = expectedLine.substring(0, expectedLine.length - 7)

      // Convert glob pattern to regex, properly handling escaped characters
      const globToRegex = (glob) => {
        let regex = '';
        let i = 0;

        while (i < glob.length) {
          const char = glob[i];

          if (char === '\\' && i + 1 < glob.length) {
            // Handle escaped characters - they should match literally
            const nextChar = glob[i + 1];
            if (nextChar === '*' || nextChar === '?' || nextChar === '\\') {
              regex += escapeRegExp(nextChar);
              i += 2;
              continue;
            }
          }

          if (char === '*') {
            regex += '.*';
          } else if (char === '?') {
            regex += '.';
          } else {
            regex += escapeRegExp(char);
          }

          i++;
        }

        return regex;
      };

      // Escape special regex characters for literal matching
      const escapeRegExp = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };

      try {
        const regexPattern = globToRegex(pattern);
        const regex = new RegExp(`^${regexPattern}$`);

        debug(`Converting glob '${pattern}' to regex: ${regex}`);

        if (regex.test(actualLine)) {
          results.details.push({ line: i, matched: true, type: 'glob' });
          continue;
        }
      } catch (e) {
        debug(`Invalid glob pattern: ${pattern}`, e);
      }
    } else if (expectedLine.endsWith(' (no-eol)')) {
      const expectedContent = expectedLine.substring(0, expectedLine.length - 9)
      if (actualLine === expectedContent && i === expectedOutputLines.length - 1 && !actualOutput.endsWith('\n')) {
        results.details.push({ line: i, matched: true, type: 'no-eol' })
        continue
      }
    } else if (expectedLine.endsWith(' (?)')) {
      // Optional line, can be skipped
      results.details.push({ line: i, matched: true, type: 'optional' })
      continue
    }

    // Line didn't match
    results.matched = false
    results.details.push({
      line: i,
      matched: false,
      expected: expectedLine,
      actual: actualLine
    })
  }

  // Check for extra actual lines
  if (actualLines.length > expectedOutputLines.length) {
    results.matched = false
    for (let i = expectedOutputLines.length; i < actualLines.length; i++) {
      results.details.push({
        line: i,
        matched: false,
        expected: null,
        actual: actualLines[i]
      })
    }
  }

  debug(`Match result: ${results.matched ? 'MATCH' : 'NO MATCH'}`)
  return results
}
