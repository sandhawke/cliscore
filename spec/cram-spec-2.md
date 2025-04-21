# Cram Functional Test Framework Specification

## Overview
Cram is a functional testing framework for command line applications
that works by running shell commands and comparing their output against
expected results. Test files are designed to look like interactive shell
sessions, making them easy to read and write.

## Test File Format
- Test files use the `.t` extension
- Lines beginning with `  $ ` (two spaces, dollar sign, space) are
commands to be executed in the shell
- Lines beginning with `  > ` (two spaces, greater than sign, space)
are continuation lines for multi-line commands
- All other lines beginning with two spaces are expected command output
- Any other lines are considered comments

## Test Execution
1. The framework scans provided directories/files for `.t` test files
(ignoring files/dirs starting with `.`)
2. For each test file:
   - A temporary directory is created where the test will run
   - Commands from the test file are executed sequentially
   - Actual output is captured and compared with expected output
   - Tests pass if actual output matches expected output
   - Failed tests generate a diff showing the expected vs. actual output
   - A `.err` file is created for failing tests containing the actual
   output

## Output Matching
The framework supports several methods to match command output:
- Literal matching (exact match) by default
- Regular expression matching with the `(re)` suffix
   - Example: `  foo.* (re)`
- Glob pattern matching with the `(glob)` suffix
   - Example: `  foo* (glob)`
   - Supports `*` and `?` wildcards which can be escaped with `\`
- Lines without a trailing newline can be matched with the `(no-eol)`
suffix
- Escape sequence handling with the `(esc)` suffix for unprintable
characters

## Environment
- Each test runs in a clean temporary directory
- By default, common environment variables are reset:
  - `LANG`, `LC_ALL`, `LANGUAGE` set to `C`
  - `TZ` set to `GMT`
  - `CDPATH` and `GREP_OPTIONS` set to empty string
  - `COLUMNS` set to `80`
- Special environment variables available to tests:
  - `CRAMTMP`: Path to the temporary directory
  - `TESTDIR`: Directory containing the test file
  - `TESTFILE`: Name of the current test file
  - `TESTSHELL`: The shell being used to run tests

## Command Line Options
The framework supports various options:
- Shell selection (`--shell=PATH`)
- Shell options (`--shell-opts=OPTS`)
- Customizable indentation (`--indent=NUM`)
- Quiet mode to suppress diffs (`--quiet`)
- Verbose mode to show test status (`--verbose`)
- Interactive mode to update expected output (`--interactive`)
- Debug mode to write output directly to terminal (`--debug`)
- Preservation of environment variables (`--preserve-env`)
- Option to keep temporary directories (`--keep-tmpdir`)
- xUnit XML output generation (`--xunit-file=PATH`)

## Special Features
- Tests with an exit code of 80 are considered "skipped"
- Interactive mode allows merging actual output back into test files
- Configuration can be stored in a `.cramrc` file
- Automatic cleanup of temporary files unless `--keep-tmpdir` is specified

## Result Reporting
- A dot (`.`) is printed for each passing test
- An exclamation mark (`!`) is printed for each failing test
- An `s` is printed for skipped tests
- Summary shows total tests run, skipped, and failed
- Exit code is non-zero if any tests failed
