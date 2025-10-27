# cliscore - Nice CLI testing

A test runner for command-line interfaces, optimized for easy reading. Rhymes with "high score". The hope is you will be able to manually review the test suite guiding your AI coder.

Also, with cliscore, AIs can maybe generate better black-box tests for themselves.

Vibe coded using Claude 4.5, but I held its hand quite a bit.

**WARNING: cliscore <u>executes the example commands</u> recursively inside the directory where you run it! If there are "console" examples which delete data, alter cloud configurations, email your boss, install a rootkit, etc, running cliscore could be *very bad*!**

**=> This is meant to be run in a sandboxed test environment and/or with trusted code!**

Example [hello-world.md](test/fixtures/hello-world.md)

````markdown
# My Test Suite

```console
$ echo "hello world"
hello world
```

```console
$ echo $$
[Matching: /\d+/]
```

```console
$ df
Filesystem     1K-blocks      Used Available Use% Mounted on
...
[Matching: /^tmpfs\s*/]
...
```
````

```console
$ cliscore --run hello-world.md
✓ /home/sandro/src/cliscore/test/fixtures/hello-world.md: 100.0% (3/3)
✓ All tests passed! (3/3)
```

## Features

- **Multiple file formats**: Supports `.t` (UTF), `.md` (markdown), and `.cliscore` files
- **Markdown integration**: Extract tests from fenced code blocks in markdown files
- **Two modes**: Interactive step mode (default) for writing tests, automated run mode for CI/CD
- **Flexible output matching**:
  - Literal text matching
  - Regular expressions with flags
  - Glob patterns
  - Ellipsis (`...`) for zero or more lines
  - No-EOL handling
- **Human-readable syntax**: Special matching syntax that makes sense to readers
- **Parallel test execution**: Tests can be run concurrently
- **Detailed results**: Save test metadata, stdout, and stderr to files with `--save`
- **JSON output**: Machine-readable output for CI/CD integration

## Modes

### Step Mode (Default - Interactive)

**Best for:** Writing and debugging tests

By default, cliscore runs in **step mode** - it prompts you before each test:

```console
$ cliscore tests/example.md

═════════════════════════════════  STEP MODE  ══════════════════════════════════

  example.md:5

  $ echo "hello"

  ---expected-output---
  hello
  ---end-of-expected---

  ────────────────────────────────────────────────────────────────────────────

  ▶ (s)tep, (r)un, skip as (p)ass, skip as (f)ail, (n)ext file, (q)uit? [s/r/p/f/n/q]
```

You see:
- The command that will run
- The expected output pattern
- Options: (s)tep to run it, (r)un all remaining, (p)ass/(f)ail to skip, (n)ext file, (q)uit

After running, you see the actual output and whether it passed or failed, then automatically move to the next test.

### Run Mode (Automated)

**Best for:** CI/CD, running test suites, automation

Use `--run` to execute all tests without prompting:

```console
$ cliscore --run tests/**/*.md
✓ tests/basic.md: 100.0% (5/5)
✓ tests/advanced.md: 80.0% (4/5)
✗ 1 test failed, 9 passed (90.0% pass rate)
```

Add `--fast` to run test files in parallel (8 jobs):

```console
$ cliscore --run --fast tests/**/*.md
```

## Installation

```bash
npm install cliscore
```

## Usage

### Quick Start

```bash
# Interactive mode - step through tests one by one (DEFAULT)
cliscore tests/example.md

# Automated mode - run all tests without prompts
cliscore --run tests/**/*.md

# Fast parallel execution for CI/CD
cliscore --run --fast tests/**/*.md

# Find and run all tests in current directory (default: **/*.{t,md,cliscore})
cliscore --run
```

