import { readFile } from 'fs/promises';
import { basename } from 'path';

/**
 * @typedef {Object} TestCommand
 * @property {string} command - The command to execute
 * @property {OutputExpectation[]} expectedOutput - Expected output patterns
 * @property {number} lineNumber - Source line number
 */

/**
 * @typedef {Object} OutputExpectation
 * @property {'literal'|'regex'|'glob'|'ellipsis'|'no-eol'} type
 * @property {string} [pattern] - Pattern to match (not used for ellipsis)
 * @property {string} [flags] - Regex flags (for regex type)
 */

/**
 * @typedef {Object} TestFile
 * @property {string} path - File path
 * @property {TestCommand[]} tests - Parsed test commands
 */

/**
 * Parse a test file based on its extension
 * @param {string} filePath - Path to the test file
 * @param {string[]} allowedLanguages - Additional language identifiers for markdown code blocks
 * @returns {Promise<TestFile>}
 */
export async function parseTestFile(filePath, allowedLanguages = ['cliscore']) {
  const content = await readFile(filePath, 'utf-8');
  const ext = filePath.split('.').pop();

  let tests;
  if (ext === 't') {
    tests = parseUTFFormat(content);
  } else if (ext === 'md') {
    tests = parseMarkdownFormat(content, allowedLanguages);
  } else if (ext === 'cliscore') {
    tests = parseCliscoreFormat(content, allowedLanguages);
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  return { path: filePath, tests };
}

/**
 * Parse UTF (Unified Test Format) style content
 * @param {string} content - File content
 * @returns {TestCommand[]}
 */
function parseUTFFormat(content) {
  const lines = content.split('\n');
  const tests = [];
  let currentCommand = null;
  let currentOutput = [];
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Command line: "  $ command" or "  # command"
    if (/^  [\$#] /.test(line)) {
      if (currentCommand) {
        currentCommand.expectedOutput = parseOutputExpectations(currentOutput);
        tests.push(currentCommand);
      }
      currentCommand = {
        command: line.slice(4),
        expectedOutput: [],
        lineNumber
      };
      currentOutput = [];
    }
    // Continuation line: "  > continuation"
    else if (/^  > /.test(line)) {
      if (currentCommand) {
        currentCommand.command += '\n' + line.slice(4);
      }
    }
    // Output line: "  output"
    else if (/^  /.test(line) && currentCommand) {
      currentOutput.push(line.slice(2));
    }
    // Comments or empty lines - ignored
  }

  // Don't forget the last command
  if (currentCommand) {
    currentCommand.expectedOutput = parseOutputExpectations(currentOutput);
    tests.push(currentCommand);
  }

  return tests;
}

/**
 * Parse markdown format, extracting code blocks
 * @param {string} content - File content
 * @param {string[]} allowedLanguages - Language identifiers to accept
 * @returns {TestCommand[]}
 */
function parseMarkdownFormat(content, allowedLanguages) {
  const tests = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockContent = [];
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // Check for code block start/end
    const codeBlockMatch = line.match(/^```([\w-]+)?/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        const lang = codeBlockMatch[1] || '';
        if (allowedLanguages.includes(lang)) {
          inCodeBlock = true;
          codeBlockContent = [];
        }
      } else {
        // End of code block - parse it
        const blockTests = parseCodeBlock(codeBlockContent.join('\n'), lineNumber - codeBlockContent.length);
        tests.push(...blockTests);
        inCodeBlock = false;
        codeBlockContent = [];
      }
    } else if (inCodeBlock) {
      codeBlockContent.push(line);
    }
  }

  return tests;
}

/**
 * Parse .cliscore format (accepts both UTF style and markdown style)
 * @param {string} content - File content
 * @param {string[]} allowedLanguages - Language identifiers to accept
 * @returns {TestCommand[]}
 */
function parseCliscoreFormat(content, allowedLanguages) {
  // Try markdown format first
  if (content.includes('```')) {
    return parseMarkdownFormat(content, allowedLanguages);
  }
  // Fall back to UTF format
  return parseUTFFormat(content);
}

/**
 * Parse a code block containing shell-like test commands
 * @param {string} content - Code block content
 * @param {number} startLine - Starting line number
 * @returns {TestCommand[]}
 */
function parseCodeBlock(content, startLine) {
  const lines = content.split('\n');
  const tests = [];
  let currentCommand = null;
  let currentOutput = [];
  let lineOffset = 0;

  for (const line of lines) {
    lineOffset++;

    // Prompt patterns: "$ cmd", "alice$ cmd", "alice@host$ cmd", "# cmd", etc.
    const promptMatch = line.match(/^(?:[\w.-]+(?:@[\w.-]+)?)?[\$#] (.+)$/);
    if (promptMatch) {
      if (currentCommand) {
        currentCommand.expectedOutput = parseOutputExpectations(currentOutput);
        tests.push(currentCommand);
      }
      currentCommand = {
        command: promptMatch[1],
        expectedOutput: [],
        lineNumber: startLine + lineOffset
      };
      currentOutput = [];
    }
    // Continuation line: "  > continuation" or just "> continuation"
    else if (/^\s*> /.test(line)) {
      if (currentCommand) {
        currentCommand.command += '\n' + line.replace(/^\s*> /, '');
      }
    }
    // Output line (including empty lines)
    else if (currentCommand) {
      currentOutput.push(line);
    }
  }

  // Don't forget the last command
  if (currentCommand) {
    currentCommand.expectedOutput = parseOutputExpectations(currentOutput);
    tests.push(currentCommand);
  }

  return tests;
}

/**
 * Parse output expectations from lines of expected output
 * @param {string[]} lines - Output lines
 * @returns {OutputExpectation[]}
 */
function parseOutputExpectations(lines) {
  const expectations = [];

  for (let line of lines) {
    // Check for UTF format suffixes
    if (line.endsWith(' (re)')) {
      const pattern = line.slice(0, -5);
      expectations.push({ type: 'regex', pattern });
    } else if (line.endsWith(' (glob)')) {
      const pattern = line.slice(0, -7);
      expectations.push({ type: 'glob', pattern });
    } else if (line.endsWith(' (no-eol)')) {
      const pattern = line.slice(0, -9);
      expectations.push({ type: 'no-eol', pattern });
    } else if (line.endsWith(' (esc)')) {
      const pattern = line.slice(0, -6);
      expectations.push({ type: 'literal', pattern });
    }
    // Check for ellipsis
    else if (line === '...') {
      expectations.push({ type: 'ellipsis' });
    }
    // Check for bracketed special syntax
    else if (line.startsWith('[') && line.endsWith(']')) {
      const inside = line.slice(1, -1);

      if (inside.startsWith('Literal text: ')) {
        const pattern = inside.slice(14).replace(/^"(.*)"$/, '$1');
        expectations.push({ type: 'literal', pattern });
      } else if (inside.startsWith('Matching glob: ')) {
        const pattern = inside.slice(15);
        expectations.push({ type: 'glob', pattern });
      } else if (inside.startsWith('Matching: ')) {
        const pattern = inside.slice(10);
        const { regex, flags } = parseRegexPattern(pattern);
        expectations.push({ type: 'regex', pattern: regex, flags });
      } else if (inside === 'Output ends without end-of-line') {
        expectations.push({ type: 'no-eol' });
      } else {
        // Unknown bracket format, treat as literal
        expectations.push({ type: 'literal', pattern: line });
      }
    }
    // Default: literal match
    else {
      expectations.push({ type: 'literal', pattern: line });
    }
  }

  return expectations;
}

/**
 * Parse regex pattern, extracting flags if present
 * @param {string} pattern - Regex pattern string
 * @returns {{regex: string, flags?: string}}
 */
function parseRegexPattern(pattern) {
  // Check for /pattern/flags format
  const match = pattern.match(/^\/(.*)\/([gimsuvy]*)$/);
  if (match) {
    return { regex: match[1], flags: match[2] || undefined };
  }
  return { regex: pattern };
}
