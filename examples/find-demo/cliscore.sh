#!/bin/sh
# Complete lifecycle demonstration for cliscore
# This example tests the 'find' command with proper temp directory management

# Pattern for our temp directories
TEMP_PREFIX="cliscore-find-demo"

# Global variable to track the temp directory for this test file
TEST_TMPDIR=""

# ============================================================================
# run_first() - Runs BEFORE any tests, in a SEPARATE SHELL
# ============================================================================
# Use this for:
#   - One-time expensive setup
#   - Checking for leftover resources from previous runs
#   - Starting external services
# ============================================================================
run_first() {
    echo "=== Lifecycle: run_first() ==="
    echo "Checking for leftover temp directories from previous runs..."

    # Find any existing directories matching our pattern
    leftover=$(find /tmp -maxdepth 1 -name "${TEMP_PREFIX}*" -type d 2>/dev/null | wc -l)

    if [ "$leftover" -gt 0 ]; then
        echo "WARNING: Found $leftover leftover temp directories:"
        find /tmp -maxdepth 1 -name "${TEMP_PREFIX}*" -type d 2>/dev/null
        echo "Cleaning them up..."
        rm -rf /tmp/${TEMP_PREFIX}* 2>/dev/null || true
    else
        echo "No leftover directories found. Clean slate!"
    fi

    echo "run_first() complete."
}

# ============================================================================
# before_each_file() - Runs at START of test shell, BEFORE any tests
# ============================================================================
# Use this for:
#   - Setting environment variables
#   - Creating temp directories
#   - Setting up PATH
#   - Defining helper functions
# ============================================================================
before_each_file() {
    # Create a unique temp directory for this test file
    TEST_TMPDIR=$(mktemp -d /tmp/${TEMP_PREFIX}.XXXXXX)

    # Export it so tests can use it
    export TEST_TMPDIR

    # Change to the temp directory so all tests run there
    cd "$TEST_TMPDIR" || exit 1

    # Optional: Print for visibility (won't appear in test output)
    # echo "Created temp directory: $TEST_TMPDIR" >&2
}

# ============================================================================
# after_each_file() - Runs at END of test shell, AFTER all tests
# ============================================================================
# Use this for:
#   - Cleaning up temp files/directories
#   - Resetting state
#   - Stopping processes
#
# NOTE: This does NOT run if the shell crashes or times out!
#       Use run_last() for critical cleanup that must always happen.
# ============================================================================
after_each_file() {
    # Clean up the temp directory if it exists
    if [ -n "$TEST_TMPDIR" ] && [ -d "$TEST_TMPDIR" ]; then
        rm -rf "$TEST_TMPDIR"
    fi
}

# ============================================================================
# run_last() - Runs AFTER all tests, in a SEPARATE SHELL, ALWAYS EXECUTES
# ============================================================================
# Use this for:
#   - Critical cleanup that MUST happen (even if tests crash)
#   - Stopping external services
#   - Final verification
#   - Removing resources created by run_first()
# ============================================================================
run_last() {
    echo "=== Lifecycle: run_last() ==="
    echo "Verifying all temp directories were cleaned up..."

    # Check if any of our temp directories still exist
    remaining=$(find /tmp -maxdepth 1 -name "${TEMP_PREFIX}*" -type d 2>/dev/null | wc -l)

    if [ "$remaining" -gt 0 ]; then
        echo "WARNING: Found $remaining temp directories that weren't cleaned up:"
        find /tmp -maxdepth 1 -name "${TEMP_PREFIX}*" -type d 2>/dev/null
        echo "Cleaning them up now..."
        rm -rf /tmp/${TEMP_PREFIX}* 2>/dev/null || true
    else
        echo "All temp directories were properly cleaned up!"
    fi

    echo "run_last() complete."
}

# ============================================================================
# Helper functions - Available to all tests
# ============================================================================

# Create a simple directory structure for testing
setup_test_files() {
    mkdir -p dir1/subdir1
    mkdir -p dir2/subdir2
    touch file1.txt
    touch file2.log
    touch dir1/file3.txt
    touch dir1/subdir1/file4.txt
    touch dir2/file5.log
}

# Create files with specific extensions
create_files_by_ext() {
    local ext=$1
    local count=${2:-3}

    for i in $(seq 1 $count); do
        touch "file${i}.${ext}"
    done
}
