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
# Run all tests (default: **/*.{t,md,cliscore})
cliscore

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

By default, cliscore recursively finds all `.t`, `.md`, and `.cliscore` files, automatically ignoring `node_modules/`, `.git/`, and other common directories.

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

### Important: Whitespace and Empty Lines

In markdown code blocks, tests are separated by command prompts (`$` or `#`), not by blank lines. This means:

- **Empty lines in output are preserved** and must match exactly
- **Blank lines between commands** are treated as part of the expected output
- To separate commands visually without expecting blank output, place them on consecutive lines

Example:
```cliscore
$ printf "line1\n\nline3"
line1

line3
$ echo "next command"
next command
```

The first command expects three lines of output (including the blank line). The second command starts immediately after.

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

### Stderr Matching

Match stderr output using `[stderr:]` syntax:

```cliscore
$ echo "output" && echo "error" >&2
output
[stderr: error]
```

Multiple stderr lines:
```cliscore
$ command-with-errors
normal output
[stderr: error line 1]
[stderr: error line 2]
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

## Configuration

Create `cliscore.json` in your project root for default settings:

```json
{
  "allowedLanguages": ["cliscore", "shell-session", "bash"],
  "jobs": 4,
  "fast": false
}
```

Priority: CLI arguments > cliscore.json > defaults

See `cliscore.json.example` for all options.

## Options

- `--json`: Output results as JSON
- `--dry-run`: Parse tests without executing them
- `--step`: Interactive mode - prompt before each command, show output after
- `--percent`: Output only pass percentage (e.g., "95.5")
- `-q`, `--quiet`: Quiet mode - one line per file with pass rate
- `-v`, `--verbose`: Verbose mode - show all tests (one line per test)
- `-vv`: Very verbose - show all tests with full error details
- `--jobs N`, `-j N`: Run N test files in parallel (default: 1)
- `--fast`: Run tests in parallel with 8 jobs (equivalent to --jobs 8)
- `--allow-lang <lang>`: Allow additional markdown language identifiers
- `--help`, `-h`: Show help message

## Output Verbosity

Verbosity levels (streamed output for levels 0-1):

```bash
# Quiet: only summary
cliscore -q tests/**/*.md
# Output: ✗ 1 test failed, 9 passed (90.0% pass rate)

# Default: one line per file (streamed as files complete)
cliscore tests/**/*.md
# Output: ✓ test1.md: 100.0% (5/5)
#         ✓ test2.md: 80.0% (4/5)
#         ✗ 1 test failed, 9 passed

# Verbose: show failures with details
cliscore -v tests/**/*.md
# Shows failure details for each failing test

# Very verbose: one line per test
cliscore -vv tests/**/*.md
# Shows: ✓ Line 5: echo "hello"
#        ✗ Line 12: failing command

# Maximum: all tests with full error details
cliscore -vvv tests/**/*.md
```

Default mode streams results as files complete (great for parallel execution).

## Performance

Run tests in parallel for faster execution:

```bash
# Run with 4 parallel jobs
cliscore --jobs 4 tests/**/*.md

# Quick parallel execution
cliscore --fast tests/**/*.md
```

Note: Tests within a single file run sequentially (they share the same shell environment), but multiple test files run in parallel.

## Setup and Teardown

Create a `cliscore.sh` file in your project root to define setup and teardown functions:

```bash
#!/bin/sh

# Called once at the start of each test shell
cliscore_setup() {
    export TEST_VAR="value"
    export PATH="/custom/path:$PATH"
    # mkdir -p /tmp/test-workspace
}

# Called once before the shell exits
cliscore_teardown() {
    # rm -rf /tmp/test-workspace
    true
}

# Define helper functions for tests to use
test_helper() {
    echo "Helper: $1"
}
```

The file is sourced automatically if present. Setup/teardown functions are invisible (don't appear in test output), but helper functions can be called explicitly in tests.

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
