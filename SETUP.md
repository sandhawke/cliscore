# Setup and Teardown Functions

This document explains the shell lifecycle and setup/teardown functions available in cliscore.

## Overview

Cliscore supports four lifecycle functions defined in `cliscore.sh`:

1. **`run_first()`** - Runs before any tests in a separate shell
2. **`before_each_file()`** - Runs once at the start of the test shell
3. **`after_each_file()`** - Runs once before the test shell exits
4. **`run_last()`** - Runs after all tests in a separate shell

## Execution Order

For each test file, the execution order is:

```
1. run_first()          [separate shell]
2. Start main test shell
3. Source cliscore.sh
4. before_each_file()   [main shell]
5. Run all tests        [main shell]
6. after_each_file()    [main shell - if shell is still alive]
7. Close main test shell
8. run_last()           [separate shell]
```

## When to Use Each Function

### `run_first()`

Use for setup that must run **before** the test shell starts:
- Creating temporary directories
- Setting up external resources (databases, servers, etc.)
- One-time expensive setup operations

**Key characteristics:**
- Runs in its own shell (separate from test shell)
- Always executes, even if previous files failed
- Output captured and included in results
- Non-zero exit code generates warning but doesn't stop tests

**Example:**
```sh
run_first() {
    # Create test workspace
    mkdir -p /tmp/cliscore-test-$$
    echo "Test workspace: /tmp/cliscore-test-$$"

    # Start test server
    ./test-server.sh &
    echo $! > /tmp/server.pid
}
```

### `before_each_file()`

Use for setup that must run **in the test shell**:
- Exporting environment variables
- Setting up the PATH
- Defining helper functions available to tests
- Configuring shell options

**Key characteristics:**
- Runs in the main test shell (same environment as tests)
- Perfect for environment variables that tests need
- Output is hidden (not captured)

**Example:**
```sh
before_each_file() {
    # Make tests use local development version
    export PATH="$(pwd)/bin:$PATH"

    # Set test environment
    export NODE_ENV=test
    export DEBUG=1
}
```

### `after_each_file()`

Use for cleanup that **must** run in the test shell:
- Unsetting environment variables
- Cleaning up test-created processes
- Resetting shell state

**Key characteristics:**
- Runs in the main test shell
- Output is hidden (not captured)
- **IMPORTANT**: Does NOT run if shell crashes or times out
- Use `run_last()` for guaranteed cleanup

**Example:**
```sh
after_each_file() {
    # Kill any background processes started by tests
    jobs -p | xargs -r kill 2>/dev/null

    # Unset test variables
    unset DEBUG
}
```

### `run_last()`

Use for cleanup that **must always run**:
- Removing temporary directories
- Stopping external services
- Final cleanup that must happen even if shell crashed
- Cleanup of resources created in `run_first()`

**Key characteristics:**
- Runs in its own shell (separate from test shell)
- **Always executes**, even if the test shell crashed or timed out
- Guaranteed to run for final cleanup
- Output captured and included in results
- Non-zero exit code generates warning but doesn't stop subsequent files

**Example:**
```sh
run_last() {
    # Clean up test workspace
    rm -rf /tmp/cliscore-test-$$

    # Stop test server
    if [ -f /tmp/server.pid ]; then
        kill $(cat /tmp/server.pid) 2>/dev/null
        rm /tmp/server.pid
    fi

    echo "Cleanup complete"
}
```

## Important Limitations

### Shell Crash Behavior

**Known Issue**: If the test shell crashes or is killed (e.g., due to timeout), `after_each_file()` will NOT run.

**Reason**: `after_each_file()` executes in the main test shell. When the shell is killed, it cannot run any further commands.

**Solution**: Use `run_last()` for critical cleanup that must always happen:

```sh
# ❌ WRONG: Critical cleanup in after_each_file
after_each_file() {
    rm -rf /tmp/important-data  # Won't run if shell crashes!
}

# ✓ CORRECT: Critical cleanup in run_last
run_last() {
    rm -rf /tmp/important-data  # Always runs, even if shell crashed
}
```

### Complete Example

```sh
#!/bin/sh
# cliscore.sh - Complete lifecycle example

# Runs first, in separate shell
run_first() {
    mkdir -p /tmp/test-workspace-$$
    echo "Created workspace: /tmp/test-workspace-$$"
}

# Runs in test shell, sets up environment
before_each_file() {
    export TEST_WORKSPACE="/tmp/test-workspace-$$"
    export PATH="$(pwd)/bin:$PATH"

    # Define helper function available to tests
    cleanup_files() {
        rm -f /tmp/test-*.tmp
    }
}

# Runs in test shell before exit (if shell is alive)
after_each_file() {
    # Non-critical cleanup
    unset TEST_WORKSPACE
}

# Always runs, in separate shell (guaranteed cleanup)
run_last() {
    # Critical cleanup - always executes
    rm -rf /tmp/test-workspace-$$
    echo "Removed workspace"
}
```

## Output and Timing

- `run_first()` and `run_last()` output is captured and included in:
  - JSON output (with timing)
  - Verbose modes (with timing)
- `before_each_file()` and `after_each_file()` output is hidden
- All functions' timing is tracked and can be viewed with `--json` or `-v`

## Failure Handling

- If `run_first()` fails (non-zero exit), tests continue but warning is shown
- If `before_each_file()` fails, tests may behave unexpectedly
- If tests fail, `after_each_file()` still runs (if shell is alive)
- If `run_last()` fails, warning is shown but next file proceeds

## Best Practices

1. **Use `run_first()` for expensive setup**: Database initialization, server starts
2. **Use `before_each_file()` for environment**: PATH, variables, helper functions
3. **Use `after_each_file()` for non-critical cleanup**: Variable cleanup, minor resets
4. **Use `run_last()` for critical cleanup**: Removing files, stopping services
5. **Keep functions idempotent**: Safe to run multiple times
6. **Handle errors gracefully**: Don't assume resources exist
7. **Document what each function does**: Help future maintainers

## Testing Your Setup Functions

Test that your lifecycle functions work correctly:

```console
$ cliscore tests/ -vv
# Check output for run_first/run_last timing and output
```

Use `--json` to see complete lifecycle information:

```console
$ cliscore tests/ --json | grep -A5 runFirst
$ cliscore tests/ --json | grep -A5 runLast
```
