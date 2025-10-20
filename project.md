# cliscore - CLI Test Runner

A test runner for command-line interfaces, extending the Mercurial unified test format (UTF).

## Goals

Help developers and AI tools create correct software by testing external behavior of command-line programs. Tests should be readable enough that anyone can verify they express the desired behavior.

## Implementation

Tests look like shell sessions with unnecessary details omitted.

### File Formats

- **.t files**: UTF format (two-space indented)
- **.md files**: Markdown with fenced code blocks (default languages: `console` and `cliscore`)
- **.cliscore files**: Either format accepted

Additional markdown languages can be configured with `--allow-lang <identifier>`.

### Test Execution

1. Parse test file into sequence of command + expected output pairs
2. Spawn shell and source `cliscore.sh` if present
3. For each test:
   - Execute command in subshell `(command)`
   - Capture exit code: `__EXIT_CODE=$?`
   - Echo unique markers to stdout and stderr with exit code
   - Parse output streams separately
   - Match against expectations
4. Call teardown and close shell

Multiple test files can run in parallel (`--jobs N` or `--fast`). Tests within a file run sequentially (shared shell environment).

### Syntax

#### Commands
- Prompts: `$ command` or `# command`
- User prompts: `alice$ command` or `alice@host$ command` (parsed but not executed differently)
- Continuation: `> continued line` (with optional leading whitespace)

#### Output Matching

**Literal**: Exact text match
```
  expected text
```

**Regular expressions**:
```
  pattern\d+ (re)          # UTF style
  [Matching: /pattern/i]   # Enhanced with flags
```

**Glob patterns**:
```
  file*.txt (glob)         # UTF style
  [Matching glob: *.txt]   # Enhanced
```

**Ellipsis**: Zero or more lines
```
  ...
```

**Stderr**: Match error output
```
  [stderr: error message]
```

**Special cases**:
```
  [Literal text: "[brackets]"]            # Escape brackets
  [Output ends without end-of-line]       # No trailing newline
  text (no-eol)                           # UTF style no-eol
```

**Empty lines**: Preserved and must match exactly in markdown code blocks. Tests separated by prompts, not blank lines.

### UTF Format Details

- Two-space indentation required
- `  $ command` or `  # command` for commands
- `  > continuation` for multiline
- `  output` for expected output
- Lines not matching these patterns are comments

### Setup and Teardown

Optional `cliscore.sh` in project root:

```sh
before_each_file() {
    # Runs once at shell start
    export MY_VAR="value"
}

after_each_file() {
    # Runs once before shell exit
    # cleanup code
}

helper_function() {
    # Available to tests
}
```

Functions are sourced invisibly. Only explicit calls appear in test output.

### Command Line Options

- `--json`: JSON output
- `--dry-run`: Parse without executing
- `--jobs N`, `-j N`: Run N files in parallel (default: 1)
- `--fast`: Alias for `--jobs 8`
- `--allow-lang <lang>`: Additional markdown language identifiers
- `-h`, `--help`: Show help

Exit codes: 0 = pass, 1 = fail or error

## Architecture

- **parser.js**: Parse test files (.t, .md, .cliscore)
- **matcher.js**: Match output (literal, regex, glob, ellipsis, stderr)
- **executor.js**: Run commands with output capture using unique markers
- **runner.js**: Orchestrate execution, collect results
- **cli.js**: CLI interface, glob expansion, parallel execution

## Future

- Container execution
- TTY support
- SSH/remote execution
- ESC keyword for unprintable characters
