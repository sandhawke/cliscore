# Cram Functional Testing Framework Specification

## Overview
Cram is a functional testing framework for command line applications. It
allows writing tests that resemble interactive shell sessions, executes
these tests, and verifies that the actual output matches the expected
output.

## Test File Format
- Test files use the `.t` extension
- Lines beginning with indentation (default 2 spaces), a dollar sign,
and a space (`  $ `) are commands to run
- Lines beginning with indentation, a greater-than sign, and a space (`  >
`) are continuation lines for multi-line commands
- All other lines beginning with the same indentation are considered
expected command output
- Lines not starting with indentation are treated as
comments/documentation
- Empty tests and tests that exit with return code 80 are considered
"skipped"

## Output Matching
Expected output can use special annotations for flexible matching:
- `(re)` at the end of a line enables regex pattern matching for that line
- `(glob)` at the end of a line enables glob pattern matching (supporting
`*` and `?`)
- `(no-eol)` at the end of a line matches output not ending in a newline
- `(esc)` at the end of a line matches output with unprintable characters
- Without these annotations, exact literal matching is performed
- If a line in the expected output matches the actual output exactly,
special matching like `(re)` or `(glob)` is ignored

## Command Line Interface
The implementation must support these command-line options:
- `-h/--help`: Show help message
- `-V/--version`: Show version information
- `-q/--quiet`: Don't print diffs
- `-v/--verbose`: Show filenames and test status
- `-i/--interactive`: Interactively merge changed test output (requires
patch(1))
- `-d/--debug`: Write script output directly to the terminal
- `-y/--yes`: Answer yes to all questions
- `-n/--no`: Answer no to all questions
- `-E/--preserve-env`: Don't reset common environment variables
- `--keep-tmpdir`: Keep temporary directories
- `--shell=PATH`: Shell to use for running tests (default: /bin/sh)
- `--shell-opts=OPTS`: Arguments to invoke shell with
- `--indent=NUM`: Number of spaces for indentation (default: 2)
- `--xunit-file=PATH`: Path to write xUnit XML output

## Environment Handling
Unless `-E/--preserve-env` is specified, the following environment
variables are reset:
- `LANG`, `LC_ALL`, `LANGUAGE` set to `C`
- `TZ` set to `GMT`
- `CDPATH` and `GREP_OPTIONS` set to empty string
- `COLUMNS` set to `80`
- `TMPDIR`, `TEMP`, `TMP` set to test runner's temporary directory

Tests can access these special environment variables:
- `CRAMTMP`: Path to the test runner's temporary directory
- `TESTDIR`: Path to the directory containing the test file
- `TESTFILE`: Basename of the current test file
- `TESTSHELL`: Path to the shell specified by `--shell`

## Test Execution
For each test file:
1. Create a temporary directory
2. Parse the file to identify commands and expected output
3. Execute each command in the specified shell
4. Capture the actual output
5. Compare actual output with expected output
6. Report results (pass, fail, skip) and display diffs for failures
7. Write error files (.err) for failed tests
8. Remove previous error files for passing tests

## Return Codes
- Exit code 0: All tests pass
- Exit code 1: One or more tests fail
- Exit code 2: Usage error (e.g., invalid options, no test files)
- Exit code 80 from a test script: Mark test as skipped

## Configuration
- Read configuration from `.cramrc` file (location configurable via
`CRAMRC` environment variable)
- Support command-line options specified in the `CRAM` environment
variable

## Output Format
- Default output shows a dot (`.`) for each passing test, an `s` for
skipped tests, and a `!` for failed tests
- For failed tests, display a unified diff showing expected vs. actual
output
- With `--verbose`, show test filenames and status
- With `--quiet`, suppress diff output
- When all tests complete, display a summary with total tests run,
skipped, and failed
