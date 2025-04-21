# Cram Specification

## 1. Overview

Cram is a functional testing framework for command line applications. It
allows users to write tests in a format that resembles interactive
shell sessions, with commands and expected outputs. Cram executes these
tests, compares actual outputs with expected outputs, and reports any
differences.

## 2. Test Format

### 2.1 File Extension
Cram tests use the `.t` file extension.

### 2.2 Basic Structure
- **Shell Commands**: Lines beginning with two spaces, a dollar sign,
and a space are executed in the shell.
  ```
    $ command
  ```
- **Continuation Lines**: Lines beginning with two spaces, a greater
than sign, and a space are continuation lines for multi-line commands.
  ```
    $ first line of command
    > second line of command
  ```
- **Expected Output**: All other lines beginning with two spaces are
considered expected command output.
  ```
    $ echo hello
    hello
  ```
- **Comments**: Any other lines are considered comments.
  ```
  This is a comment.
    $ echo hello
    hello
  ```

### 2.3 Special Matching Keywords
- **Regular Expressions**: Output lines ending with a space and `(re)`
are matched as Perl-compatible regular expressions.
  ```
    $ echo foobarbaz
    foobar.* (re)
  ```
- **Globs**: Output lines ending with a space and `(glob)` are matched
with a glob-like syntax. Only `*` and `?` are supported, both can be
escaped with `\`.
  ```
    $ echo foobarbaz
    foo*baz (glob)
  ```
- **No EOL**: Output lines ending with a space and `(no-eol)` will match
actual output that doesn't end in a newline.
  ```
    $ printf foo
    foo (no-eol)
  ```
- **Escaped Output**: Output lines containing unprintable characters
are escaped and suffixed with a space and `(esc)`. Expected output lines
can also explicitly include `(esc)` to match such output.
  ```
    $ printf ''
     (esc)
  ```

## 3. Command Line Interface

### 3.1 Command Invocation
```
cram [OPTIONS] TESTS...
```

### 3.2 Options
- `-h, --help`: Show help message and exit.
- `-V, --version`: Show version information and exit.
- `-q, --quiet`: Don't print diffs.
- `-v, --verbose`: Show filenames and test status.
- `-i, --interactive`: Interactively merge changed test output.
- `-d, --debug`: Write script output directly to the terminal.
- `-y, --yes`: Answer yes to all questions.
- `-n, --no`: Answer no to all questions.
- `-E, --preserve-env`: Don't reset common environment variables.
- `--keep-tmpdir`: Keep temporary directories.
- `--shell=PATH`: Shell to use for running tests (default: `/bin/sh`).
- `--shell-opts=OPTS`: Arguments to invoke shell with.
- `--indent=NUM`: Number of spaces to use for indentation (default: 2).
- `--xunit-file=PATH`: Path to write xUnit XML output.

### 3.3 Exit Codes
- **0**: All tests passed.
- **1**: At least one test failed.
- **2**: Error in command line usage, missing dependencies, etc.
- **80** (from test): Test is skipped.

## 4. Test Discovery and Execution

### 4.1 Test Discovery
- If a path is a file, it's considered a test file.
- If a path is a directory, all files with the `.t` extension in the
directory and its subdirectories are considered test files.
- Hidden files (starting with `.`) and files in hidden directories
are ignored.

### 4.2 Environment Setup
- A temporary directory is created for each test.
- The following environment variables are set:
  - `TESTSHELL`: The shell used to run the test.
  - `TESTDIR`: The directory containing the test file.
  - `TESTFILE`: The basename of the test file.
  - `CRAMTMP`: The test runner's temporary directory.
- The following environment variables are reset (unless `--preserve-env`
is specified):
  - `TMPDIR`, `TEMP`, `TMP`: Set to the test runner's `tmp` directory.
  - `LANG`, `LC_ALL`, `LANGUAGE`: Set to `C`.
  - `TZ`: Set to `GMT`.
  - `COLUMNS`: Set to `80`.
  - `CDPATH` and `GREP_OPTIONS`: Set to an empty string.

### 4.3 Test Execution Flow
1. **Test Parsing**:
   - Parse the test file and extract shell commands, expected outputs,
   and comments.
   - Commands and their expected outputs are collected.

2. **Command Execution**:
   - A shell script is generated that contains all commands from the test.
   - Each command is prefixed with a marker command that echoes a unique
   salt value, the line number, and the return code of the command.
   - The shell script is executed with the specified shell.
   - The output is captured and parsed to extract command outputs and
   return codes.

3. **Output Comparison**:
   - Actual output is compared to expected output.
   - Special matchers (regular expressions, globs, etc.) are applied
   if needed.
   - If a test exits with return code 80, it's considered skipped.

4. **Result Reporting**:
   - Passing tests are marked with a dot (`.`).
   - Skipped tests are marked with an `s`.
   - Failing tests are marked with an exclamation mark (`!`), and a
   unified diff is shown.
   - If `--verbose` is specified, filenames and test status are also
   shown.
   - If `--xunit-file` is specified, results are written to an xUnit
   XML file.

5. **Interactive Merging (Optional)**:
   - If `--interactive` is specified, the user is prompted to merge
   changed test output.
   - If the user agrees, the `patch` command is used to apply the diff
   to the test file.
   - The `.err` file is removed if the patch is successful.

6. **Cleanup**:
   - Temporary directories are removed (unless `--keep-tmpdir` is
   specified).

## 5. Output Matching Details

### 5.1 Regular Expression Matching (`(re)` keyword)
- The regular expression is anchored to match the entire string
(effectively `^regex$`).
- The pattern is compiled as a Perl-compatible regular expression.
- If the regex is invalid, the match fails.
- Trailing backslashes are considered invalid.

### 5.2 Glob Matching (`(glob)` keyword)
- Only `*` and `?` are treated as special characters.
- `*` matches any sequence of characters (including none).
- `?` matches exactly one character.
- Both can be escaped with `\`.
- The glob pattern is converted to a regular expression for matching.

### 5.3 No EOL Matching (`(no-eol)` keyword)
- This matches output that doesn't end with a newline.
- It's attached to the end of the line in the expected output.

### 5.4 Escape Sequence Matching (`(esc)` keyword)
- This is used for output containing unprintable characters.
- Unprintable characters in the output are escaped.
- The line is suffixed with `(esc)`.
- Expected output lines can also include `(esc)` to match such outputs.

### 5.5 Matching Priority
- If an expected line matches its actual output line exactly, special
matchers are ignored.
- Lines are first matched literally before applying any special matchers.

## 6. Temporary File Management

### 6.1 Directory Structure
- A main temporary directory is created for the test run.
- Inside this, a sub-directory is created for each test file.
- The test is run with the current working directory set to this
sub-directory.
- Environment variables `TMPDIR`, `TEMP`, and `TMP` are set to a `tmp`
directory inside the main temporary directory.

### 6.2 Error Files
- Failed test outputs are saved to a file with the same name as the test
but with an `.err` suffix.
- If a test passes after previously failing, the `.err` file is removed.

## 7. Configuration

### 7.1 Configuration File
- `.cramrc` file (or the file specified by the `CRAMRC` environment
variable).
- Format: INI-style with a `[cram]` section.
- Options correspond to command line options.
- Example:
  ```
  [cram]
  verbose = True
  indent = 4
  ```

### 7.2 Environment Variables
- `CRAM`: Command line options to prepend to the arguments passed to cram.
- `CRAMRC`: Path to the configuration file.

## 8. Interactive Mode

### 8.1 User Prompts
- If `--interactive` is specified, when a test fails, the user is prompted
to merge the changes.
- The prompt is: `Accept this change? [yN]`
- The user can respond with `y` (yes) or `n` (no).
- If `--yes` is specified, all prompts are automatically answered with
`y`.
- If `--no` is specified, all prompts are automatically answered with `n`.

### 8.2 Patch Application
- If the user agrees to merge changes, the `patch` command is used.
- The patch is applied to the test file.
- If the patch is successful, the `.err` file is removed.
- If the patch fails, an error message is shown.

## 9. Debug Mode

### 9.1 Debug Output
- If `--debug` is specified, test output is written directly to the
terminal.
- No comparison with expected output is performed.
- This is useful for debugging tests that hang or have unexpected
behavior.

### 9.2 Combination with Shell Options
- `--debug` can be combined with `--shell-opts` to pass options to
the shell.
- For example, `--shell-opts='-x'` can be used to show shell commands
as they're executed.

## 10. xUnit XML Output

### 10.1 XML Format
- If `--xunit-file` is specified, results are written to an xUnit
XML file.
- The XML includes information about test runs, failures, and skips.
- Each test is represented as a testcase element.
- Failures include the diff output.