By default, cliscore recursively finds all `.t`, `.md`, and `.cliscore` files, automatically ignoring common directories (see [Ignored Directories](#ignored-directories) below).

### Common Use Cases

```bash
# Write/debug tests interactively (step mode is default)
cliscore tests/new-feature.md

# Run in CI/CD
cliscore --run --fast

# Save detailed test results for analysis
TEST_DIR=$(mktemp -d) && cliscore --run --save=$TEST_DIR tests/**/*.md

# Get just the pass percentage for scripts
cliscore --run --percent tests/**/*.md

# Dry run (parse without executing)
cliscore --dry-run tests/example.md

# JSON output for tooling
cliscore --run --json tests/**/*.md

# Show verbose failure details
cliscore --run -v tests/**/*.md

# Allow additional markdown language identifiers
cliscore --run --allow-lang shell-session tests/**/*.md
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

Tests in fenced code blocks (default language identifiers: `console` and `cliscore`):

````markdown
# My Test Suite

```console
$ echo "hello world"
hello world
```
````

We recommend using `console` as it provides good syntax highlighting in most editors and is widely recognized. The `cliscore` identifier is also supported for backward compatibility.

### Extended Format (.cliscore files)

Accepts both UTF and markdown formats. Supports enhanced prompts:

```console
alice$ echo "user prompt"
user prompt

alice@server$ echo "user@host prompt"
user@host prompt
```

### Important: Whitespace and Empty Lines

In markdown code blocks, tests are separated by command prompts (`$` or `#`), not by blank lines. This means:

- **Empty lines in output are preserved** and must match exactly
- **Blank lines between commands** are treated as part of the expected output
- To separate commands visually, put them in separate code blocks or use comments

Example:
```console
$ printf "line1\n\nline3"
line1

line3
$ # ---
$ echo "next command"
next command
```

The first command expects three lines of output (including the blank line).

## Output Matching

### Literal Matching

```console
$ echo "exact text"
exact text
```

### Regular Expressions

UTF style:
```console
$ echo "test123"
test\d+ (re)
```

Enhanced syntax:
```console
$ echo "test123"
[Matching: /test\d+/]
```

### Glob Patterns

UTF style:
```console
$ ls
file*.txt (glob)
```

Enhanced syntax:
```console
$ ls
[Matching glob: file*.txt]
```

### Ellipsis (Zero or More Lines)

```console
$ cat long-file.txt
first line
...
last line
```

### Stderr Matching

Match stderr output using `[stderr:]` syntax:

```console
$ echo "output" && echo "error" >&2
output
[stderr: error]
```

Multiple stderr lines:
```console
$ command-with-errors
normal output
[stderr: error line 1]
[stderr: error line 2]
```

### Special Cases

```console
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
  "allowedLanguages": ["cliscore", "console", "shellsession", "bash"],
  "jobs": 4,
  "shell": "/bin/bash",
  "ignoredDirectories": ["node_modules", ".git", "custom_dir"]
}
```

Priority: CLI arguments > cliscore.json > defaults

Available options:
- `allowedLanguages`: Array of markdown language identifiers to accept (default: `["console", "cliscore"]`)
- `jobs`: Number of test files to run in parallel (default: `1`)
- `fast`: Enable fast mode with 8 parallel jobs (default: `false`)
- `shell`: Shell to use for executing commands (default: `"/bin/sh"`)
- `ignoredDirectories`: Array of directory names to ignore when searching for tests (default: see below)

## Options

### Execution Modes
- **(default)**: Interactive step mode - prompt before each test, show output after
- `--run`: Non-interactive - run all tests without stopping
- `--dry-run`: Parse tests without executing them

### Output Formats
- `--json`: Output results as JSON (machine-readable)
- `--percent`: Output only pass percentage (e.g., "95.5")

### Verbosity (for --run mode)
- `-q`, `--quiet`: Quiet - only summary line
- (default): One line per file with pass rate
- `-v`, `--verbose`: Show failures with details
- `-vv`: Show all tests (one line per test)
- `-vvv`: Show all tests with full error details

### Performance
- `--jobs N`, `-j N`: Run N test files in parallel (default: 1)
- `--fast`: Run tests in parallel with 8 jobs (equivalent to `--jobs 8`)
- Note: `--fast` and `--percent` automatically enable `--run` mode

### Test Results
- `--save <dir>`: Save detailed test results to directory (metadata.json, stdout.txt, stderr.txt)
- `--show N`: Show details for first N failures (default: 1, use `all` or `-1` for all)

### Test Selection
- `--allow-lang <lang>`: Allow additional markdown language identifier (can be used multiple times)
- `--shell <path>`: Shell to use for executing commands (default: `/bin/sh`)
- `--timeout N`: Timeout in seconds per test (default: 30)

### Debugging
- `--debug`: Debug mode - show summary of what happened with each test
- `--trace`: Trace mode - show all I/O events (read/write to shell)
- `--progress`: Show real-time progress as files complete

### Help
- `-h`, `--help`: Show help message
- `-V`, `--version`: Show version number

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

# Optional: Runs before tests start (separate shell)
run_first() {
    mkdir -p /tmp/test-workspace
    echo "Created test workspace"
}

# Runs once at the start of each test shell
before_each_file() {
    export TEST_VAR="value"
    export PATH="/custom/path:$PATH"
}

# Runs once before the test shell exits (if shell is alive)
after_each_file() {
    # Non-critical cleanup
    unset TEST_VAR
}

# Optional: Runs after all tests (separate shell, always executes)
run_last() {
    rm -rf /tmp/test-workspace
    echo "Cleanup complete"
}

# Helper functions are available to tests
test_helper() {
    echo "Helper: $1"
}
```

**Important**: `after_each_file()` won't run if the shell crashes or times out. Use `run_last()` for critical cleanup that must always happen.

See [SETUP.md](SETUP.md) for detailed documentation on the lifecycle and when to use each function.

## Ignored Directories

When searching for test files with glob patterns (or default search), cliscore automatically ignores the following directories:

**Default ignored directories:**
- `node_modules` - Node.js packages
- `.git`, `.svn`, `.hg` - Version control
- `coverage` - Test coverage reports
- `dist`, `build`, `out` - Build outputs
- `.next`, `.nuxt` - Framework build directories
- `vendor` - Dependency directories
- `fixtures` - Test fixture data
- Any directory starting with `.` (hidden directories)

**To customize ignored directories**, add an `ignoredDirectories` array to your `cliscore.json`:

```json
{
  "ignoredDirectories": ["node_modules", ".git", "my_custom_ignore"]
}
```

**Note:** Setting `ignoredDirectories` in your config **replaces** the default list entirely. If you want to keep the defaults and add more, include them explicitly:

```json
{
  "ignoredDirectories": [
    "node_modules", ".git", ".svn", ".hg",
    "coverage", "dist", "build", ".next", ".nuxt", "out",
    "vendor", "fixtures",
    "my_custom_dir"
  ]
}
```

**To run tests in normally-ignored directories**, specify the file path explicitly:

```bash
cliscore fixtures/my-test.md
```

This will work even if `fixtures` is in the ignored list, because explicit paths bypass the search filters.

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed or an error occurred

## License

MIT
