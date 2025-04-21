# cliscore
[![NPM version][npm-image]][npm-url]

Testing framework for anything with a CLI. Compatible with cram and mercurial unified test formats.

## Installation

```bash
npm install cliscore
```

## Usage

### Command Line

```bash
# Run a single test file
cliscore test/example.t

# Run multiple test files
cliscore test/*.t
```

### Library API

```javascript
import { runTest, formatAsOutput } from 'cliscore';

// Run a test from a string
const testContent = `
Example test:
  $ echo "Hello World"
  Hello World
`;

const results = await runTest({ content: testContent });
console.log(formatAsOutput(results));
```

## Test File Format

Tests are written in a format that resembles interactive shell sessions:

```
Description of test:

  $ echo "Hello World"
  Hello World

  $ echo "multi-line
  > command"
  multi-line
  command
```

Lines starting with `  $ ` are commands to execute, lines starting with `  > ` are continuations
of multi-line commands, and other indented lines are expected output.

### Special Matchers

- **Regular expressions**: `output\d+ (re)` - Matches using regex
- **Glob patterns**: `file-*.txt (glob)` - Matches using glob patterns
- **No end-of-line**: `content (no-eol)` - Matches output without a trailing newline
- **Optional**: `maybe shown (?)` - Line is optional in output

### Exit Codes

Expected non-zero exit codes are indicated with `[code]` at the end of output:

```
  $ exit 1
  [1]
```

## API Options

```javascript
const results = await runTest({
  content: '...', // Test file content
  executionDir: '/path/to/dir', // Working directory for commands
  env: { VAR: 'value' }, // Environment variables
  onOutput: (cmd, stdout, stderr) => {...}, // Output callback
  shell: '/bin/bash', // Shell to use
  timeout: 5000 // Timeout in milliseconds
});
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/cliscore.svg?style=flat-square
[npm-url]: https://npmjs.org/package/cliscore
