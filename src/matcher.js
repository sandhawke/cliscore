/**
 * @typedef {import('./parser.js').OutputExpectation} OutputExpectation
 */

/**
 * @typedef {Object} MatchResult
 * @property {boolean} success - Whether the match succeeded
 * @property {string} [error] - Error message if match failed
 * @property {number} [linesConsumed] - Number of output lines consumed
 * @property {boolean} [skipped] - Whether the test was skipped
 * @property {string} [skipReason] - Reason for skipping
 */

/**
 * Match actual output against expected output patterns
 * @param {string[]} stdout - Actual stdout lines
 * @param {string[]} stderr - Actual stderr lines
 * @param {OutputExpectation[]} expectations - Expected output patterns
 * @returns {MatchResult}
 */
export function matchOutput(stdout, stderr, expectations) {
  // Check if test should be skipped
  const skipExpectation = expectations.find(e => e.type === 'skip');
  if (skipExpectation) {
    return {
      success: true,
      skipped: true,
      skipReason: skipExpectation.reason || 'No reason provided'
    };
  }

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
    // Generate helpful suggestion showing what to add
    const suggestions = [];
    for (let i = actualIndex; i < Math.min(actualIndex + 3, combinedOutput.length); i++) {
      const line = combinedOutput[i].line;
      if (combinedOutput[i].stream === 'stderr') {
        suggestions.push(`[stderr: ${line}]`);
      } else {
        suggestions.push(line);
      }
    }

    const more = combinedOutput.length - actualIndex > 3 ? `\n  ... (${combinedOutput.length - actualIndex - 3} more lines)` : '';

    return {
      success: false,
      error: `Unexpected extra output:\n  ${unmatchedLines.slice(0, 3).join('\n  ')}${more}\n\nHint: Add these lines to your test:\n  ${suggestions.join('\n  ')}`
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
    case 'inline': {
      // Handle inline patterns like: text [Matching: /\d+/] more text
      const pattern = expectation.pattern;

      // Build regex by replacing inline patterns with their regex equivalents
      let regexPattern = pattern;

      // Replace [Matching: /regex/flags] with captured group
      regexPattern = regexPattern.replace(/\[Matching:\s*\/([^\/]+)\/([gimsuvy]*)\]/g, (match, regex, flags) => {
        // For inline matching, we ignore flags for simplicity and just use the pattern
        return `(${regex})`;
      });

      // Replace [Matching glob: pattern] with glob-converted regex
      regexPattern = regexPattern.replace(/\[Matching glob:\s*([^\]]+)\]/g, (match, globPattern) => {
        // Convert glob to regex pattern
        let glob = globPattern.trim();
        glob = glob.replace(/\*/g, '.*').replace(/\?/g, '.');
        return `(${glob})`;
      });

      // Escape special regex characters in the literal parts
      // First, mark the parts we want to keep as-is
      const markers = [];
      regexPattern = regexPattern.replace(/\([^)]+\)/g, (match) => {
        markers.push(match);
        return `__MARKER_${markers.length - 1}__`;
      });

      // Escape the literal parts
      regexPattern = regexPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

      // Restore the markers
      markers.forEach((marker, i) => {
        regexPattern = regexPattern.replace(`__MARKER_${i}__`, marker);
      });

      // Try to match
      try {
        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(actualLine)) {
          return { success: true };
        }
        return {
          success: false,
          error: `Inline pattern did not match`
        };
      } catch (err) {
        return {
          success: false,
          error: `Invalid inline pattern: ${err.message}`
        };
      }
    }

    case 'literal':
      // Try literal match first (as per UTF spec)
      if (actualLine === expectation.pattern) {
        return { success: true };
      }

      // Provide helpful suggestions for common mistakes
      let suggestion = '';
      if (actualLine.includes(expectation.pattern)) {
        suggestion = ' (expected text appears but with extra characters)';
      } else if (expectation.pattern.includes(actualLine)) {
        suggestion = ' (actual output is a subset of expected)';
      } else if (actualLine.toLowerCase() === expectation.pattern.toLowerCase()) {
        suggestion = ' (case mismatch - actual is different case)';
      } else if (actualLine.trim() === expectation.pattern.trim()) {
        suggestion = ' (whitespace mismatch - try checking leading/trailing spaces)';
      }

      return {
        success: false,
        error: `Literal mismatch${suggestion}`
      };

    case 'regex': {
      try {
        const regex = new RegExp(expectation.pattern, expectation.flags);
        if (regex.test(actualLine)) {
          return { success: true };
        }

        // Provide suggestion for regex issues
        let suggestion = '';
        if (!expectation.flags || !expectation.flags.includes('i')) {
          // Test if case-insensitive would work
          const caseInsensitiveRegex = new RegExp(expectation.pattern, (expectation.flags || '') + 'i');
          if (caseInsensitiveRegex.test(actualLine)) {
            suggestion = ' (hint: would match with case-insensitive flag /i)';
          }
        }

        return {
          success: false,
          error: `Regex did not match: /${expectation.pattern}/${expectation.flags || ''}${suggestion}`
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
