# Cram Specification

## Overview

Cram is a functional testing framework for command line applications. It
allows developers to write tests that resemble interactive shell sessions,
executes the commands, and verifies the actual output matches expected
output.

## Test File Format

### File Extension
- Tests use the `.t` file extension.

### Line Format
- Lines beginning with two spaces, dollar sign, and a space (`  $ `)
are interpreted as commands to run.
- Lines beginning with two spaces, greater than sign, and a space (`  >
`) allow continuation of multi-line commands.
- Lines beginning with two spaces (but not `$` or `>`) are considered
expected command output.
- All other lines are treated as comments.

### Output Matching
- Default: Exact literal string matching
- Special matching modes:
  - `(re)`: Line is treated as a Perl-compatible regular
  expression. Example: `  [0-9]+ (re)`
  - `(glob)`: Line is treated as a glob pattern. Only `*` and `?` are
  special, and can be escaped with `\`. Example: `  file-*.txt (glob)`
  - `(no-eol)`: Line matches output without a trailing newline. Example:
  `  foo (no-eol)`
  - `(esc)`: Line contains unprintable characters that are
  escaped. Example: `   (esc)`
- If a line ends with any of these markers, it's first tried as a literal
match before applying special matching.
- When actual output contains unprintable characters, they're
automatically displayed with `(esc)`.

## Test Execution Environment

### Temporary Directories
- Each test runs in its own temporary directory.
- A parent temporary directory (CRAMTMP) is created for all tests.

### Environment Variables
- Cram resets common environment variables before running tests:
  - `LANG`, `LC_ALL`, `LANGUAGE` = `C`
  - `TZ` = `GMT`
  - `CDPATH` = `""`
  - `COLUMNS` = `80`
  - `GREP_OPTIONS` = `""`
  - `TMPDIR`, `TEMP`, `TMP` = test runner's `tmp` directory

- Cram provides these environment variables to tests:
  - `CRAMTMP` = Path to test runner's temporary directory
  - `TESTDIR` = Directory containing the test file
  - `TESTFILE` = Basename of the test file
  - `TESTSHELL` = Shell specified by `--shell`

## Command Line Interface

### Usage
```
cram [OPTIONS] TESTS...
```

### Options
- `-h, --help`: Show help message and exit
- `-V, --version`: Show version information and exit
- `-q, --quiet`: Don't print diffs
- `-v, --verbose`: Show filenames and test status
- `-i, --interactive`: Interactively merge changed test output
- `-d, --debug`: Write script output directly to the terminal
- `-y, --yes`: Answer yes to all questions
- `-n, --no`: Answer no to all questions
- `-E, --preserve-env`: Don't reset common environment variables
- `--keep-tmpdir`: Keep temporary directories
- `--shell=PATH`: Shell to use for running tests (default: `/bin/sh`)
- `--shell-opts=OPTS`: Arguments to invoke shell with
- `--indent=NUM`: Number of spaces to use for indentation (default: 2)
- `--xunit-file=PATH`: Path to write xUnit XML output

### Exit Codes
- `0`: All tests passed
- `1`: One or more tests failed
- `2`: Error in test execution (e.g., invalid arguments, no tests found)
- `80`: When used inside a test, indicates test should be skipped

## Configuration

### Configuration File
- Default: `.cramrc` in current directory
- Override with `CRAMRC` environment variable

### Format
INI-style configuration:
```
[cram]
verbose = True
indent = 4
```

### Environment Variable
- `CRAM`: Space-separated options, same as command line

## Test Execution

### Test Discovery
- When a directory is specified, all `.t` files within it (recursively)
are executed
- Hidden files (starting with `.`) are ignored
- Tests are executed in sorted order based on filename

### Output
- For each passing test: prints `.`
- For each skipped test: prints `s`
- For each failing test: prints `!` and a unified diff
- Summary line: "Ran X tests, Y skipped, Z failed."

### Interactive Mode
- Shows diff between expected and actual output
- Prompts user to accept changes
- If accepted, updates test file with actual output using `patch`

### Debug Mode
- Doesn't capture or diff output
- Passes through script output directly to terminal
- Useful for troubleshooting or seeing output in real-time

### xUnit Output
- Generates XML compatible with xUnit tools
- Contains test results, timing information, and failure details

## Core Functionality

### Test Execution Process
1. Parse each test file to identify commands and expected output
2. For each command:
   - Execute in a clean environment using specified shell
   - Capture stdout/stderr
   - Compare with expected output
   - Record any differences
3. Generate summary of results
4. Return appropriate exit code

### Error Handling
- Handles missing files, invalid options, etc. with useful error messages
- Returns appropriate exit codes for different error conditions
