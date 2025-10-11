# cliscore

A test runner for command-line interfaces, extending the Mercurial unified test format (UTF).

## Features

- **Multiple file formats**: Supports `.t` (UTF), `.md` (markdown), and `.cliscore` files
- **Markdown integration**: Extract tests from fenced code blocks in markdown files
- **Flexible output matching**:
  - Literal text matching
  - Regular expressions with flags
  - Glob patterns
  - Ellipsis (`...`) for zero or more lines
  - No-EOL handling
- **Human-readable syntax**: Special matching syntax that makes sense to readers
- **Parallel test execution**: Tests can be run concurrently
- **JSON output**: Machine-readable output for CI/CD integration

## Installation

```bash
npm install
```

## Usage

### Command Line

```bash
# Run a single test file
cliscore tests/basic.t

# Run multiple files with glob patterns
cliscore tests/**/*.md

# Dry run (parse without executing)
cliscore --dry-run tests/example.md

# JSON output
cliscore --json tests/**/*.t

# Allow additional markdown language identifiers
cliscore --allow-lang shell-session tests/**/*.md
```

### Programmatic API

```javascript
import { runTestFiles, formatResults } from 'cliscore';

const results = await runTestFiles(['tests/example.md']);
console.log(formatResults(results));
```

## Test Format

### UTF Format (.t files)

Classic UTF format with two-space indentation:

```
  $ echo "hello world"
  hello world

  $ echo "test" | grep "test"
  test
```

### Markdown Format (.md files)

Tests in fenced code blocks (default language identifier: `cliscore`):

````markdown
# My Test Suite

```cliscore
$ echo "hello world"
hello world
```
````

### Extended Format (.cliscore files)

Accepts both UTF and markdown formats. Supports enhanced prompts:

```cliscore
alice$ echo "user prompt"
user prompt

alice@server$ echo "user@host prompt"
user@host prompt
```

## Output Matching

### Literal Matching

```cliscore
$ echo "exact text"
exact text
```

### Regular Expressions

UTF style:
```cliscore
$ echo "test123"
test\d+ (re)
```

Enhanced syntax:
```cliscore
$ echo "test123"
[Matching: /test\d+/]
```

### Glob Patterns

UTF style:
```cliscore
$ ls
file*.txt (glob)
```

Enhanced syntax:
```cliscore
$ ls
[Matching glob: file*.txt]
```

### Ellipsis (Zero or More Lines)

```cliscore
$ cat long-file.txt
first line
...
last line
```

### Special Cases

```cliscore
# Literal square brackets
$ echo "[something]"
[Literal text: "[something]"]

# Output without newline
$ echo -n "no newline"
no newline (no-eol)
```

## Options

- `--json`: Output results as JSON
- `--dry-run`: Parse tests without executing them
- `--allow-lang <lang>`: Allow additional markdown language identifiers
- `--help`, `-h`: Show help message

## Architecture

- **parser.js**: Parses test files into structured test commands
- **matcher.js**: Matches actual output against expected patterns
- **executor.js**: Executes commands in a shell with output capture
- **runner.js**: Orchestrates test execution and collects results
- **cli.js**: Command-line interface

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed or an error occurred

## License

MIT
