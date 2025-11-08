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
 * @property {Array<[string, string]>} [captures] - Named capture assignments
 */

const VALID_CAPTURE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NAMED_CAPTURE_PATTERN = /\(\?<([A-Za-z_][A-Za-z0-9_]*)>/;
const NAMED_GROUP_ANY = /\(\?<([^>=!][^>]*)>/g;

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
  const captureMap = new Map();
  const captureOrder = [];

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

    if (result.captures) {
      for (const [name, value] of Object.entries(result.captures)) {
        if (!VALID_CAPTURE_NAME.test(name)) {
          return {
            success: false,
            error: `Invalid capture name "${name}". Capture names must match [A-Za-z_][A-Za-z0-9_]*`
          };
        }
        if (!captureMap.has(name)) {
          captureOrder.push(name);
        }
        const normalizedValue = value === undefined || value === null ? '' : String(value);
        captureMap.set(name, normalizedValue);
      }
    }
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

  const captures = captureOrder.map(name => [name, captureMap.get(name)]);
  return captures.length > 0
    ? { success: true, linesConsumed: actualIndex, captures }
    : { success: true, linesConsumed: actualIndex };
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
      const pattern = expectation.pattern ?? '';

      try {
        const invalidCaptureName = findInvalidCaptureName(pattern);
        if (invalidCaptureName) {
          return {
            success: false,
            error: `Invalid capture name "${invalidCaptureName}". Capture names must match [A-Za-z_][A-Za-z0-9_]*`
          };
        }

        const { source, flags, hasNamedCaptures } = buildInlineRegex(pattern);

        if (flags.includes('g') && hasNamedCaptures) {
          return {
            success: false,
            error: 'Global regex flag /g is not supported when using named capture groups'
          };
        }

        const regex = new RegExp(source, flags);
        const match = regex.exec(actualLine);
        if (!match) {
          return {
            success: false,
            error: 'Inline pattern did not match'
          };
        }

        return match.groups && Object.keys(match.groups).length > 0
          ? { success: true, captures: match.groups }
          : { success: true };
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
        const flags = expectation.flags || '';
        const hasNamedCaptures = NAMED_CAPTURE_PATTERN.test(expectation.pattern);

        const invalidCaptureName = findInvalidCaptureName(expectation.pattern);
        if (invalidCaptureName) {
          return {
            success: false,
            error: `Invalid capture name "${invalidCaptureName}". Capture names must match [A-Za-z_][A-Za-z0-9_]*`
          };
        }

        if (flags.includes('g') && hasNamedCaptures) {
          return {
            success: false,
            error: 'Global regex flag /g is not supported when using named capture groups'
          };
        }

        const regex = new RegExp(expectation.pattern, flags);
        const match = regex.exec(actualLine);
        if (match) {
          return match.groups && Object.keys(match.groups).length > 0
            ? { success: true, captures: match.groups }
            : { success: true };
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
 * Detect invalid capture group names before running the regex engine.
 * @param {string} pattern
 * @returns {string|null}
 */
function findInvalidCaptureName(pattern) {
  NAMED_GROUP_ANY.lastIndex = 0;
  let match;
  while ((match = NAMED_GROUP_ANY.exec(pattern)) !== null) {
    const name = match[1];
    if (!VALID_CAPTURE_NAME.test(name)) {
      return name;
    }
  }
  return null;
}

/**
 * Build a RegExp from an inline pattern, supporting nested [Matching] fragments and ellipsis tokens.
 * @param {string} pattern
 * @returns {{source: string, flags: string, hasNamedCaptures: boolean}}
 */
function buildInlineRegex(pattern) {
  const tokens = [];
  let buffer = '';
  let index = 0;

  const flushLiteral = () => {
    if (buffer.length > 0) {
      tokens.push({ type: 'literal', value: buffer });
      buffer = '';
    }
  };

  while (index < pattern.length) {
    const remaining = pattern.slice(index);

    if (remaining.startsWith('\\...')) {
      buffer += '...';
      index += 4;
      continue;
    }

    if (remaining.startsWith('[Matching glob:')) {
      const closing = findClosingBracket(pattern, index);
      if (closing === -1) {
        throw new Error('Unterminated [Matching glob: ...] inline expression');
      }
      const inside = pattern.slice(index + 15, closing);
      flushLiteral();
      tokens.push({ type: 'glob', pattern: inside.trim() });
      index = closing + 1;
      continue;
    }

    if (remaining.startsWith('[Matching:')) {
      const closing = findClosingBracket(pattern, index);
      if (closing === -1) {
        throw new Error('Unterminated [Matching: ...] inline expression');
      }
      const inside = pattern.slice(index + 10, closing);
      flushLiteral();
      const { regex, flags } = parseInlineRegexBody(inside.trim());
      tokens.push({ type: 'regex', pattern: regex, flags });
      index = closing + 1;
      continue;
    }

    if (remaining.startsWith('...')) {
      flushLiteral();
      tokens.push({ type: 'ellipsis' });
      index += 3;
      continue;
    }

    if (pattern[index] === '\\' && index + 1 < pattern.length) {
      buffer += pattern[index] + pattern[index + 1];
      index += 2;
      continue;
    }

    buffer += pattern[index];
    index++;
  }

  flushLiteral();

  let regexSource = '';
  const flagSet = new Set();
  let hasNamedCaptures = false;

  for (const token of tokens) {
    switch (token.type) {
      case 'literal':
        regexSource += escapeRegex(token.value);
        break;
      case 'regex':
        if (token.flags) {
          for (const flag of token.flags) {
            flagSet.add(flag);
          }
        }
        if (NAMED_CAPTURE_PATTERN.test(token.pattern)) {
          hasNamedCaptures = true;
        }
        regexSource += `(${token.pattern})`;
        break;
      case 'glob': {
        const globSource = globToRegexPattern(token.pattern);
        regexSource += `(${globSource})`;
        break;
      }
      case 'ellipsis':
        regexSource += '(?:[\\s\\S]*?)';
        break;
      default:
        break;
    }
  }

  if (NAMED_CAPTURE_PATTERN.test(pattern)) {
    hasNamedCaptures = true;
  }

  const flags = Array.from(flagSet).join('');
  return {
    source: `^${regexSource}$`,
    flags,
    hasNamedCaptures
  };
}

/**
 * Locate the closing bracket for an inline [Matching …] expression.
 * @param {string} pattern
 * @param {number} start
 * @returns {number}
 */
function findClosingBracket(pattern, start) {
  let escaped = false;
  let inCharClass = false;
  for (let i = start + 1; i < pattern.length; i++) {
    const char = pattern[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '[') {
      inCharClass = true;
      continue;
    }
    if (char === ']' && inCharClass) {
      inCharClass = false;
      continue;
    }
    if (char === ']' && !inCharClass) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse the body of an inline [Matching: …] expression.
 * @param {string} body
 * @returns {{regex: string, flags: string}}
 */
function parseInlineRegexBody(body) {
  if (!body.startsWith('/')) {
    throw new Error('Inline [Matching: ...] expressions must use /pattern/flags syntax');
  }

  let escaped = false;
  let pattern = '';
  let terminatorIndex = -1;

  for (let i = 1; i < body.length; i++) {
    const char = body[i];
    if (!escaped && char === '/') {
      terminatorIndex = i;
      break;
    }
    if (!escaped && char === '\\') {
      escaped = true;
      pattern += char;
      continue;
    }
    escaped = false;
    pattern += char;
  }

  if (terminatorIndex === -1) {
    throw new Error('Inline [Matching: ...] expression is missing a closing "/"');
  }

  const flags = body.slice(terminatorIndex + 1);
  if (!/^[gimsuvy]*$/.test(flags)) {
    throw new Error(`Invalid regex flags "${flags}" in inline [Matching: ...] expression`);
  }

  return { regex: pattern, flags };
}

/**
 * Escape literal content so it can be embedded in a regex.
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a glob pattern into a regex source fragment without anchors.
 * @param {string} pattern
 * @returns {string}
 */
function globToRegexPattern(pattern) {
  const regex = globToRegex(pattern);
  let source = regex.source;
  if (source.startsWith('^')) {
    source = source.slice(1);
  }
  if (source.endsWith('$')) {
    source = source.slice(0, -1);
  }
  return source;
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
    case 'inline':
      return expectation.pattern;
    case 'skip':
      return `[SKIP: ${expectation.reason}]`;
    case 'stderr':
      return `[stderr: ${expectation.pattern}]`;
    default:
      return String(expectation);
  }
}
