# Self-Test Suite

This directory contains cliscore tests that test cliscore itself. Meta!

## How It Works

The self-tests use cliscore to run cliscore against test fixtures, verifying that all features work correctly.

### PATH Isolation

**Problem**: We need to test the development version of cliscore using a stable version of cliscore, without interference.

**Solution**: `cliscore.sh` manipulates PATH to ensure the version being tested is in `../../src/`, while the version running the tests can be any cliscore installation (system, npm global, etc.).

```sh
# cliscore.sh adds ../../src/ to PATH
before_each_file() {
    export PATH="$(cd ../.. && pwd)/src:$PATH"
}
```

This way:
- **Outer cliscore**: Runs the self-tests (any version)
- **Inner cliscore**: The one being tested (dev version in src/)

### Running Self-Tests

**Important**: Always run from `test/self/` directory:

```bash
cd test/self

# Run all self-tests
../../src/cliscore *.md

# Or with any installed cliscore
cliscore *.md

# Run specific tests
cliscore 01-basic.md 03-patterns.md

# Fast parallel execution
cliscore --fast *.md

# Just the percentage
cliscore --percent *.md
```

**Why run from test/self/?**
1. `cliscore.sh` is found and loaded (sets up PATH)
2. Relative paths to `fixtures/` work correctly
3. Avoids running documentation .md files in project root

**Note**: The default pattern `**/*.md` from project root will include
documentation files and test fixtures. Always run self-tests with
explicit `*.md` from the `test/self/` directory.

## Test Structure

```
test/self/
├── cliscore.sh           # PATH setup for testing dev version
├── fixtures/             # Test files for self-tests to run
│   ├── basic.md          # Passing test
│   ├── failing.md        # Intentionally failing test
│   ├── patterns.md       # Pattern matching examples
│   ├── stderr.md         # Stderr testing
│   └── utf.t             # UTF format example
├── 00-sanity.md          # Verify setup works
├── 01-basic.md           # Basic functionality
├── 02-formats.md         # File format support
├── 03-patterns.md        # Pattern matching
├── 04-stderr.md          # Stderr handling
├── 05-failures.md        # Failure detection
├── 06-options.md         # CLI options
├── 07-empty-lines.md     # Empty line handling
├── 08-multiline.md       # Continuation lines
├── 09-prompts.md         # User@host prompts
└── 10-exit-codes.md      # Exit codes and env

```

## What's Tested

Every feature from TUTORIAL.md and README.md:

- ✓ Basic command execution
- ✓ Multiple file formats (.t, .md, .cliscore)
- ✓ Pattern matching (literal, regex, glob, ellipsis)
- ✓ Enhanced bracket syntax
- ✓ Stderr matching with [stderr:]
- ✓ Empty line preservation
- ✓ Multiline commands with continuations
- ✓ User and user@host prompts
- ✓ Exit code handling
- ✓ Environment persistence
- ✓ Failure detection and reporting
- ✓ CLI options (--json, --dry-run, --allow-lang, --jobs, --fast)

## Adding New Self-Tests

1. Create fixture in `fixtures/` if needed
2. Create test file `NN-name.md` with cliscore code blocks
3. Use relative paths: `fixtures/name.md` not `test/self/fixtures/name.md`
4. Remember ellipsis `...` for variable output (timestamps, separator bars)
5. Run from `test/self/` directory

Example:

```markdown
# Self-Test: My Feature

\`\`\`cliscore
$ cliscore --run fixtures/my-test.md
...
✓ All tests passed!
\`\`\`
```

## Debugging Failed Self-Tests

If a self-test fails, run it directly to see the issue:

```bash
cd test/self

# See what cliscore is in PATH
which cliscore

# Run a fixture directly
cliscore fixtures/basic.md

# Debug a specific self-test
cliscore 01-basic.md
```

## Why Self-Tests Matter

1. **Dogfooding**: We use cliscore to test itself, finding bugs and UX issues
2. **Living documentation**: Self-tests demonstrate real usage
3. **Regression prevention**: Changes that break features fail self-tests
4. **CI/CD integration**: Self-tests run in automation to verify builds
5. **Confidence**: If cliscore can test itself, it can test anything
