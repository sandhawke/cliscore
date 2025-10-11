/**
 * @typedef {import('./parser.js').OutputExpectation} OutputExpectation
 */

/**
 * @typedef {Object} MatchResult
 * @property {boolean} success - Whether the match succeeded
 * @property {string} [error] - Error message if match failed
 * @property {number} [linesConsumed] - Number of output lines consumed
 */

/**
 * Match actual output against expected output patterns
 * @param {string[]} stdout - Actual stdout lines
 * @param {string[]} stderr - Actual stderr lines
 * @param {OutputExpectation[]} expectations - Expected output patterns
 * @returns {MatchResult}
 */
export function matchOutput(stdout, stderr, expectations) {
  // Combine stdout and stderr with metadata about which stream each line came from
  const combinedOutput = [
    ...stdout.map(line => ({ line, stream: 'stdout' })),
    ...stderr.map(line => ({ line, stream: 'stderr' }))
  ];

  let actualIndex = 0;
  let expectIndex = 0;

  while (expectIndex < expectations.length) {
    const expectation = expectations[expectIndex];

    if (expectation.type === 'ellipsis') {
      // Ellipsis matches zero or more lines
      // Look ahead to find what comes after the ellipsis
      expectIndex++;

      if (expectIndex >= expectations.length) {
        // Ellipsis at the end matches everything remaining
        return { success: true, linesConsumed: combinedOutput.length };
      }

      // Find where the next expectation matches
      const nextExpectation = expectations[expectIndex];
      let found = false;

      for (let i = actualIndex; i < combinedOutput.length; i++) {
        const expectedStream = nextExpectation.stream || 'stdout';
        if (combinedOutput[i].stream !== expectedStream) {
          continue;
        }
        const result = matchSingleLine(combinedOutput[i].line, nextExpectation);
        if (result.success) {
          actualIndex = i;
          found = true;
          break;
        }
      }

      if (!found) {
        return {
          success: false,
          error: `Could not find match for pattern after ellipsis: ${formatExpectation(expectation)}`
        };
      }
      // Continue to match the next expectation normally
      continue;
    }

    // Find next line from the expected stream
    const expectedStream = expectation.stream || 'stdout';
    while (actualIndex < combinedOutput.length && combinedOutput[actualIndex].stream !== expectedStream) {
      actualIndex++;
    }

    if (actualIndex >= combinedOutput.length) {
      return {
        success: false,
        error: `Expected more ${expectedStream}. Missing: ${formatExpectation(expectation)}`
      };
    }

    const result = matchSingleLine(combinedOutput[actualIndex].line, expectation);
    if (!result.success) {
      return {
        success: false,
        error: `Line ${actualIndex + 1} (${expectedStream}): ${result.error}\n  Expected: ${formatExpectation(expectation)}\n  Got: ${combinedOutput[actualIndex].line}`
      };
    }

    actualIndex++;
    expectIndex++;
  }

  // Check if there's unexpected extra output (only on the streams we were checking)
  const unmatchedLines = [];
  for (let i = actualIndex; i < combinedOutput.length; i++) {
    unmatchedLines.push(`[${combinedOutput[i].stream}] ${combinedOutput[i].line}`);
  }

  if (unmatchedLines.length > 0) {
    return {
      success: false,
      error: `Unexpected extra output:\n  ${unmatchedLines.join('\n  ')}`
    };
  }

  return { success: true, linesConsumed: actualIndex };
}

/**
 * Match a single line against an expectation
 * @param {string} actualLine - Actual output line
 * @param {OutputExpectation} expectation - Expected pattern
 * @returns {MatchResult}
 */
function matchSingleLine(actualLine, expectation) {
  switch (expectation.type) {
    case 'literal':
      // Try literal match first (as per UTF spec)
      if (actualLine === expectation.pattern) {
        return { success: true };
      }
      return {
        success: false,
        error: `Literal mismatch`
      };

    case 'regex': {
      try {
        const regex = new RegExp(expectation.pattern, expectation.flags);
        if (regex.test(actualLine)) {
          return { success: true };
        }
        return {
          success: false,
          error: `Regex did not match`
        };
      } catch (err) {
        return {
          success: false,
          error: `Invalid regex: ${err.message}`
        };
      }
    }

    case 'glob': {
      const regex = globToRegex(expectation.pattern);
      if (regex.test(actualLine)) {
        return { success: true };
      }
      return {
        success: false,
        error: `Glob pattern did not match`
      };
    }

    case 'no-eol':
      // For no-eol, we need to check if the line matches and doesn't end with newline
      // This is tricky in our line-based system - we'll handle this at the executor level
      if (expectation.pattern !== undefined) {
        if (actualLine === expectation.pattern) {
          return { success: true };
        }
        return {
          success: false,
          error: `No-EOL pattern did not match`
        };
      }
      return { success: true };

    default:
      return {
        success: false,
        error: `Unknown expectation type: ${expectation.type}`
      };
  }
}

/**
 * Convert a glob pattern to a regular expression
 * @param {string} pattern - Glob pattern
 * @returns {RegExp}
 */
function globToRegex(pattern) {
  let regex = '^';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '\\' && i + 1 < pattern.length) {
      // Escaped character
      const nextChar = pattern[i + 1];
      if (nextChar === '*' || nextChar === '?' || nextChar === '\\') {
        regex += '\\' + nextChar;
        i += 2;
      } else {
        regex += '\\\\';
        i++;
      }
    } else if (char === '*') {
      regex += '.*';
      i++;
    } else if (char === '?') {
      regex += '.';
      i++;
    } else {
      // Escape regex special characters
      regex += char.replace(/[.+^${}()|[\]]/g, '\\$&');
      i++;
    }
  }

  regex += '$';
  return new RegExp(regex);
}

/**
 * Format an expectation for display in error messages
 * @param {OutputExpectation} expectation
 * @returns {string}
 */
function formatExpectation(expectation) {
  switch (expectation.type) {
    case 'literal':
      return expectation.pattern;
    case 'regex':
      return expectation.flags
        ? `/${expectation.pattern}/${expectation.flags}`
        : expectation.pattern;
    case 'glob':
      return `${expectation.pattern} (glob)`;
    case 'ellipsis':
      return '...';
    case 'no-eol':
      return expectation.pattern
        ? `${expectation.pattern} (no-eol)`
        : '(no-eol)';
    default:
      return String(expectation);
  }
}
